"""CLI. Run from tools/coverage/:

    .venv/bin/python -m analysis all --offline   # pipeline + analysis (one command)
    .venv/bin/python -m analysis run             # analysis only, on existing pipeline outputs
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
import time
from importlib import metadata
from pathlib import Path
from typing import Any

import numpy as np

from pipeline.config import DEFAULT_DUNGEONS, DEFAULT_PARAMS, REPO_ROOT, TOOL_DIR, ConfigError, load_config
from pipeline.fetch import sha256_file
from pipeline.geom import Projector
from pipeline.output import write_text

from . import ANALYSIS_VERSION
from . import heatmap as H
from . import report as R
from .graph import TransitPoint, WalkGraph, build_graph, read_walk_and_transit
from .raster import read_window
from .run import Inputs, circuity, compute, fallback_comparison, load_features, study_bbox

DEFAULT_ACFG = TOOL_DIR / "analysis" / "launch-score.config.json"
PACKAGES = ("osmium", "shapely", "pyproj", "numpy")
TIE_BREAK = (
    "snap: nearest node of the largest connected component, equidistant -> lowest OSM node id; "
    "Dijkstra: equal distance -> lower source rank (sources sorted by feature id), so the "
    "nearest-dungeon label does not depend on heap order; district of a population cell = "
    "district containing the cell centre, a centre on a shared edge -> lowest district_osm_id; "
    "Launch Score rank ties -> lower district_osm_id"
)


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="python -m analysis", description=__doc__)
    ap.add_argument("command", choices=("all", "run"))
    ap.add_argument("--offline", action="store_true", help="all: never download (checksums only)")
    ap.add_argument("--params", type=Path, default=DEFAULT_PARAMS)
    ap.add_argument("--dungeons", type=Path, default=DEFAULT_DUNGEONS)
    ap.add_argument("--acfg", type=Path, default=DEFAULT_ACFG)
    ap.add_argument("--no-cache", action="store_true", help="rebuild the walk graph from D1")
    return ap


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def _graph_cache_key(d1_sha: str, acfg: dict[str, Any], exclude_access: list[str], bbox) -> str:
    blob = json.dumps({"d1": d1_sha, "walk": acfg["walkHighways"], "footNo": acfg["footNoValues"],
                       "footOverride": acfg["footOverrideValues"], "transit": acfg["transit"],
                       "access": exclude_access, "bbox": [round(v, 6) for v in bbox],
                       "v": ANALYSIS_VERSION}, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


def load_graph(d1: Path, d1_sha: str, acfg, exclude_access, bbox, proj, cache_dir: Path,
               use_cache: bool) -> tuple[WalkGraph, list[TransitPoint], dict[str, Any]]:
    key = _graph_cache_key(d1_sha, acfg, exclude_access, bbox)
    path = cache_dir / f"walk-graph-{key}.npz"
    if use_cache and path.exists():
        z = np.load(path, allow_pickle=False)
        g = WalkGraph(z["node_ids"], z["x"], z["y"], z["indptr"], z["indices"], z["weights"])
        transit = [TransitPoint(i, k, float(lo), float(la)) for i, k, lo, la in
                   zip(z["t_id"].tolist(), z["t_kind"].tolist(), z["t_lon"], z["t_lat"])]
        stats = json.loads(str(z["stats"]))
        stats["cache"] = f"hit {path.name}"
        return g, transit, stats
    ways, coords, transit, stats = read_walk_and_transit(d1, bbox, acfg, exclude_access)
    g = build_graph(ways, coords, proj)
    cache_dir.mkdir(parents=True, exist_ok=True)
    np.savez(path, node_ids=g.node_ids, x=g.x, y=g.y, indptr=g.indptr, indices=g.indices,
             weights=g.weights, t_id=np.array([t.id for t in transit], dtype=str),
             t_kind=np.array([t.kind for t in transit], dtype=str),
             t_lon=np.array([t.lon for t in transit]), t_lat=np.array([t.lat for t in transit]),
             stats=json.dumps(stats))
    stats["cache"] = f"built {path.name}"
    return g, transit, stats


def run_analysis(args) -> int:
    t0 = time.time()
    timings: dict[str, float] = {}

    def lap(name: str, since: float) -> float:
        now = time.time()
        timings[name] = round(now - since, 1)
        print(f"[analysis] {name}: {timings[name]} s")
        return now

    cfg = load_config(args.params, args.dungeons)
    cf, pl = cfg.cf, cfg.pipeline
    acfg = json.loads(args.acfg.read_text(encoding="utf-8"))
    base = TOOL_DIR
    out = {k: (base / v).resolve() for k, v in acfg["outputs"].items()}
    presets_doc = json.loads((REPO_ROOT / acfg["presetsFile"]).read_text(encoding="utf-8"))
    presets = presets_doc["presets"]
    proj = Projector.for_crs(pl["projectedCrs"])
    src = {s["id"]: s for s in pl["sources"]}
    d1, d2 = src[pl["osmSource"]], src[acfg["populationSource"]]
    shas = {}
    for s in (d1, d2):
        path = base / s["path"]
        if not path.exists():
            raise ConfigError(f"{s['id']} missing: {path} (run: python -m pipeline fetch --include-optional)")
        shas[s["id"]] = sha256_file(path)
        if shas[s["id"]] != s["sha256"]:
            raise ConfigError(f"{s['id']} checksum mismatch: {shas[s['id']]}")
    cand_path = (base / pl["outputs"]["candidates"]).resolve()
    candidates, cmeta = load_features(cand_path)
    districts, _ = load_features(out["boundaries"])
    class_names = [c["class"] for c in pl["candidateClasses"]]
    t = lap("load_and_verify", t0)

    bbox = study_bbox(districts, float(acfg["graphBboxBuffer_m"]))
    graph, transit, gstats = load_graph(base / d1["path"], shas[d1["id"]], acfg,
                                        list(cf["excludeAccessValues"]), bbox, proj,
                                        out["cacheDir"], not args.no_cache)
    t = lap("walk_graph", t)
    grid = read_window(base / d2["path"], *study_bbox(districts, 0.0))
    t = lap("population_raster", t)

    res = compute(Inputs(candidates, districts, grid, graph, transit), acfg, cf, presets, proj, class_names)
    t = lap("routing_and_metrics", t)

    size_upper = cf["sizeBandUpper_m2"]
    size_names = sorted(size_upper, key=lambda k: size_upper[k]) + ["large"]
    cols = R.columns(class_names, size_names, acfg["primaryPresets"])
    csv_text = R.district_csv(res["rows"], cols)
    sizes = {"districtCounts": write_text(out["districtCounts"], csv_text)}

    totals = R.study_totals(res["rows"], res["usable"])
    block = int(acfg["heatmap"]["displayBlockCells"])
    rows_n = grid.values.shape[0]
    lat_rows = grid.lat0 - (np.arange(rows_n) + 0.5) * grid.dy
    cell_km2 = (grid.dx * 111.32 * np.cos(np.radians(lat_rows))) * (grid.dy * 110.574)
    dens, zone = H.block_layers(grid, res["cells"], block, cell_km2)
    pop_rgba, ticks = H.density_rgba(dens)
    pop_png, zone_png = H.png_bytes(pop_rgba), H.png_bytes(H.zone_rgba(zone))
    red_png = H.png_bytes(H.red_hatch_rgba(zone))
    hm = {"osm_data_date": cmeta.get("data_date"),
          "totals_line": (f"dungeon ที่ใช้ได้ {totals['usable_dungeons']} แห่ง (ไม่นับ review_required "
                          f"{len(res['not_counted'])}) · ย่านที่มี dungeon {totals['districts_with_usable_dungeon']}/"
                          f"{totals['districts']} · ประชากรในโซนเขียว {totals['pop_share_green']:.1%} "
                          f"เหลือง {totals['pop_share_yellow']:.1%} แดง {totals['pop_share_red']:.1%}"),
          "method_line": ("ระยะเดิน = routing บนโครงข่ายทางเดิน OSM (multi-source Dijkstra จาก rep_point ของ "
                          f"dungeon ทุกแห่ง) · เซลล์ที่ห่างกราฟเกิน {cf['walkGraphSnapMaxDistance_m']} ม. นับเป็นแดง")}
    page = H.build_html(grid, res["rows"], res["usable"], districts, pop_png, zone_png, red_png, ticks, block, hm)
    hdir = out["heatmapDir"]
    sizes["heatmapHtml"] = write_text(hdir / "index.html", page)
    (hdir / "population-density.png").write_bytes(pop_png)
    (hdir / "distance-zones.png").write_bytes(zone_png)
    sizes["heatmapPngs"] = len(pop_png) + len(zone_png)
    t = lap("write_outputs", t)
    meta = build_meta(args, cfg, acfg, shas, cand_path, cmeta, res, gstats, bbox, grid, totals,
                      out, timings, t0, sizes)
    write_text(out["runMeta"], json.dumps(meta, ensure_ascii=False, indent=2) + "\n")
    print(f"[analysis] usable dungeons {totals['usable_dungeons']} · not counted (review) "
          f"{len(res['not_counted'])} · graph {res['graph']['nodes']:,} nodes / "
          f"{res['graph']['edges']:,} edges · green {totals['pop_share_green']} "
          f"red {totals['pop_share_red']}")
    for k, v in sizes.items():
        print(f"[analysis] {k}: {v:,} bytes")
    over = [k for k, v in sizes.items() if k != "heatmapPngs" and v > int(pl["maxCommittedFileBytes"])]
    if over:
        print(f"WARNING: over maxCommittedFileBytes: {over}")
        return 3
    return 0


def build_meta(args, cfg, acfg, shas, cand_path, cmeta, res, gstats, bbox, grid, totals, out,
               timings, t0, sizes) -> dict[str, Any]:
    cf, pl = cfg.cf, cfg.pipeline
    share_digits = int(pl["sharePrecision"])
    src = {s["id"]: s for s in pl["sources"]}
    snap_max = float(cf["walkGraphSnapMaxDistance_m"])
    c = res["cells"]
    pipe_meta: dict[str, Any] = {}
    if out["pipelineRunMeta"].exists():
        pm = json.loads(out["pipelineRunMeta"].read_text(encoding="utf-8"))
        pipe_meta = {"pipeline_version": pm.get("pipeline_version"), "final": pm["counts"]["final"],
                     "steps": pm["counts"]["steps"], "run": pm.get("run"),
                     "config": "see coverage_meta.config in data/coverage/candidates.geojson"}
    not_counted: dict[str, Any] = {}
    by_id = {f["id"]: f for f in _load_all(cand_path)}
    for fid in res["not_counted"]:
        p = by_id[fid]["properties"]
        not_counted[fid] = {"name": p.get("name"), "district_osm_id": p.get("district_osm_id"),
                            "review_reasons": p.get("related_ids", {}).get("review_reasons")}
    return {
        "task": "P1-F01-T06",
        "analysis_version": ANALYSIS_VERSION,
        "command": "cd tools/coverage && .venv/bin/python -m analysis all --offline",
        "deterministic_outputs": ["data/coverage/district-counts.csv", "data/coverage/heatmap/*"],
        "non_deterministic_fields": ["run", "graph.cache", "pipeline.run"],
        "inputs": {
            "D1": {"path": src[pl["osmSource"]]["path"], "sha256": shas[pl["osmSource"]],
                   "data_date": cmeta.get("data_date")},
            "D2": {"path": src[acfg["populationSource"]]["path"], "sha256": shas[acfg["populationSource"]],
                   "license": "CC BY 4.0 (WorldPop)"},
            "candidates": {"path": _rel(cand_path), "sha256": sha256_file(cand_path)},
            "boundaries": {"path": _rel(out["boundaries"]), "sha256": sha256_file(out["boundaries"])},
            "presets": {"path": acfg["presetsFile"], "sha256": sha256_file(REPO_ROOT / acfg["presetsFile"])},
        },
        "config": {
            "launchScore": {k: v for k, v in acfg.items() if not k.startswith("_") and k != "outputs"},
            "launchScoreSource": _rel(args.acfg),
            "coverageFilter": {k: cf[k] for k in (
                "walkGraphSnapMaxDistance_m", "excludeAccessValues", "sizeBandUpper_m2",  # gitleaks:allow
                "walkRouteFactorFallbackMult", "walkRouteFactorUncertaintyMinMult",
                "walkRouteFactorUncertaintyMaxMult")},
            "coverageFilterSource": cfg.sources["coverageFilter"],
        },
        "distance_method": {
            "method": "osm_walk_network",
            "description": ("multi-source Dijkstra on the OSM walk graph from the rep_point of every usable "
                            "dungeon; distance = snap(rep_point) + network + snap(cell centre)"),
            "tool": "pyosmium (graph read) + stdlib heapq Dijkstra on a CSR adjacency (analysis/graph.py)",
            "graph": {**res["graph"], "bbox_wgs84": [round(v, 6) for v in bbox], **gstats},
            "tie_break": TIE_BREAK,
            "snap_max_m": snap_max,
            "cells": int(len(c["pop"])),
            "cells_snapped_too_far": int(c["too_far"].sum()),
            "pop_share_snapped_too_far": totals["pop_share_red_snap"],
            "dungeon_snap_m": {k: (None if v is None else round(v, 1)) for k, v in
                               _q(res["d_snap"]).items()},
            "cell_snap_m": {k: (None if v is None else round(v, 1)) for k, v in
                            _q(c["snap"]).items()},
            "dungeons_snapped_farther_than_max": int((res["d_snap"] > snap_max).sum()),
            "population_grid": {"rows": int(grid.values.shape[0]), "cols": int(grid.values.shape[1]),
                                "dx_deg": grid.dx, "dy_deg": grid.dy},
            "measured_route_factor": circuity(res, float(acfg["circuityMinStraight_m"])),
            "fallback_used": False,
            "fallback_comparison": fallback_comparison(res, cf, acfg["distanceBands_m"],
                                                       _districts(out), share_digits),
        },
        "transit": {"rail_points": res["transit_counts"]["rail"], "bus_points": res["transit_counts"]["bus"],
                    "rail_acceptable_walk_m": acfg["transit"]["railAcceptableWalk_m"]},
        "counts": {"candidates": len(by_id), "usable": len(res["usable"]),
                   "not_counted_review_required": not_counted},
        "totals": totals,
        "pipeline": pipe_meta,
        "output_bytes": sizes,
        "run": {"started_unix": round(t0), "duration_s": round(time.time() - t0, 1),
                "timings_s": timings, "python": platform.python_version(),
                "platform": platform.platform(),
                "packages": {n: metadata.version(n) for n in PACKAGES}},
    }


def _q(arr) -> dict[str, float | None]:
    from .metrics import quantiles
    return quantiles(np.asarray(arr)[np.isfinite(arr)].tolist(), (0.5, 0.9, 1.0))


def _load_all(path: Path) -> list[dict[str, Any]]:
    return load_features(path)[0]


def _districts(out) -> list[dict[str, Any]]:
    return load_features(out["boundaries"])[0]


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        if args.command == "all":
            from pipeline.__main__ import main as pipeline_main

            common = ["--params", str(args.params), "--dungeons", str(args.dungeons)]
            offline = ["--offline"] if args.offline else []
            # D2 (WorldPop) is optional for the pipeline: fetch/verify it on its
            # own so the pipeline step below is byte-identical to
            # `python -m pipeline all` (coverage_meta.inputs lists D1 + D3 only).
            code = pipeline_main(["fetch", "--include-optional", *common, *offline])
            if code == 0:
                code = pipeline_main(["all", *common, *offline])
            if code != 0:
                print(f"ERROR: pipeline exit code {code}", file=sys.stderr)
                return code
        return run_analysis(args)
    except ConfigError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
