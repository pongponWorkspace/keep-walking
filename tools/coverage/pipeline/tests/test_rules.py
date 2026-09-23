"""Unit tests: projected area, area limits, geometry repair, tag rules, shares."""

from __future__ import annotations

import math

import pytest
from shapely.geometry import MultiPolygon, Point, Polygon, box

from pipeline.config import load_config
from pipeline.geom import Projector, area_reason, parts_connected, repair, size_band
from pipeline.tags import (
    BlockRules, access_reasons, classify, compile_patterns, is_major_way, name_matches,
    tag_matches,
)

CFG = load_config()
PROJ = Projector.for_crs(CFG.pipeline["projectedCrs"])
X0, Y0 = 662000.0, 1520000.0  # UTM 47N near Bangkok


def _utm_square(area: float) -> Polygon:
    s = math.sqrt(area)
    return box(X0, Y0, X0 + s, Y0 + s)


@pytest.mark.parametrize("delta,expected", [(-1, "area_too_small"), (0, None)])
def test_min_area_inclusive(delta, expected):
    assert area_reason(CFG.min_area_m2 + delta, CFG.min_area_m2, CFG.max_area_m2) == expected


@pytest.mark.parametrize("delta,expected", [(0, None), (1, "area_too_large")])
def test_max_area_inclusive(delta, expected):
    assert area_reason(CFG.max_area_m2 + delta, CFG.min_area_m2, CFG.max_area_m2) == expected


def test_qa_boundary_values_match_gdd():
    """QA boundary set 2,999 / 3,000 / 150,000 / 150,001 with the current config."""
    got = [area_reason(a, CFG.min_area_m2, CFG.max_area_m2)
           for a in (CFG.min_area_m2 - 1, CFG.min_area_m2, CFG.max_area_m2, CFG.max_area_m2 + 1)]
    assert got == ["area_too_small", None, None, "area_too_large"]


@pytest.mark.parametrize("area", [2999.0, 3000.0, 150000.0, 150001.0])
def test_projected_area_roundtrip(area):
    """A square drawn in UTM, stored as WGS84, measures the same area in UTM."""
    wgs = PROJ.to_wgs(_utm_square(area))
    assert PROJ.to_proj(wgs).area == pytest.approx(area, abs=1e-3)


def test_hole_is_subtracted():
    outer = _utm_square(10000.0)
    poly = Polygon(outer.exterior.coords, [box(X0 + 10, Y0 + 10, X0 + 60, Y0 + 60).exterior.coords])
    assert PROJ.to_proj(PROJ.to_wgs(poly)).area == pytest.approx(7500.0, abs=1e-3)


def test_repair_bowtie_is_large_change():
    bowtie = Polygon([(0, 0), (100, 100), (100, 0), (0, 100)])
    fixed, change = repair(bowtie)
    assert fixed.is_valid and change > CFG.cf["repairMaxAreaChangeShare"]
    ok, change_ok = repair(box(0, 0, 10, 10))
    assert change_ok == 0.0 and ok.area == 100


def test_parts_connected_uses_gap():
    gap = CFG.cf["multipartMaxGap_m"]
    near = MultiPolygon([box(0, 0, 10, 10), box(10 + gap * 0.9, 0, 30 + gap, 10)])
    far = MultiPolygon([box(0, 0, 10, 10), box(10 + gap * 1.1, 0, 30 + gap * 2, 10)])
    assert parts_connected(near, gap) and not parts_connected(far, gap)


def test_size_band_edges():
    up = CFG.cf["sizeBandUpper_m2"]
    assert [size_band(up["small"], up), size_band(up["small"] + 1, up),
            size_band(up["medium"] + 1, up)] == ["small", "medium", "large"]


@pytest.mark.parametrize("park_area,expected_blocked", [(20000.0, False), (4000.0, True)])
def test_point_blocker_share_method_table(park_area, expected_blocked):
    """METHOD 7.4 rows 3-4: node buffered by pointBlockerRadius_m."""
    park = _utm_square(park_area)
    circle = park.centroid.buffer(CFG.cf["pointBlockerRadius_m"])
    share = park.intersection(circle).area / park.area
    assert (share > CFG.cf["maxBlockedShare"]["religious"]) is expected_blocked


def test_tag_matching_and_classes():
    assert tag_matches({"historic": "ruins"}, "historic=*")
    assert not tag_matches({"leisure": "parkx"}, "leisure=park")
    classes = classify({"leisure": "park", "historic": "yes"}, CFG.pipeline["candidateClasses"])
    assert classes == ["park", "historic"]


def test_blocklist_categories_and_area_only():
    rules = BlockRules.from_filter(CFG.cf)
    assert rules.categories({"amenity": "clinic"}, is_area=True) == ["health"]
    assert rules.categories({"amenity": "clinic"}, is_area=False) == []
    assert rules.categories({"landuse": "religious"}, True) == ["religious"]
    assert rules.categories({"amenity": "place_of_worship"}, False) == ["religious"]
    assert rules.categories({"building": "yes", "religion": "muslim"}, True) == ["religious"]


def test_access_and_indoor_rules():
    cf = CFG.cf
    assert access_reasons({"access": "private"}, ["park"], cf) == ["access_private"]
    assert access_reasons({"layer": "-1"}, ["pitch"], cf) == ["indoor"]
    assert access_reasons({"indoor": "no"}, ["pitch"], cf) == []
    assert access_reasons({"building": "roof"}, ["marketplace"], cf) == []
    assert access_reasons({"building": "yes"}, ["marketplace"], cf) == ["indoor_market"]
    assert access_reasons({"garden:type": "private"}, ["garden"], cf) == ["private_garden"]


def test_religious_name_patterns():
    pats = compile_patterns(CFG.cf["religiousNamePatterns"])
    for name in ("วัดโพธิ์", "Wat Arun", "WAT PHO", "Mosque of X", "ศาลเจ้าพ่อเสือ"):
        assert name_matches({"name": name}, pats, anchored=True), name
    for name in ("สวนลุมพินี", "Watergate Park", "สวนวัดใหม่"):
        assert not name_matches({"name": name}, pats, anchored=True), name


def test_major_way_rules():
    cf = CFG.cf
    assert is_major_way({"highway": "primary"}, cf)
    assert is_major_way({"highway": "trunk", "bridge": "no"}, cf)
    assert not is_major_way({"highway": "primary", "tunnel": "yes"}, cf)
    assert not is_major_way({"highway": "residential"}, cf)


def test_point_inside_uses_projection():
    p = PROJ.to_proj(Point(100.5, 13.75))
    assert 600000 < p.x < 700000 and 1500000 < p.y < 1540000
