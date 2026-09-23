"""Run steps 2-8 on a local OSM file and write the outputs."""

from __future__ import annotations

import json
import platform
import random
import time
from collections import Counter
from importlib import metadata
from pathlib import Path
from typing import Any

import shapely

from . import PIPELINE_VERSION
from .boundaries import build_study_area, cross_check
from .config import TOOL_DIR, Config
from .geom import Projector
from .osm_read import read_osm
from .output import (
    ATTRIBUTION, COMPACTION_TIERS, DERIVED_PROPERTIES, LICENSE, compact_feature,
    dumps_collection, piece_feature, point_feature, write_text,
)
from .process import (
    STEP_REASONS, assign_districts, attach_pois, blocklist, compute_area, extract,
    normalize, resolve_overlaps,
)
from .tags import compile_patterns

STEP_ORDER = ("normalize", "area", "blocklist", "overlap")
PACKAGES = ("osmium", "shapely", "pyproj", "numpy")


def _step_counts(pieces: list[Any]) -> list[dict[str, Any]]:
    """Pieces still passing before and after each step (sequential view)."""
    rows = []
    seen: set[str] = set()
    passing = len(pieces)
    for step in STEP_ORDER:
        seen |= STEP_REASONS[step]
        after = sum(1 for p in pieces if not (p.reasons & seen))
        rows.append({"step": step, "in": passing, "out": after, "removed": passing - after})
        passing = after
    return rows


def run_pipeline(
    cfg: Config,
    osm_path: Path,
    inputs: dict[str, Any],
    outputs: dict[str, Path],
    cross_check_path: Path | None,
) -> dict[str, Any]:
    t0 = time.time()
    cf, pl = cfg.cf, cfg.pipeline
    proj = Projector.for_crs(pl["projectedCrs"])
    patterns = {
        "religious": compile_patterns(cf["religiousNamePatterns"]),
        "review": compile_patterns(cf["reviewNamePatterns"]),
    }

    print(f"[read] {osm_path}")
    data = read_osm(osm_path, cf, pl)
    t_read = time.time()
    print(f"[read] {len(data.areas)} areas, {len(data.nodes)} nodes, "
          f"{len(data.major_ways)} major ways in {t_read - t0:.0f} s · data_date {data.data_date}")

    study = build_study_area(data.areas, pl, proj)
    print(f"[boundaries] {len(study.provinces)} provinces, {len(study.districts)} districts")
    xcheck: dict[str, Any] = {"status": "skipped", "reason": "no cross-check source"}
    if cross_check_path is not None:
        xcheck = cross_check(study, cross_check_path, float(cf["boundaryCrossCheckMaxDiffShare"]),
                             proj, int(pl["sharePrecision"]))
        print(f"[boundaries] cross-check {xcheck['status']} · warnings {len(xcheck.get('warnings', []))}")

    pieces, blockers, pois, ways = extract(data, study, proj, cf)
    extract_counts = {
        "candidate_areas_in_file": sum(1 for a in data.areas if a.classes),
        "candidates_in_study_area": len(pieces),
        "blockers_in_study_area": len(blockers),
        "blocker_areas_in_study_area": sum(1 for b in blockers if b.point_proj is None),
        "blocker_nodes_in_study_area": sum(1 for b in blockers if b.point_proj is not None),
        "poi_nodes_in_study_area": len(pois),
        "major_ways_in_study_bbox": len(ways),
        "assembly_failed_count": len(data.assembly_failed),
        "assembly_failed": data.assembly_failed,
    }
    print(f"[extract] {extract_counts['candidates_in_study_area']} candidates, "
          f"{len(blockers)} blockers, {len(pois)} POI nodes")

    norm = normalize(pieces, cf)
    compute_area(pieces, cfg)
    blocklist(pieces, blockers, ways, cfg, patterns)
    resolve_overlaps(pieces, cfg)
    unassigned = assign_districts(pieces, study, cf)
    unmatched = attach_pois(pieces, pois, proj, pl["poiTags"])

    cands = [p for p in pieces if not p.reasons]
    excl = [p for p in pieces if p.reasons]
    counts = _summary(pieces, cands, excl, extract_counts, norm, unassigned, len(unmatched))
    return _write_all(cfg, proj, data.data_date, inputs, outputs, study, cands, excl,
                      unmatched, counts, xcheck, t0)


