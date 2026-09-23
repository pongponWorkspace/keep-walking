#!/usr/bin/env python3
"""Verify the tile bbox covers every playable province (P1-F02-T06, closes A-P1-F02-T03-2).

Python standard library only (no venv needed). Reads:
  - tools/tiles/config.json            area.bbox, area.provincesFrom, area.boundariesGeojson
  - tools/coverage/params.json          province list (iso) -- same list as the coverage survey
  - tools/coverage/out/boundaries.geojson  district polygons from the coverage pipeline (OSM)

Prints per-province bounds, the union bounds, and the margin (metres) between the
union and each bbox edge. Exit 1 if any province pokes outside the bbox.
With --region-out PATH it also writes a GeoJSON MultiPolygon of all districts, usable
as `pmtiles extract --region=PATH` to compare tile counts against the plain bbox.
"""
import argparse
import json
import math
import sys
from pathlib import Path

TILES_DIR = Path(__file__).resolve().parent.parent
REPO = TILES_DIR.parent.parent


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def json_pointer(doc, ref):
    """Resolve 'file#a.b.c' against REPO."""
    file_part, _, dotted = ref.partition("#")
    node = load_json(REPO / file_part)
    for key in dotted.split("."):
        node = node[key]
    return node


def iter_coords(geom):
    t = geom["type"]
    if t == "Polygon":
        for ring in geom["coordinates"]:
            yield from ring
    elif t == "MultiPolygon":
        for poly in geom["coordinates"]:
            for ring in poly:
                yield from ring
    else:
        raise ValueError(f"unsupported geometry {t}")


def metres_lon(dlon, lat):
    return dlon * 111_320.0 * math.cos(math.radians(lat))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(TILES_DIR / "config.json"))
    ap.add_argument("--region-out", help="write union MultiPolygon GeoJSON here")
    args = ap.parse_args()

    cfg = load_json(args.config)
    area = cfg["area"]
    minx, miny, maxx, maxy = area["bbox"]
    wanted = [p["iso"] for p in json_pointer(None, area["provincesFrom"])]
    boundaries = load_json(REPO / area["boundariesGeojson"])

    per = {iso: [180.0, 90.0, -180.0, -90.0] for iso in wanted}
    names = {}
    polys = []
    for feat in boundaries["features"]:
        iso = feat["properties"].get("province_iso")
        if iso not in per:
            continue
        names[iso] = feat["properties"].get("province", iso)
        b = per[iso]
        for x, y in iter_coords(feat["geometry"]):
            b[0], b[1] = min(b[0], x), min(b[1], y)
            b[2], b[3] = max(b[2], x), max(b[3], y)
        g = feat["geometry"]
        polys.extend([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"])

    missing = [iso for iso in wanted if per[iso][0] > per[iso][2]]
    if missing:
        print(f"FAIL: no boundary features for {missing}", file=sys.stderr)
        return 1

    ok = True
    print(f"bbox (config)      : {minx:.4f},{miny:.4f},{maxx:.4f},{maxy:.4f}")
    print(f"{'province':<8} {'min_lon':>9} {'min_lat':>9} {'max_lon':>9} {'max_lat':>9}  inside")
    for iso in wanted:
        b = per[iso]
        inside = b[0] >= minx and b[1] >= miny and b[2] <= maxx and b[3] <= maxy
        ok &= inside
        print(f"{iso:<8} {b[0]:9.4f} {b[1]:9.4f} {b[2]:9.4f} {b[3]:9.4f}  {'yes' if inside else 'NO'}  {names[iso]}")
    u = [min(per[i][0] for i in wanted), min(per[i][1] for i in wanted),
         max(per[i][2] for i in wanted), max(per[i][3] for i in wanted)]
    mid_lat = (u[1] + u[3]) / 2
    print(f"union              : {u[0]:.4f},{u[1]:.4f},{u[2]:.4f},{u[3]:.4f}")
    print("margin to bbox edge (m, negative = province outside bbox):")
    print(f"  west  {metres_lon(u[0] - minx, mid_lat):8.0f}   east  {metres_lon(maxx - u[2], mid_lat):8.0f}")
    print(f"  south {(u[1] - miny) * 110_574:8.0f}   north {(maxy - u[3]) * 110_574:8.0f}")
    print(f"data date of boundaries: {boundaries.get('coverage_meta', {}).get('data_date', 'unknown')}")

    if args.region_out:
        out = {"type": "Feature", "properties": {"source": area["boundariesGeojson"]},
               "geometry": {"type": "MultiPolygon", "coordinates": polys}}
        Path(args.region_out).parent.mkdir(parents=True, exist_ok=True)
        with open(args.region_out, "w", encoding="utf-8") as fh:
            json.dump(out, fh)
        print(f"region written     : {args.region_out} ({len(polys)} polygons)")

    print("RESULT:", "PASS all provinces inside bbox" if ok else "FAIL province outside bbox")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
