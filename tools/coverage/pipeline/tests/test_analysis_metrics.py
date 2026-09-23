"""P1-F01-T06 analysis: metric functions and an end-to-end compute on a
hand-built scene (3 districts on one street, 5 candidates, 6 population
cells). Every expected number below is derived by hand in the comments."""

from __future__ import annotations

import csv
import io
import json

import numpy as np
import pytest

from analysis import metrics as M
from analysis import report as R
from analysis.graph import TransitPoint, WalkGraph
from analysis.raster import Grid
from analysis.run import Inputs, compute
from pipeline.config import REPO_ROOT, TOOL_DIR, load_config
from pipeline.geom import Projector

from .fixture_osm import ORIGIN_X, ORIGIN_Y, TO_WGS

ACFG = json.loads((TOOL_DIR / "analysis" / "launch-score.config.json").read_text(encoding="utf-8"))
CFG = load_config()
PROJ = Projector.for_crs(CFG.pipeline["projectedCrs"])
PRESETS = json.loads((REPO_ROOT / ACFG["presetsFile"]).read_text(encoding="utf-8"))["presets"]
CLASSES = [c["class"] for c in CFG.pipeline["candidateClasses"]]
BANDS = ACFG["distanceBands_m"]


# ------------------------------------------------------------------ config
def test_weights_match_launch_criteria():
    """launch-criteria.md section 3: 0.25 / 0.25 / 0.20 / 0.15 / 0.15."""
    assert ACFG["weights"] == {"densityScore": 0.25, "walkDistanceScore": 0.25,
                               "transitAccessScore": 0.2, "presetDiversityScore": 0.15,
                               "populationDensityScore": 0.15}
    assert sum(ACFG["weights"].values()) == pytest.approx(1.0)
    assert BANDS == {"greenMax": 800, "yellowMax": 3000}  # PRD F01 section 3


def test_walk_keys_come_from_dungeons_json():
    cf = CFG.cf
    for key in ("walkGraphSnapMaxDistance_m", "walkRouteFactorFallbackMult",
                "walkRouteFactorUncertaintyMinMult", "walkRouteFactorUncertaintyMaxMult"):
        assert key in cf and key not in ACFG


# ------------------------------------------------------------------ metrics
@pytest.mark.parametrize("dist,far,zone", [
    (0.0, False, 0), (800.0, False, 0), (800.01, False, 1), (3000.0, False, 1),
    (3000.01, False, 2), (10.0, True, 2), (float("inf"), False, 2),
])
def test_zone_edges(dist, far, zone):
    assert M.zone_of(np.array([dist]), np.array([far]), BANDS).tolist() == [zone]


@pytest.mark.parametrize("cls,band,preset", [
    ("marketplace", "small", "market"), ("marketplace", "large", "market"),
    ("park", "small", "pocketPark"), ("pitch", "medium", "largePark"),
    ("historic", "large", "largePark"), ("garden", "small", "pocketPark"),
])
def test_preset_class_first(cls, band, preset):
    assert M.assign_preset(cls, band, PRESETS) == preset


@pytest.mark.parametrize("props,usable", [
    ({"reason_excluded": None, "flags": []}, True),
    ({"reason_excluded": None, "flags": ["crosses_major_way", "multi_district"]}, True),
    ({"reason_excluded": None, "flags": ["review_required"]}, False),  # D-048 Dusit etc.
    ({"reason_excluded": "area_too_small", "flags": []}, False),
])
def test_is_usable(props, usable):
    assert M.is_usable(props) is usable


def test_transit_distance_rule():
    t = ACFG["transit"]  # rail 2 : bus 1 when rail <= railAcceptableWalk_m (800)
    assert M.transit_distance(100.0, 2000.0, t) == pytest.approx((2 * 100 + 2000) / 3)
    assert M.transit_distance(800.0, 300.0, t) == pytest.approx((1600 + 300) / 3)
    assert M.transit_distance(800.5, 300.0, t) == 300.0


