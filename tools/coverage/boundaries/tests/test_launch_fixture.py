"""Launch-area generator (P2-H01) on the synthetic fixture: real CLI, offline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from shapely.geometry import box, shape

from boundaries.launch import main
from boundaries.__main__ import DEFAULT_BOUNDARY_PARAMS
from pipeline.config import DEFAULT_PARAMS

from .checks import max_decimals, signed_area
from .conftest import load
from .fixture_launch import (
    CELL, OUTSIDE_ID, PROVINCE_ID, X0, Y0, build_fixture, district_id, district_name,
)

DEFAULT_SET = [(0, 0), (2, 0), (2, 1)]  # one isolated district + two sharing an edge


@pytest.fixture(scope="module")
def launch_osm(tmp_path_factory) -> Path:
    path = tmp_path_factory.mktemp("launch-osm") / "launch.osm.xml"
    path.write_text(build_fixture(), encoding="utf-8")
    return path


def _setup(base: Path, rids: list[int], edit=None) -> list[str]:
    params = load(DEFAULT_PARAMS)
    params["pipeline"]["studyArea"]["provinces"] = [
        {"iso": "TH-10", "osmRelationId": PROVINCE_ID, "expectedDistricts": 0}]
    bp = load(DEFAULT_BOUNDARY_PARAMS)
    bp["launchArea"]["districts"] = [{"id": f"d{rid}", "osmRelationId": rid} for rid in rids]
    bp["launchArea"]["output"] = "map/launch-area.geojson"
    if edit:
        edit(bp)
    (base / "params.json").write_text(json.dumps(params, ensure_ascii=False), encoding="utf-8")
    (base / "bparams.json").write_text(json.dumps(bp, ensure_ascii=False), encoding="utf-8")
    return ["--params", str(base / "params.json"), "--boundary-params", str(base / "bparams.json"),
            "--source", str(base / "source.geojson"), "--out-base", str(base)]


def _run(base: Path, osm: Path, rids: list[int], edit=None) -> dict[str, Any]:
    args = _setup(base, rids, edit)
    code_x = main(["extract", "--osm", str(osm), *args])
    code_b = main(["build", *args]) if code_x == 0 else None
    out = base / "map" / "launch-area.geojson"
    return {"extract": code_x, "build": code_b, "args": args, "path": out,
            "fc": load(out) if out.exists() else None}


@pytest.fixture(scope="module")
def result(launch_osm, tmp_path_factory) -> dict[str, Any]:
    r = _run(tmp_path_factory.mktemp("launch"), launch_osm,
             [district_id(c, r) for c, r in DEFAULT_SET])
    assert r["extract"] == 0 and r["build"] == 0
    return r


def test_one_feature_per_district_in_params_order(result):
    props = [f["properties"] for f in result["fc"]["features"]]
    rids = [district_id(c, r) for c, r in DEFAULT_SET]
    assert [p["id"] for p in props] == [f"d{rid}" for rid in rids]
    assert [p["osmRelationId"] for p in props] == rids
    assert [p["osmName"] for p in props] == [district_name(rid) for rid in rids]
    assert all(p["provinceIso"] == "TH-10" for p in props)
    assert set(props[0]) == {"id", "osmName", "osmNameEn", "osmRelationId", "provinceIso"}


def test_geometry_matches_cells_after_simplification(result):
    for (col, row), f in zip(DEFAULT_SET, result["fc"]["features"]):
        cell = box(X0 + col * CELL, Y0 + row * CELL, X0 + (col + 1) * CELL, Y0 + (row + 1) * CELL)
        g = shape(f["geometry"])
        assert f["geometry"]["type"] == "Polygon" and g.is_valid
        # a closed ring keeps its start vertex (one zigzag node, about 2 m off the edge)
        assert g.symmetric_difference(cell).area < 0.005 * cell.area
        ring = f["geometry"]["coordinates"][0]
        assert signed_area(ring) > 0, "outer ring counter-clockwise (RFC 7946)"
        assert len(ring) <= 6, f"zigzag (below simplify_m) should be gone: {len(ring)}"
    assert max_decimals(result["fc"]) <= 5


def test_shared_edge_identical_no_gap_no_overlap(result):
    a, b = (shape(f["geometry"]) for f in result["fc"]["features"][1:])
    assert a.intersection(b).area == 0
    shared = a.boundary.intersection(b.boundary)
    assert abs(shared.length - CELL) < 1e-9, shared
    union = a.union(b)
    assert union.geom_type == "Polygon" and not union.interiors
    assert abs(union.area - (a.area + b.area)) < 1e-15


def test_build_is_deterministic_and_check_detects_drift(result):
    args, path = result["args"], result["path"]
    before = path.read_bytes()
    assert main(["build", *args]) == 0 and path.read_bytes() == before
    assert main(["build", "--check", *args]) == 0
    path.write_bytes(before.replace(b"13.", b"13.0", 1))
    assert main(["build", "--check", *args]) == 1
    path.unlink()
    assert main(["build", "--check", *args]) == 1
    assert main(["build", *args]) == 0 and path.read_bytes() == before


def test_extract_check(result, launch_osm):
    assert main(["extract", "--check", "--osm", str(launch_osm), *result["args"]]) == 0


def test_errors_stop_the_build(launch_osm, tmp_path_factory):
    ok = [district_id(0, 0)]
    missing = _run(tmp_path_factory.mktemp("missing"), launch_osm, ok + [8999])
    assert missing["extract"] == 1
    outside = _run(tmp_path_factory.mktemp("outside"), launch_osm, ok + [OUTSIDE_ID])
    assert outside["extract"] == 1
    small = _run(tmp_path_factory.mktemp("small"), launch_osm, ok,
                 edit=lambda bp: bp["launchArea"].update(maxFileBytes=100))
    assert small["extract"] == 0 and small["build"] == 1 and small["fc"] is None


def test_source_and_params_must_agree(result, tmp_path_factory):
    base = tmp_path_factory.mktemp("mismatch")
    args = _setup(base, [district_id(0, 0), district_id(1, 0)])
    (base / "source.geojson").write_bytes(Path(result["args"][5]).read_bytes())
    assert main(["build", *args]) == 1
