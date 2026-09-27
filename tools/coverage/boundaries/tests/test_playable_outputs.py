"""P2-F04-T23 (P1-X39): the committed data/map/playable-provinces.geojson that lets
tools/tiles/bin/verify-bbox.py run without tools/coverage/out/ (CI, clean checkout)."""

from __future__ import annotations

from pathlib import Path

import pytest
from shapely.geometry import box, shape

from boundaries.__main__ import DEFAULT_BOUNDARY_PARAMS
from boundaries.playable import main, outward_bbox
from pipeline.config import DEFAULT_PARAMS, TOOL_DIR

from .checks import check_collection
from .conftest import DATA_MAP, REPO_ROOT, load

BP = load(DEFAULT_BOUNDARY_PARAMS)
PP = BP["playableProvinces"]
STUDY = load(DEFAULT_PARAMS)["pipeline"]["studyArea"]
FILE = DATA_MAP / "playable-provinces.geojson"
TILE_BBOX = load(REPO_ROOT / "tools" / "tiles" / "config.json")["area"]["bbox"]


def test_output_path_and_size():
    assert (TOOL_DIR / PP["output"]).resolve() == FILE
    assert FILE.stat().st_size <= int(PP["maxFileBytes"])


def test_one_feature_per_playable_province_in_params_order():
    fc = load(FILE)
    check_collection(fc)
    assert fc["attribution"] == BP["attribution"] and "ODbL" in fc["license"]
    assert fc["source"]["dataDate"] and fc["source"]["derivedFrom"] == "tools/coverage/out/boundaries.geojson"
    assert [f["properties"]["iso"] for f in fc["features"]] == [p["iso"] for p in STUDY["provinces"]]
    for f in fc["features"]:
        assert set(f["properties"]) == {"iso", "name", "bbox"}
        assert f["geometry"]["type"] in ("Polygon", "MultiPolygon")


def test_bbox_property_matches_geometry_within_buffer():
    """bbox = exact district bounds; geometry = simplified + buffered by simplify_m."""
    tol_deg = float(PP["simplify_m"]) * 1.5 / 100_000  # buffer + rounding, degrees near 14 N
    for f in load(FILE)["features"]:
        g = shape(f["geometry"])
        assert g.is_valid
        b = f["properties"]["bbox"]
        gb = g.bounds
        for i in range(4):
            assert abs(gb[i] - b[i]) <= tol_deg, (f["properties"]["iso"], i, gb, b)


def test_tile_bbox_covers_every_playable_province():
    """The same assertion verify-bbox.py makes, here in pytest as well."""
    for f in load(FILE)["features"]:
        x0, y0, x1, y1 = f["properties"]["bbox"]
        assert TILE_BBOX[0] <= x0 and TILE_BBOX[1] <= y0 and x1 <= TILE_BBOX[2] and y1 <= TILE_BBOX[3]


def test_outward_bbox_rounds_away_from_the_geometry():
    assert outward_bbox((100.123456, 13.654321, 100.200001, 13.7), 5) == [
        100.12345, 13.65432, 100.20001, 13.7]


@pytest.mark.skipif(not (TOOL_DIR / PP["input"]).exists(),
                    reason="needs the git-ignored coverage pipeline output (tools/coverage/out/)")
def test_check_mode_matches_committed_file():
    assert main(["--check"]) == 0


def test_missing_province_stops(tmp_path: Path):
    empty = tmp_path / "districts.geojson"
    empty.write_text('{"type":"FeatureCollection","features":[]}', encoding="utf-8")
    assert main(["--input", str(empty), "--out-base", str(tmp_path)]) == 1
    assert not (tmp_path / PP["output"]).exists()