def test_weighted_median_and_min_max():
    assert M.weighted_median(np.array([5.0, 1.0, 3.0]), np.array([1.0, 1.0, 5.0])) == 3.0
    assert M.min_max({"a": 2.0, "b": 4.0}) == {"a": 0.0, "b": 1.0}
    assert M.min_max({"a": 2.0, "b": 4.0}, higher_is_better=False) == {"a": 1.0, "b": 0.0}
    assert M.min_max({"a": 3.0, "b": 3.0}) == {"a": 1.0, "b": 1.0}


def test_launch_score_zero_for_district_without_dungeon():
    raw = {1: {"density": 1.0, "walk_avg_m": 500.0, "transit_mean_m": 300.0, "preset_count": 3,
               "pop_density": 10.0, "has_dungeon": True},
           2: {"density": 0.5, "walk_avg_m": 900.0, "transit_mean_m": 100.0, "preset_count": 1,
               "pop_density": 20.0, "has_dungeon": True},
           3: {"density": 0.0, "walk_avg_m": 100.0, "transit_mean_m": None, "preset_count": 0,
               "pop_density": 99.0, "has_dungeon": False}}
    s = M.launch_scores(raw, ACFG["weights"], 3)
    assert s[3]["launchScore"] == 0.0 and all(v == 0.0 for v in s[3].values())
    # district 3 does not stretch the min-max range of the other two
    assert s[1]["populationDensityScore"] == 0.0 and s[2]["populationDensityScore"] == 1.0
    assert s[1]["launchScore"] == pytest.approx(0.25 + 0.25 + 0.0 + 0.15 + 0.0)
    assert s[2]["launchScore"] == pytest.approx(0.0 + 0.0 + 0.2 + 0.05 + 0.15)


# ------------------------------------------------------------------ end-to-end scene
# One east-west street y = 500 m, x = 0..8000 m, a node every 100 m (UTM
# offsets from fixture ORIGIN). Districts: A x 0-2000, B 2000-6000, C 6000-8000
# (all y 0-1000). Rail station at x 600, bus stop at x 2500.
def _wgs(x: float, y: float) -> tuple[float, float]:
    return TO_WGS.transform(ORIGIN_X + x, ORIGIN_Y + y)


def _district(osm_id: int, x0: float, x1: float) -> dict:
    ring = [_wgs(x0, 0), _wgs(x1, 0), _wgs(x1, 1000), _wgs(x0, 1000), _wgs(x0, 0)]
    return {"type": "Feature", "properties": {
        "district_osm_id": osm_id, "district": f"D{osm_id}", "district_en": f"D{osm_id}",
        "province": "P", "province_iso": "TH-10", "area_m2": (x1 - x0) * 1000.0},
        "geometry": {"type": "Polygon", "coordinates": [ring]}}


def _cand(fid, x, y, cls, band, district, flags=(), multi=None, area=5000.0) -> dict:
    related = {"districts": multi} if multi else {}
    return {"type": "Feature", "id": fid, "properties": {
        "id": fid, "name": fid, "class": cls, "size_band": band, "area_m2": area,
        "rep_point": list(_wgs(x, y)), "district_osm_id": district,
        "multi_district": bool(multi), "related_ids": related, "flags": list(flags),
        "reason_excluded": None}}


