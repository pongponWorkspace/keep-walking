"""Committed launch-area files (P2-H01): drift guard and contract.

`build --check` rebuilds data/map/launch-area.geojson from the committed
source and params and must match byte for byte, so the file cannot drift
without a rerun. Needs no OSM extract; `extract --check` runs only when D1
has been downloaded locally.
"""

from __future__ import annotations

import json

import pytest
from shapely.geometry import Point, shape

from boundaries.__main__ import DEFAULT_BOUNDARY_PARAMS
from boundaries.launch import DEFAULT_SOURCE, OSM_PRECISION, main
from pipeline.config import DEFAULT_PARAMS, TOOL_DIR

from .checks import check_mask, max_decimals, signed_area
from .conftest import DATA_MAP, load

BP = load(DEFAULT_BOUNDARY_PARAMS)
LP = BP["launchArea"]
PL = load(DEFAULT_PARAMS)["pipeline"]
D1 = {s["id"]: s for s in PL["sources"]}["D1"]
OUT = DATA_MAP / "launch-area.geojson"
BRIEF_MAX_BYTES = 100 * 1024  # P2-H01: well under 100 KB
LAUNCH_SCORE = TOOL_DIR / "analysis" / "launch-score.config.json"


def _features() -> dict[str, dict]:
    return {f["properties"]["id"]: f for f in load(OUT)["features"]}


def test_committed_file_matches_a_fresh_build():
    assert main(["build", "--check"]) == 0, "rerun: python -m boundaries.launch build"


@pytest.mark.skipif(not (TOOL_DIR / D1["path"]).exists(), reason="D1 extract not downloaded")
def test_committed_source_matches_d1():
    assert main(["extract", "--check"]) == 0, "rerun: python -m boundaries.launch extract"


def test_size_and_output_path():
    assert (TOOL_DIR / LP["output"]).resolve() == OUT.resolve()
    assert OUT.stat().st_size <= int(LP["maxFileBytes"]) <= BRIEF_MAX_BYTES


def test_districts_are_the_d083_launch_districts():
    ids = [d["id"] for d in LP["districts"]]
    assert ids == ["phraNakhon", "pathumWan", "bangRak"]
    assert list(_features()) == ids
    rids = {int(d["osmRelationId"]) for d in LP["districts"]}
    assert rids == set(load(LAUNCH_SCORE)["launchDistricts"])
    names = {k: f["properties"]["osmName"] for k, f in _features().items()}
    assert names == {"phraNakhon": "เขตพระนคร", "pathumWan": "เขตปทุมวัน", "bangRak": "เขตบางรัก"}


@pytest.mark.parametrize("path", [OUT, DEFAULT_SOURCE], ids=lambda p: p.name)
def test_source_licence_and_rfc7946(path):
    fc = load(path)
    assert fc["attribution"] == BP["attribution"] and fc["license"] == "ODbL-1.0"
    assert fc["source"]["id"] == "D1" and fc["source"]["sha256"] == D1["sha256"]
    assert fc["source"]["dataDate"]
    text = path.read_text(encoding="utf-8")
    assert "crs" not in fc and "bbox" not in fc and text.endswith("\n")
    assert max_decimals(fc) <= (int(LP["coordinatePrecision"]) if path == OUT else OSM_PRECISION)
    for f in fc["features"]:
        geom = f["geometry"]
        parts = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        for rings in parts:
            assert signed_area(rings[0]) > 0, "outer ring counter-clockwise"
            assert all(signed_area(r) < 0 for r in rings[1:]), "holes clockwise"
            assert all(r[0] == r[-1] and len(r) >= 4 for r in rings)
        assert shape(geom).is_valid


def test_no_overlap_and_shared_edge():
    g = {k: shape(f["geometry"]) for k, f in _features().items()}
    keys = list(g)
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            assert g[a].intersection(g[b]).area == 0, (a, b)
    assert g["pathumWan"].boundary.intersection(g["bangRak"].boundary).length > 0.01
    assert g["phraNakhon"].distance(g["pathumWan"].union(g["bangRak"])) > 0


def test_inside_the_play_area():
    mask = check_mask(load(DATA_MAP / "playarea-mask.geojson"), BP["mask"]["outerRing"])
    for k, f in _features().items():
        assert mask.intersection(shape(f["geometry"])).area == 0, k


@pytest.mark.parametrize("name,lnglat,expected", [
    ("Sanam Luang", (100.4925, 13.7553), "phraNakhon"),
    ("Lumphini Park", (100.5418, 13.7314), "pathumWan"),
    ("Siam", (100.5347, 13.7457), "pathumWan"),
    ("State Tower", (100.5166, 13.7216), "bangRak"),
    ("Victory Monument", (100.5383, 13.7650), None),
    ("Chatuchak Park", (100.5536, 13.8040), None),
    ("Wongwian Yai", (100.4930, 13.7254), None),
])
def test_well_known_points(name, lnglat, expected):
    hits = [k for k, f in _features().items() if shape(f["geometry"]).contains(Point(lnglat))]
    assert hits == ([expected] if expected else []), name


def test_properties_are_ids_not_display_names():
    for f in load(OUT)["features"]:
        assert set(f["properties"]) == {
            "id", "osmName", "osmNameEn", "osmRelationId", "provinceIso"}
        assert f["properties"]["provinceIso"] == LP["provinceIso"]
    json.dumps(load(OUT), allow_nan=False)
