"""Shared helpers: build the synthetic fixture and run the real CLI on it."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any, Callable

import pytest

from pipeline.__main__ import main
from pipeline.config import DEFAULT_DUNGEONS, DEFAULT_PARAMS

from .fixture_osm import build_fixture


def load_features(path: Path) -> dict[str, dict]:
    with path.open(encoding="utf-8") as fh:
        fc = json.load(fh)
    return {f["id"]: f for f in fc["features"]}


def make_params(prov_id: int) -> dict[str, Any]:
    """Real params.json with the study area replaced by the fixture province."""
    params = json.loads(DEFAULT_PARAMS.read_text(encoding="utf-8"))
    params["pipeline"]["studyArea"]["provinces"] = [
        {"iso": "TH-10", "osmRelationId": prov_id, "expectedDistricts": 2}
    ]
    params["pipeline"]["outputs"] = {
        "candidates": "data/candidates.geojson",
        "excluded": "data/excluded.geojson",
        "excludedFull": "out/excluded-full.geojson",
        "pointsUnmatched": "out/points-unmatched.geojson",
        "runMeta": "out/run-meta.json",
        "boundaries": "out/boundaries.geojson",
    }
    return params


@pytest.fixture(scope="session")
def fixture_osm(tmp_path_factory) -> tuple[Path, dict, int]:
    xml, expected, prov = build_fixture()
    path = tmp_path_factory.mktemp("osm") / "fixture.osm.xml"
    path.write_text(xml, encoding="utf-8")
    return path, expected, prov


@pytest.fixture(scope="session")
def run_fixture(fixture_osm, tmp_path_factory) -> Callable[..., dict[str, Any]]:
    """run_fixture(name, params_edit=None, dungeons_edit=None, expect_code=0) -> outputs.

    Exit code 3 means a committed file is over maxCommittedFileBytes; the
    outputs are still written, so compaction tests pass expect_code=3."""
    osm_path, _, prov = fixture_osm

    def _run(name: str, params_edit=None, dungeons_edit=None, base=None,
             expect_code: int = 0) -> dict[str, Any]:
        base = base or tmp_path_factory.mktemp(name)
        params = make_params(prov)
        if params_edit:
            params_edit(params)
        dungeons = json.loads(DEFAULT_DUNGEONS.read_text(encoding="utf-8"))
        if dungeons_edit:
            dungeons = copy.deepcopy(dungeons)
            dungeons_edit(dungeons)
        p_path, d_path = base / "params.json", base / "dungeons.json"
        p_path.write_text(json.dumps(params, ensure_ascii=False), encoding="utf-8")
        d_path.write_text(json.dumps(dungeons, ensure_ascii=False), encoding="utf-8")
        code = main(["run", "--osm", str(osm_path), "--params", str(p_path),
                     "--dungeons", str(d_path), "--out-base", str(base)])
        assert code == expect_code, f"pipeline exit code {code}"
        return {
            "base": base,
            "candidates": load_features(base / "data/candidates.geojson"),
            "excluded": load_features(base / "data/excluded.geojson"),
            "points": load_features(base / "out/points-unmatched.geojson"),
            "meta": json.loads((base / "out/run-meta.json").read_text(encoding="utf-8")),
        }

    return _run


@pytest.fixture(scope="session")
def baseline(run_fixture) -> dict[str, Any]:
    return run_fixture("baseline")