CANDS = [
    _cand("d1", 500, 500, "park", "small", 1),              # pocketPark, on node 5
    _cand("d2", 1500, 520, "marketplace", "small", 1),      # market, snap 20 m to node 15
    _cand("d3", 5000, 500, "park", "large", 2, flags=["review_required"]),  # NOT counted
    _cand("d4", 1990, 500, "garden", "medium", 1, flags=["multi_district"], multi=[1, 2]),
]
# (x, y, population): expected zone by hand (network, nearest usable dungeon)
CELLS = [
    (600, 560, 100.0),   # A: ~60 snap + 100 to d1 -> green
    (1000, 950, 50.0),   # A: snap ~450 m > walkGraphSnapMaxDistance_m 150 -> red (snap)
    (2600, 520, 200.0),  # B: ~610 to d4 -> green
    (4000, 500, 120.0),  # B: ~2010 to d4 -> yellow
    (5300, 500, 300.0),  # B: ~3310 to d4 -> red (d3 at 300 m is review_required)
    (7000, 500, 80.0),   # C: ~5010 -> red
]


def _scene() -> Inputs:
    xs = np.arange(0, 8001, 100, dtype=np.float64)
    n = len(xs)
    lonlat = [_wgs(x, 500) for x in xs]
    x, y = PROJ.fwd.transform([p[0] for p in lonlat], [p[1] for p in lonlat])
    src = list(range(n - 1)) + list(range(1, n))
    dst = list(range(1, n)) + list(range(n - 1))
    order = np.lexsort((dst, src))
    src, dst = np.array(src)[order], np.array(dst)[order]
    x, y = np.asarray(x), np.asarray(y)
    w = np.hypot(x[src] - x[dst], y[src] - y[dst])
    indptr = np.zeros(n + 1, np.int64)
    np.add.at(indptr, src + 1, 1)
    g = WalkGraph(np.arange(1, n + 1), x, y, np.cumsum(indptr), dst, w)
    lon_w, lat_s = _wgs(-200, -200)
    lon_e, lat_n = _wgs(8200, 1200)
    dx = 0.0002
    cols, rows = int((lon_e - lon_w) / dx) + 1, int((lat_n - lat_s) / dx) + 1
    vals = np.zeros((rows, cols))
    for cx, cy, pop in CELLS:
        lon, lat = _wgs(cx, cy)
        vals[int((lat_n - lat) / dx), int((lon - lon_w) / dx)] = pop
    grid = Grid(vals, lon_w, lat_n, dx, dx)
    transit = [TransitPoint("osm-n1", "rail", *_wgs(600, 500)),
               TransitPoint("osm-n2", "bus", *_wgs(2500, 500))]
    districts = [_district(1, 0, 2000), _district(2, 2000, 6000), _district(3, 6000, 8000)]
    return Inputs([dict(c, properties=dict(c["properties"])) for c in CANDS], districts, grid, g, transit)


@pytest.fixture(scope="module")
def scene():
    res = compute(_scene(), ACFG, CFG.cf, PRESETS, PROJ, CLASSES)
    return res, {r["district_osm_id"]: r for r in res["rows"]}


def test_scene_counts_and_review_exclusion(scene):
    res, rows = scene
    assert [f["id"] for f in res["usable"]] == ["d1", "d2", "d4"]
    assert res["not_counted"] == ["d3"]
    a, b, c = rows[1], rows[2], rows[3]
    assert (a["valid_polygon_count"], b["valid_polygon_count"], c["valid_polygon_count"]) == (3, 0, 0)
    assert b["review_required_not_counted"] == 1
    assert (a["g2_valid_count_incl_multi"], b["g2_valid_count_incl_multi"]) == (3, 1)  # d4 in both
    assert (a["class_park"], a["class_marketplace"], a["class_garden"]) == (1, 1, 1)
    assert (a["preset_pocketPark"], a["preset_market"], a["preset_largePark"]) == (1, 1, 1)
    assert (a["g3_preset_count_incl_multi"], b["g3_preset_count_incl_multi"]) == (3, 1)
    assert (a["size_small"], a["size_medium"]) == (2, 1)


