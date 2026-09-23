"""Checks the committed files in data/map/ (no OSM extract needed)."""

from __future__ import annotations

import json

import pytest
from shapely.geometry import Point

from boundaries.__main__ import DEFAULT_BOUNDARY_PARAMS
from pipeline.config import DEFAULT_PARAMS

from .checks import check_labels_vs_mask, check_mask, check_provinces
from .conftest import DATA_MAP, load

BP = load(DEFAULT_BOUNDARY_PARAMS)
STUDY = load(DEFAULT_PARAMS)["pipeline"]["studyArea"]
MASK = DATA_MAP / "playarea-mask.geojson"
PROVINCES = DATA_MAP / "provinces.geojson"
TECH_NOTE_MAX_BYTES = 300 * 1024  # tech note 15.1 / A-P1-H01-2


@pytest.mark.parametrize("path", [MASK, PROVINCES], ids=lambda p: p.name)
def test_file_size(path):
    size = path.stat().st_size
    assert size <= int(BP["maxFileBytes"]) <= TECH_NOTE_MAX_BYTES, f"{path.name}: {size} bytes"


@pytest.mark.parametrize("path", [MASK, PROVINCES], ids=lambda p: p.name)
def test_same_source_and_attribution(path):
    fc = load(path)
    src = {s["id"]: s for s in load(DEFAULT_PARAMS)["pipeline"]["sources"]}["D1"]
    assert fc["source"]["id"] == "D1" and fc["source"]["sha256"] == src["sha256"]
    assert fc["source"]["dataDate"]
    assert fc["attribution"] == BP["attribution"]


def test_mask_contract():
    check_mask(load(MASK), BP["mask"]["outerRing"])


def test_provinces_contract_77_labels_and_playable_from_params():
    playable_isos = {p["iso"] for p in STUDY["provinces"]}
    assert len(playable_isos) == len(STUDY["provinces"])
    _, labels = check_provinces(load(PROVINCES), 77, playable_isos)
    assert sum(f["properties"]["playable"] for f in labels) == len(STUDY["provinces"])


def test_labels_vs_mask():
    mask = check_mask(load(MASK), BP["mask"]["outerRing"])
    _, labels = check_provinces(load(PROVINCES), 77, {p["iso"] for p in STUDY["provinces"]})
    check_labels_vs_mask(labels, mask)


def test_labels_inside_thailand_bbox():
    for f in load(PROVINCES)["features"]:
        if f["properties"]["kind"] == "label":
            x, y = f["geometry"]["coordinates"]
            assert 97.0 < x < 106.0 and 5.5 < y < 20.6, f["properties"]


def test_mask_hole_is_drawn_by_the_border_lines():
    """One geometry: every hole vertex is a vertex of the border lines."""
    rings = load(MASK)["features"][0]["geometry"]["coordinates"][1:]
    border = next(f for f in load(PROVINCES)["features"] if f["properties"]["kind"] == "border")
    verts = {tuple(pt) for line in border["geometry"]["coordinates"] for pt in line}
    missing = [pt for ring in rings for pt in ring if tuple(pt) not in verts]
    assert not missing, missing[:5]


def test_bangkok_is_visible_and_chiang_mai_masked():
    """Smoke check with two well-known points (Sanam Luang, Chiang Mai old city)."""
    mask = check_mask(load(MASK), BP["mask"]["outerRing"])
    assert not mask.contains(Point(100.4925, 13.7553))
    assert mask.contains(Point(98.9853, 18.7877))


def test_files_are_rfc7946_json():
    for path in (MASK, PROVINCES):
        text = path.read_text(encoding="utf-8")
        fc = json.loads(text)
        assert "crs" not in fc and "bbox" not in fc
        assert text.endswith("\n")
