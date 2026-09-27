"""Small committed polygon of every playable province (P2-F04-T23, P1-X39).

tools/tiles/bin/verify-bbox.py checks that the tile bbox covers the play area. It used
the district polygons in tools/coverage/out/boundaries.geojson, which only exist after a
local run of the coverage pipeline (327 MB OSM extract, git-ignored), so a clean checkout
and CI skipped the check. This step dissolves those districts per province into one small
file that is committed:

  data/map/playable-provinces.geojson
    one feature per playable province: properties {iso, name, bbox}
    bbox      exact bounds of the unsimplified districts, rounded outward (the check reads it)
    geometry  simplified by `simplify_m` then buffered by the same distance, so it contains
              the original up to coordinate rounding (usable as `pmtiles extract --region`)

The input is the district layer (land-side admin_level 6), the same geometry the check
used before, not the province relations (those reach into the Gulf, see mask.clipBbox).

Deterministic, offline. `--check` rebuilds in memory and compares byte for byte (exit 1
on drift); it needs the git-ignored input, so the committed file itself is validated by
boundaries/tests/test_playable_outputs.py instead.

Run from tools/coverage/:  .venv/bin/python -m boundaries.playable [--check]
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

from shapely.geometry import mapping, shape
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from pipeline.config import DEFAULT_PARAMS, TOOL_DIR
from pipeline.geom import Projector

from .__main__ import DEFAULT_BOUNDARY_PARAMS, dumps
from .build import BuildError, _polygons, _round_xy

TOOL = "tools/coverage/boundaries/playable.py (P2-F04-T23)"


def outward_bbox(bounds: tuple[float, float, float, float], digits: int) -> list[float]:
    """Round min down and max up, so the rounded box still contains the geometry."""
    k = 10 ** digits
    minx, miny, maxx, maxy = bounds
    return [math.floor(minx * k) / k, math.floor(miny * k) / k,
            math.ceil(maxx * k) / k, math.ceil(maxy * k) / k]


def build_collection(districts: dict[str, Any], study_area: dict[str, Any],
                     pp: dict[str, Any], proj: Projector, attribution: str) -> dict[str, Any]:
    digits = int(pp["coordinatePrecision"])
    tol = float(pp["simplify_m"])
    wanted = [p["iso"] for p in study_area["provinces"]]
    by_iso: dict[str, list[Any]] = {iso: [] for iso in wanted}
    names: dict[str, str] = {}
    for f in districts["features"]:
        iso = f["properties"].get("province_iso")
        if iso in by_iso:
            by_iso[iso].append(shape(f["geometry"]))
            names[iso] = f["properties"]["province"]
    missing = [iso for iso, geoms in by_iso.items() if not geoms]
    if missing:
        raise BuildError(f"no district polygons for {missing}")
    feats = []
    for iso in wanted:
        full = unary_union(by_iso[iso])
        simple = proj.to_proj(full).simplify(tol, preserve_topology=True).buffer(
            tol, join_style="mitre", mitre_limit=2.0)
        wgs = proj.to_wgs(simple)
        polys = [orient(p, sign=1.0) for p in _polygons(wgs)]
        coords = [[_round_xy(p.exterior.coords, digits)]
                  + [_round_xy(r.coords, digits) for r in p.interiors] for p in polys]
        geom = ({"type": "Polygon", "coordinates": coords[0]} if len(coords) == 1
                else {"type": "MultiPolygon", "coordinates": coords})
        if not shape(geom).is_valid:
            raise BuildError(f"{iso}: polygon invalid after rounding")
        feats.append({"type": "Feature",
                      "properties": {"iso": iso, "name": names[iso],
                                     "bbox": outward_bbox(full.bounds, digits)},
                      "geometry": geom})
    meta = districts.get("coverage_meta", {})
    return {"type": "FeatureCollection", "attribution": attribution,
            "license": meta.get("license"),
            "source": {"dataDate": meta.get("data_date"),
                       "derivedFrom": "tools/coverage/" + pp["input"], "tool": TOOL},
            "features": feats}


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="python -m boundaries.playable", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--params", type=Path, default=DEFAULT_PARAMS)
    ap.add_argument("--boundary-params", type=Path, default=DEFAULT_BOUNDARY_PARAMS)
    ap.add_argument("--input", type=Path, help="district GeoJSON (default: playableProvinces.input)")
    ap.add_argument("--out-base", type=Path, default=TOOL_DIR)
    ap.add_argument("--check", action="store_true", help="compare with the committed file")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        pl = json.loads(args.params.read_text(encoding="utf-8"))["pipeline"]
        bp = json.loads(args.boundary_params.read_text(encoding="utf-8"))
        pp = bp["playableProvinces"]
        src = args.input or (TOOL_DIR / pp["input"])
        districts = json.loads(Path(src).read_text(encoding="utf-8"))
        fc = build_collection(districts, pl["studyArea"], pp,
                              Projector.for_crs(pl["projectedCrs"]), bp["attribution"])
        text = dumps(fc).encode("utf-8")
        if len(text) > int(pp["maxFileBytes"]):
            raise BuildError(f"{len(text):,} bytes > limit {int(pp['maxFileBytes']):,}")
        out = (args.out_base / pp["output"]).resolve()
        if args.check:
            same = out.exists() and out.read_bytes() == text
            print(f"[playable] {'OK' if same else 'DRIFT'} {out}")
            return 0 if same else 1
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(text)
        print(f"[playable] wrote {out} ({len(text):,} bytes, {len(fc['features'])} provinces)")
    except (BuildError, KeyError, OSError, ValueError) as exc:
        print(f"[playable] error: {exc!r}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