def test_scene_zone_shares(scene):
    _, rows = scene
    a, b, c = rows[1], rows[2], rows[3]
    assert a["population"] == 150.0 and b["population"] == 620.0 and c["population"] == 80.0
    assert a["g1_pop_share_green"] == pytest.approx(100 / 150)
    assert a["g4_pop_share_red"] == pytest.approx(50 / 150)
    assert a["pop_share_red_snap"] == pytest.approx(50 / 150)
    assert b["g1_pop_share_green"] == pytest.approx(200 / 620)
    assert b["pop_share_yellow"] == pytest.approx(120 / 620)
    assert b["g4_pop_share_red"] == pytest.approx(300 / 620)
    assert b["s1_pop_share_green_yellow"] == pytest.approx(320 / 620)
    assert c["g4_pop_share_red"] == 1.0
    assert a["dungeons_per_100k"] == pytest.approx(3 / 150 * 1e5)


def test_scene_transit_and_launch_score(scene):
    res, rows = scene
    # d1: rail 100 (<= 800) bus 2000 -> 733.3 · d2: rail 920 > 800 -> bus 1020 · d4: bus 510
    assert res["transit_d"] == pytest.approx([(200 + 2000) / 3, 1020.0, 510.0], abs=1.0)
    a, b, c = rows[1], rows[2], rows[3]
    assert b["transit_mean_m"] == pytest.approx(510.0, abs=1.0)
    # A: density 1 walk 1 transit 0 preset 1 pop 0 -> 0.65 · B: 0 0 1 1/3 1 -> 0.40
    assert a["launch_score"] == pytest.approx(0.65)
    assert b["launch_score"] == pytest.approx(0.40)
    assert c["launch_score"] == 0.0 and c["score_walk"] == 0.0
    assert (a["launch_rank"], b["launch_rank"], c["launch_rank"]) == (1, 2, 3)


def test_scene_csv_is_complete_and_sums(scene):
    res, _ = scene
    cols = R.columns(CLASSES, ["small", "medium", "large"], ACFG["primaryPresets"])
    rows = list(csv.DictReader(io.StringIO(R.district_csv(res["rows"], cols))))
    assert len(rows) == 3
    for r in rows:
        assert sum(int(r[f"class_{c}"]) for c in CLASSES) == int(r["valid_polygon_count"])
        assert sum(int(r[f"size_{s}"]) for s in ("small", "medium", "large")) == int(r["valid_polygon_count"])
        assert r["distance_method"] == "osm_walk_network"
        assert r["population_resolution"]
    assert rows[2]["transit_mean_m"] == ""  # no dungeon in C -> empty, not 0


def test_snap_limit_is_read_from_config(scene):
    """Raising walkGraphSnapMaxDistance_m turns the far cell in A from red to
    yellow/green (the value comes from dungeons.json, not from code)."""
    cf = dict(CFG.cf, walkGraphSnapMaxDistance_m=1000)
    res = compute(_scene(), ACFG, cf, PRESETS, PROJ, CLASSES)
    a = {r["district_osm_id"]: r for r in res["rows"]}[1]
    assert a["pop_share_red_snap"] == 0.0 and a["g4_pop_share_red"] == 0.0


def test_print_analysis_case_table(scene, capsys):
    """Trace -> expected -> actual (pytest -s -k print_analysis_case_table)."""
    res, _ = scene
    names = {0: "green", 1: "yellow", 2: "red"}
    by_pop = {float(p): names[z] for p, z in zip(res["cells"]["pop"].tolist(),
                                                  res["cells"]["zone"].tolist())}
    assert len(by_pop) == len(CELLS)  # populations are unique keys
    expected = ["green", "red", "green", "yellow", "red", "red"]
    lines = ["| cell (x m, y m, pop) | expected | actual |", "| --- | --- | --- |"]
    for (x, y, pop), exp in zip(CELLS, expected):
        lines.append(f"| ({x}, {y}, {pop:g}) | {exp} | {by_pop[pop]} |")
    with capsys.disabled():
        print("\n" + "\n".join(lines))
    assert [by_pop[pop] for _, _, pop in CELLS] == expected
