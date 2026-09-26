"""Launch-area geometry (P2-H01): one polygon per launch district (D-083).

Two offline steps, both deterministic (no run time inside the files):

  extract  D1 OSM extract -> boundaries/launch-area.source.geojson
           full OSM precision, committed (a few KB) so `build` never needs D1
  build    committed source -> data/map/launch-area.geojson (simplified, committed)

`--check` computes the file in memory and compares it byte for byte with the
committed one instead of writing (exit 1 on drift). `build --check` needs only
committed inputs and runs in the root `pnpm test` through the pytest bridge;
`extract --check` needs D1 and is skipped when the extract is absent.

Run from tools/coverage/:  .venv/bin/python -m boundaries.launch build [--check]
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import osmium
import shapely
from shapely import wkb
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.geometry.base import BaseGeometry
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from pipeline.config import DEFAULT_PARAMS, TOOL_DIR
from pipeline.fetch import FetchError, fetch_sources
from pipeline.geom import Projector
from pipeline.osm_read import read_header_date

from .__main__ import DEFAULT_BOUNDARY_PARAMS, dumps
from .build import BuildError, _lines, _polygons, _round_xy
from .osm import _open

DEFAULT_SOURCE = Path(__file__).resolve().parent / "launch-area.source.geojson"
OSM_PRECISION = 7  # OSM stores coordinates with 7 decimals
TOOL = "tools/coverage/boundaries/launch.py (P2-H01)"


@dataclass
class DistrictArea:
    osm_id: int
    name: str
    name_en: str | None
    geom: BaseGeometry  # WGS84 (Multi)Polygon


def _name(tags: dict[str, str], keys: list[str]) -> str | None:
    return next((tags[k].strip() for k in keys if tags.get(k, "").strip()), None)


def read_districts(
    path: Path, lp: dict[str, Any], province_rid: int
) -> tuple[list[DistrictArea], BaseGeometry]:
    """One streaming pass over the extract: the configured district relations
    and their province relation (used to prove each district lies in it)."""
    wanted = {int(d["osmRelationId"]) for d in lp["districts"]}
    tf = osmium.filter.TagFilter(("admin_level", lp["adminLevel"]), ("admin_level", "4"))
    fp = osmium.FileProcessor(_open(path)).with_locations().with_areas(tf).with_filter(tf)
    fab = osmium.geom.WKBFactory()
    found: dict[int, DistrictArea] = {}
    province: BaseGeometry | None = None
    problems: list[str] = []
    for o in fp:
        if not o.is_area() or o.from_way():
            continue
        rid, tags = o.orig_id(), dict(o.tags)
        if tags.get("boundary") != "administrative":
            continue
        is_province = rid == province_rid and tags.get("admin_level") == "4"
        is_district = rid in wanted and tags.get("admin_level") == lp["adminLevel"]
        if not (is_province or is_district):
            continue
        try:
            geom = wkb.loads(fab.create_multipolygon(o), hex=True)
        except RuntimeError:
            problems.append(f"relation {rid} failed to assemble")
            continue
        if is_province:
            province = geom
            continue
        name = _name(tags, lp["nameTags"])
        if name is None:
            problems.append(f"relation {rid} has no name")
            continue
        found[rid] = DistrictArea(rid, name, tags.get(lp["nameEnTag"]), geom)
    missing = sorted(wanted - set(found))
    if missing:
        problems.append("district relations not found: " + ", ".join(map(str, missing)))
    if province is None:
        problems.append(f"province relation {province_rid} not found")
    if problems:
        raise BuildError("; ".join(problems))
    assert province is not None
    for d in found.values():
        if not province.contains(d.geom.representative_point()):
            raise BuildError(f"district {d.osm_id} ({d.name}) is not in {lp['provinceIso']}")
    order = [int(d["osmRelationId"]) for d in lp["districts"]]
    return [found[rid] for rid in order], province


def _rings(geom: BaseGeometry, digits: int) -> dict[str, Any]:
    """GeoJSON geometry with RFC 7946 winding and rounded coordinates.
    One part -> Polygon, several -> MultiPolygon."""
    parts = []
    for poly in sorted(_polygons(geom), key=lambda p: (p.bounds[0], p.bounds[1])):
        poly = orient(poly, sign=1.0)
        rings = [_round_xy(poly.exterior.coords, digits)]
        rings += [_round_xy(r.coords, digits) for r in poly.interiors]
        parts.append(rings)
    if not parts:
        raise BuildError("empty geometry")
    if len(parts) == 1:
        return {"type": "Polygon", "coordinates": parts[0]}
    return {"type": "MultiPolygon", "coordinates": parts}


def source_collection(
    districts: list[DistrictArea], source: dict[str, Any], attribution: str
) -> dict[str, Any]:
    """The committed full-precision source (OSM geometry as assembled by osmium)."""
    feats = [{
        "type": "Feature",
        "properties": {"osmRelationId": d.osm_id, "name": d.name, "nameEn": d.name_en},
        "geometry": _rings(d.geom, OSM_PRECISION),
    } for d in districts]
    return {"type": "FeatureCollection", "attribution": attribution,
            "license": "ODbL-1.0", "source": source, "features": feats}


def _shared_lines(geoms: list[BaseGeometry], tol_m: float, proj: Projector,
                  digits: int) -> list[list[list[float]]]:
    """Every district boundary once, noded by a union and merged at degree-2
    nodes, so a line shared by two districts is simplified once and both
    districts get the same vertices (no gap, no overlap). Junctions are line
    ends, which simplification keeps fixed."""
    merged = shapely.line_merge(unary_union([g.boundary for g in geoms]))
    out = []
    for ln in _lines(merged):
        simple = ln.simplify(tol_m, preserve_topology=False)
        coords = _round_xy(proj.to_wgs(simple).coords, digits)
        if len(coords) >= 2:
            out.append(coords)
    out.sort(key=lambda c: (c[0][0], c[0][1], c[-1][0], c[-1][1]))
    return out


def simplify_districts(
    geoms: list[BaseGeometry], proj: Projector, lp: dict[str, Any]
) -> list[BaseGeometry]:
    """Simplified WGS84 geometry per district (same order as `geoms`).
    Faces of the simplified line network are given to the district that
    covers most of them; faces covered by none (holes) are dropped."""
    digits = int(lp["coordinatePrecision"])
    lines = _shared_lines([proj.to_proj(g) for g in geoms], float(lp["simplify_m"]),
                          proj, digits)
    faces = _polygons(shapely.polygonize([shapely.LineString(c) for c in lines]))
    buckets: list[list[Polygon]] = [[] for _ in geoms]
    for face in faces:
        shares = [g.intersection(face).area / face.area for g in geoms]
        best = max(range(len(geoms)), key=lambda i: shares[i])
        if shares[best] > 0.5:
            buckets[best].append(face)
    out = []
    for i, bucket in enumerate(buckets):
        if not bucket:
            raise BuildError(f"district #{i} lost every face during simplification")
        out.append(unary_union(bucket))
    return out


def build_collection(
    src: dict[str, Any], lp: dict[str, Any], proj: Projector, attribution: str
) -> dict[str, Any]:
    """data/map/launch-area.geojson from the committed source (pure)."""
    by_id = {int(f["properties"]["osmRelationId"]): f for f in src["features"]}
    order = [int(d["osmRelationId"]) for d in lp["districts"]]
    if sorted(by_id) != sorted(order) or len(src["features"]) != len(order):
        raise BuildError(f"source districts {sorted(by_id)} != params {sorted(order)}")
    originals = [shape(by_id[rid]["geometry"]) for rid in order]
    simple = simplify_districts(originals, proj, lp)
    max_change = float(lp["maxAreaChangeShare"])
    feats = []
    for d, orig, geom in zip(lp["districts"], originals, simple):
        gj = _rings(geom, int(lp["coordinatePrecision"]))
        final = shape(gj)
        if not final.is_valid:
            raise BuildError(f"{d['id']}: invalid after rounding: {shapely.is_valid_reason(final)}")
        a0, a1 = proj.to_proj(orig).area, proj.to_proj(final).area
        if abs(a1 - a0) / a0 > max_change:
            raise BuildError(f"{d['id']}: area changed {abs(a1 - a0) / a0:.2%} > {max_change:.2%}")
        props = by_id[int(d["osmRelationId"])]["properties"]
        feats.append({"type": "Feature", "properties": {
            "id": d["id"], "osmName": props["name"], "osmNameEn": props["nameEn"],
            "osmRelationId": int(d["osmRelationId"]), "provinceIso": lp["provinceIso"],
        }, "geometry": gj})
    finals = [shape(f["geometry"]) for f in feats]
    for i in range(len(finals)):
        for j in range(i + 1, len(finals)):
            overlap = proj.to_proj(finals[i].intersection(finals[j])).area
            if overlap > 1.0:  # m²: shared edges are identical, so only rounding noise
                raise BuildError(f"{feats[i]['properties']['id']} overlaps "
                                 f"{feats[j]['properties']['id']} by {overlap:.1f} m²")
    source = dict(src["source"])
    source["tool"] = TOOL
    source["simplify_m"] = lp["simplify_m"]
    return {"type": "FeatureCollection", "attribution": attribution, "license": "ODbL-1.0",
            "source": source, "features": feats}


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="python -m boundaries.launch", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("step", choices=["extract", "build"])
    ap.add_argument("--check", action="store_true",
                    help="compare with the committed file instead of writing (exit 1 on drift)")
    ap.add_argument("--params", type=Path, default=DEFAULT_PARAMS)
    ap.add_argument("--boundary-params", type=Path, default=DEFAULT_BOUNDARY_PARAMS)
    ap.add_argument("--source", type=Path, default=DEFAULT_SOURCE,
                    help="full-precision source file (extract writes it, build reads it)")
    ap.add_argument("--osm", type=Path,
                    help="extract: use this OSM file instead of D1 (tests); skips the checksum")
    ap.add_argument("--out-base", type=Path, default=TOOL_DIR,
                    help="base directory for the relative output path (default tools/coverage)")
    return ap


def _extract(args: argparse.Namespace, pl: dict[str, Any], bp: dict[str, Any]) -> dict[str, Any]:
    lp = bp["launchArea"]
    if args.osm is None:
        src = {s["id"]: s for s in pl["sources"]}[pl["osmSource"]]
        fetch_sources([src], TOOL_DIR, offline=True, include_optional=False)
        osm_path = TOOL_DIR / src["path"]
        source = {"id": src["id"], "file": Path(src["path"]).name, "sha256": src["sha256"]}
    else:
        osm_path = args.osm
        source = {"id": "custom", "file": osm_path.name, "sha256": None}
    source["dataDate"] = read_header_date(osm_path)
    prov = [p for p in pl["studyArea"]["provinces"] if p["iso"] == lp["provinceIso"]]
    if len(prov) != 1:
        raise BuildError(f"{lp['provinceIso']} is not a study-area province")
    districts, _ = read_districts(osm_path, lp, int(prov[0]["osmRelationId"]))
    return source_collection(districts, source, bp["attribution"])


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    tag = f"[launch-area {args.step}]"
    try:
        pl = json.loads(args.params.read_text(encoding="utf-8"))["pipeline"]
        bp = json.loads(args.boundary_params.read_text(encoding="utf-8"))
        lp = bp["launchArea"]
        if args.step == "extract":
            fc = _extract(args, pl, bp)
            path = args.source.resolve()
        else:
            src = json.loads(args.source.read_text(encoding="utf-8"))
            fc = build_collection(src, lp, Projector.for_crs(pl["projectedCrs"]),
                                  bp["attribution"])
            path = (args.out_base / lp["output"]).resolve()
        text = dumps(fc).encode("utf-8")
        if args.step == "build" and len(text) > int(lp["maxFileBytes"]):
            raise BuildError(f"{len(text):,} bytes > limit {int(lp['maxFileBytes']):,}")
        verts = sum(len(r) for f in fc["features"] for r in _all_rings(f["geometry"]))
        if args.check:
            old = path.read_bytes() if path.exists() else None
            if old != text:
                why = "missing" if old is None else f"{len(old):,} bytes committed"
                print(f"{tag} DRIFT: {path} differs from a fresh run ({why}, "
                      f"fresh {len(text):,} bytes); rerun without --check", file=sys.stderr)
                return 1
            print(f"{tag} ok: {path} up to date ({len(text):,} bytes, {verts} vertices)")
            return 0
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text)
        print(f"{tag} wrote {path} ({len(text):,} bytes, {verts} vertices)")
    except (FetchError, BuildError, KeyError, OSError, ValueError) as exc:
        print(f"{tag} error: {exc!r}", file=sys.stderr)
        return 1
    return 0


def _all_rings(geometry: dict[str, Any]) -> list[list[list[float]]]:
    coords = geometry["coordinates"]
    return coords if geometry["type"] == "Polygon" else [r for part in coords for r in part]


if __name__ == "__main__":
    sys.exit(main())
