"""Shared helpers: write the synthetic fixture and run the real CLI on it."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import pytest

from boundaries.__main__ import DEFAULT_BOUNDARY_PARAMS, main
from pipeline.config import DEFAULT_PARAMS

from .fixture_osm import build_fixture, cells

REPO_ROOT = Path(__file__).resolve().parents[4]
DATA_MAP = REPO_ROOT / "data" / "map"


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def fixture_osm(tmp_path_factory) -> Path:
    path = tmp_path_factory.mktemp("osm") / "fixture.osm.xml"
    path.write_text(build_fixture(), encoding="utf-8")
    return path


def default_playable() -> list[int]:
    """South-west and south-middle cells (an L-free rectangle)."""
    return [cells()[0].rid, cells()[1].rid]


@pytest.fixture(scope="session")
def run_fixture(fixture_osm, tmp_path_factory) -> Callable[..., dict[str, Any]]:
    """run_fixture(name, playable=None, edit=None) -> {code, base, mask, provinces}.

    Uses the real params files with only the study area (and boundary-param
    edits) replaced, so the tests exercise the committed configuration."""

    def _run(name: str, playable: list[int] | None = None, edit=None,
             iso_override: dict[int, str] | None = None) -> dict[str, Any]:
        base = tmp_path_factory.mktemp(name)
        by_id = {c.rid: c for c in cells()}
        ids = default_playable() if playable is None else playable
        params = load(DEFAULT_PARAMS)
        params["pipeline"]["studyArea"]["provinces"] = [
            {"iso": (iso_override or {}).get(rid, by_id[rid].iso if rid in by_id else "TH-0"),
             "osmRelationId": rid, "expectedDistricts": 0}
            for rid in ids
        ]
        bparams = load(DEFAULT_BOUNDARY_PARAMS)
        bparams["provinces"]["expectedCount"] = len(cells())
        bparams["outputs"] = {"mask": "map/mask.geojson", "provinces": "map/provinces.geojson"}
        if edit:
            edit(bparams)
        p_path, b_path = base / "params.json", base / "bparams.json"
        p_path.write_text(json.dumps(params, ensure_ascii=False), encoding="utf-8")
        b_path.write_text(json.dumps(bparams, ensure_ascii=False), encoding="utf-8")
        code = main(["--osm", str(fixture_osm), "--params", str(p_path),
                     "--boundary-params", str(b_path), "--out-base", str(base)])
        out: dict[str, Any] = {"code": code, "base": base, "params": bparams}
        for key, rel in bparams["outputs"].items():
            path = base / rel
            out[key] = load(path) if path.exists() else None
            out[f"{key}_bytes"] = path.read_bytes() if path.exists() else None
        return out

    return _run


@pytest.fixture(scope="session")
def baseline(run_fixture) -> dict[str, Any]:
    result = run_fixture("baseline")
    assert result["code"] == 0
    return result