def _summary(pieces, cands, excl, extract_counts, norm, unassigned, n_unmatched) -> dict:
    def tally(items) -> dict[str, int]:
        return dict(sorted(Counter(items).items()))

    return {
        "extract": extract_counts,
        "steps": _step_counts(pieces),
        "normalize": norm,
        "final": {"candidates": len(cands), "excluded": len(excl),
                  "points_unmatched": n_unmatched, "district_unassigned": unassigned},
        "candidates_by_class": tally(p.primary_class for p in cands),
        "candidates_by_size_band": tally(p.related["size_band"] for p in cands),
        "candidates_by_province": tally(p.district.province.iso if p.district else "none"
                                        for p in cands),
        "candidate_flags": tally(f for p in cands for f in p.flags),
        "excluded_by_reason": tally(p.reason_excluded() for p in excl),
        "excluded_reasons_all": tally(r for p in excl for r in p.reasons),
    }


def _package_versions() -> dict[str, str]:
    return {name: metadata.version(name) for name in PACKAGES}


def _district_of_point(study, pt) -> Any:
    for d in study.districts:
        if d.geom.contains(pt):
            return d
    return None


def _write_all(cfg, proj, data_date, inputs, outputs, study, cands, excl, unmatched,
               counts, xcheck, t0) -> dict[str, Any]:
    pl = cfg.pipeline
    sample_cfg = pl["qaSample"]
    ids = sorted(p.id for p in cands)
    rng = random.Random(int(sample_cfg["seed"]))
    qa_sample = sorted(rng.sample(ids, min(int(sample_cfg["size"]), len(ids))))
    meta = {
        "pipeline_version": PIPELINE_VERSION,
        "data_date": data_date,
        "inputs": inputs,
        "config": cfg.as_meta(),
        "counts": counts,
        "boundary_cross_check": xcheck,
        "qa_sample": {"seed": sample_cfg["seed"], "size": len(qa_sample), "ids": qa_sample},
        "attribution": ATTRIBUTION,
        "license": LICENSE,
    }
    max_bytes = int(pl["maxCommittedFileBytes"])
    sizes: dict[str, int] = {}
    cand_txt = dumps_collection([piece_feature(p, cfg, proj) for p in cands], meta)
    sizes["candidates"] = write_text(outputs["candidates"], cand_txt)

    excl_full = dumps_collection([piece_feature(p, cfg, proj) for p in excl], meta)
    applied: list[str] = []
    excl_txt = excl_full
    sizes["excludedFull"] = write_text(outputs["excludedFull"], excl_full)
    if sizes["excludedFull"] > max_bytes:
        trimmed_feats = [piece_feature(p, cfg, proj, trim_tags=True) for p in excl]
        for tier in COMPACTION_TIERS:
            applied.append(tier)
            excl_txt = dumps_collection(
                [compact_feature(f, applied) for f in trimmed_feats],
                {**meta, "excluded_compaction": {
                    "tiers": applied, "trim_tag_keys": pl["excludedTrimTagKeys"],
                    "dropped_properties": list(DERIVED_PROPERTIES)
                    if "drop_derived_properties" in applied else [],
                    "full_version": "tools/coverage/" + pl["outputs"]["excludedFull"]}},
            )
            if len(excl_txt.encode("utf-8")) <= max_bytes:
                break
    sizes["excluded"] = write_text(outputs["excluded"], excl_txt)

    digits = int(pl["coordinatePrecision"])
    pts = [point_feature(n, _district_of_point(study, n.geom), digits) for n in unmatched]
    sizes["pointsUnmatched"] = write_text(
        outputs["pointsUnmatched"], dumps_collection(pts, {"data_date": data_date,
                                                           "attribution": ATTRIBUTION,
                                                           "license": LICENSE}))
    bnd = []
    for d in study.districts:
        bnd.append({"type": "Feature", "id": f"osm-r{d.osm_id}",
                    "properties": {"district": d.name, "district_en": d.name_en,
                                   "district_osm_id": d.osm_id, "province": d.province.name,
                                   "province_iso": d.province.iso,
                                   "area_m2": round(d.geom_proj.area)},
                    "geometry": shapely.geometry.mapping(d.geom)})
    sizes["boundaries"] = write_text(outputs["boundaries"], dumps_collection(bnd, {
        "data_date": data_date, "attribution": ATTRIBUTION, "license": LICENSE}))

    over = {k: v for k, v in sizes.items()
            if k in ("candidates", "excluded") and v > max_bytes}
    run_meta = {
        **meta,
        "excluded_compaction": applied,
        "output_bytes": sizes,
        "committed_files_over_limit": over,
        "run": {"started_unix": round(t0), "duration_s": round(time.time() - t0, 1),
                "python": platform.python_version(), "platform": platform.platform(),
                "packages": _package_versions()},
    }
    write_text(outputs["runMeta"], json.dumps(run_meta, ensure_ascii=False, indent=2) + "\n")
    return run_meta


def resolve_outputs(pl: dict[str, Any], base: Path = TOOL_DIR) -> dict[str, Path]:
    return {k: (base / v).resolve() for k, v in pl["outputs"].items() if not k.startswith("_")}
