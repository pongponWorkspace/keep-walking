"""Config loading and config-driven behaviour (no magic numbers, METHOD 11)."""

from __future__ import annotations

import json

import pytest

from pipeline.config import DEFAULT_DUNGEONS, DEFAULT_PARAMS, ConfigError, load_config

from .fixture_osm import build_fixture

_, EXP, _ = build_fixture()


def _reason(out: dict, name: str) -> str | None:
    ref = EXP[name]["id"]
    if ref in out["candidates"]:
        return None
    return out["excluded"][ref]["properties"]["reason_excluded"]


def test_area_limits_come_from_dungeons_json():
    cfg = load_config()
    dungeons = json.loads(DEFAULT_DUNGEONS.read_text(encoding="utf-8"))
    assert cfg.min_area_m2 == dungeons["area"]["minArea_m2"]
    assert cfg.max_area_m2 == dungeons["area"]["maxArea_m2"]
    assert cfg.sources["area"] == "config/balance/dungeons.json#area"


def test_filter_comes_from_dungeons_json_only(tmp_path):
    """P1-H03: one source. params.json carries no coverageFilter."""
    cfg = load_config()
    assert cfg.sources["coverageFilter"] == "config/balance/dungeons.json#coverageFilter"
    params = json.loads(DEFAULT_PARAMS.read_text(encoding="utf-8"))
    assert "coverageFilter" not in params
    dungeons = json.loads(DEFAULT_DUNGEONS.read_text(encoding="utf-8"))
    dungeons.pop("coverageFilter")
    d = tmp_path / "dungeons.json"
    d.write_text(json.dumps(dungeons), encoding="utf-8")
    with pytest.raises(ConfigError):
        load_config(DEFAULT_PARAMS, d)


def test_filter_value_edit_is_used(tmp_path):
    dungeons = json.loads(DEFAULT_DUNGEONS.read_text(encoding="utf-8"))
    dungeons["coverageFilter"]["pointBlockerRadius_m"] = 7
    d = tmp_path / "dungeons.json"
    d.write_text(json.dumps(dungeons), encoding="utf-8")
    assert load_config(DEFAULT_PARAMS, d).cf["pointBlockerRadius_m"] == 7


@pytest.mark.parametrize("drop", ["coverageFilter.maxBlockedShare", "area.minArea_m2",
                                  "coverageFilter.partialOverlapShare",
                                  "verification.v1VerificationMode"])
def test_missing_key_stops_the_run(tmp_path, drop):
    """No defaults in code: a missing key raises instead of falling back."""
    dungeons = json.loads(DEFAULT_DUNGEONS.read_text(encoding="utf-8"))
    section, key = drop.split(".")
    dungeons[section].pop(key)
    d = tmp_path / "d.json"
    d.write_text(json.dumps(dungeons), encoding="utf-8")
    with pytest.raises(ConfigError):
        load_config(DEFAULT_PARAMS, d)


def test_religious_category_cannot_be_disabled(tmp_path):
    dungeons = json.loads(DEFAULT_DUNGEONS.read_text(encoding="utf-8"))
    dungeons["coverageFilter"]["blocklistDisabledCategories"] = ["religious"]
    d = tmp_path / "d.json"
    d.write_text(json.dumps(dungeons), encoding="utf-8")
    with pytest.raises(ConfigError):
        load_config(DEFAULT_PARAMS, d)


def test_changing_min_area_changes_result(run_fixture):
    out = run_fixture("minarea", dungeons_edit=lambda d: d["area"].update(minArea_m2=3020))
    assert _reason(out, "park_at_min") == "area_too_small"
    assert out["meta"]["config"]["area"]["minArea_m2"] == 3020


def test_changing_religious_share_changes_result(run_fixture):
    out = run_fixture("relshare", dungeons_edit=lambda d: d["coverageFilter"]["maxBlockedShare"]
                      .update(religious=0.1))
    assert _reason(out, "park_4k_pow_node") is None  # share 0.078 now passes
    assert _reason(out, "park_sala_400") is None      # share 0.05 now passes


def test_cemetery_switch_d026(run_fixture):
    out = run_fixture("nocem", dungeons_edit=lambda d: d["coverageFilter"]
                      ["blocklistDisabledCategories"].append("cemetery"))
    assert _reason(out, "park_in_cemetery") is None


def test_university_switch_d027(run_fixture):
    higher_ed = ["amenity=university", "amenity=college", "building=university",
                 "building=college"]
    out = run_fixture("nouni", dungeons_edit=lambda d: d["coverageFilter"]
                      ["blocklistDisabledTags"].extend(higher_ed))
    assert _reason(out, "pitch_in_university") is None
    assert _reason(out, "pitch_in_school") == "blocked_education"


def test_major_way_exclude_switch_d028(run_fixture):
    out = run_fixture("mwx", dungeons_edit=lambda d: d["coverageFilter"]
                      .update(majorWayAction="exclude"))
    assert _reason(out, "park_crossed_by_primary") == "crosses_major_way"
    assert _reason(out, "park_under_bridge") is None


def test_boundary_count_mismatch_stops(run_fixture):
    def edit(p):
        p["pipeline"]["studyArea"]["provinces"][0]["expectedDistricts"] = 3
    with pytest.raises(AssertionError, match="exit code 1"):
        run_fixture("badcount", params_edit=edit)
