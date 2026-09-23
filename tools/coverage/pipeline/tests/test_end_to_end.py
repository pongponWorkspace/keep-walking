"""End-to-end on the synthetic OSM fixture through the real CLI."""

from __future__ import annotations

import hashlib

import pytest

from .fixture_osm import build_fixture

_, EXPECTED, _ = build_fixture()
CASES = sorted(k for k in EXPECTED if not k.startswith("_"))


def _find(out: dict, ref: str) -> tuple[str, dict] | tuple[None, None]:
    if ref in out["candidates"]:
        return "candidates", out["candidates"][ref]["properties"]
    if ref in out["excluded"]:
        return "excluded", out["excluded"][ref]["properties"]
    return None, None


@pytest.mark.parametrize("name", CASES)
def test_case_table(baseline, name):
    exp = EXPECTED[name]
    where, props = _find(baseline, exp["id"])
    assert where is not None, f"{name} ({exp['id']}) missing from outputs"
    actual_reason = props["reason_excluded"]
    assert actual_reason == exp["reason"], f"{name}: expected {exp['reason']}, got {actual_reason}"
    assert where == ("candidates" if exp["reason"] is None else "excluded")
    assert exp["flags"] <= set(props["flags"]), f"{name}: flags {props['flags']}"
    if exp["area"] is not None:
        assert props["area_m2"] == pytest.approx(exp["area"], abs=2.0)


def test_print_case_table(baseline, capsys):
    """Human-readable table: case -> expected -> actual (shown with pytest -s)."""
    rows = []
    for name in CASES:
        exp = EXPECTED[name]
        _, props = _find(baseline, exp["id"])
        actual = props["reason_excluded"] if props else "MISSING"
        flags = ",".join(sorted(set(props["flags"]) & (exp["flags"] | {"crosses_major_way"})))
        rows.append(f"| {name} | {exp['reason'] or 'candidate'} | {actual or 'candidate'} | {flags} |")
    with capsys.disabled():
        print("\n| case | expected | actual | flags |\n| --- | --- | --- | --- |")
        print("\n".join(rows))


def test_bridge_does_not_flag(baseline):
    props = baseline["candidates"][EXPECTED["park_under_bridge"]["id"]]["properties"]
    assert "crosses_major_way" not in props["flags"]


def test_hole_subtracted_and_multi_district(baseline):
    c = baseline["candidates"]
    assert c[EXPECTED["mp_with_hole"]["id"]]["properties"]["area_m2"] == pytest.approx(7500, abs=2)
    md = c[EXPECTED["park_multi_district"]["id"]]["properties"]
    assert md["multi_district"] is True and len(md["related_ids"]["districts"]) == 2


def test_related_ids(baseline):
    c, e = baseline["candidates"], baseline["excluded"]
    dup = e[EXPECTED["dup_way"]["id"]]["properties"]["related_ids"]
    assert dup["duplicate_of"] == EXPECTED["dup_relation"]["id"]
    nested = e[EXPECTED["nested_pitch"]["id"]]["properties"]["related_ids"]
    assert nested["nested_in"] == EXPECTED["nested_parent"]["id"]
    split = e[EXPECTED["split_parent"]["id"]]["properties"]["related_ids"]
    assert EXPECTED["split_child"]["id"] in split["split_children"]
    shrine = c[EXPECTED["park_20k_pow_node"]["id"]]["properties"]["related_ids"]
    assert shrine["blockers"]["religious"]["share"] == pytest.approx(0.0157, abs=0.001)


def test_points(baseline):
    poi = EXPECTED["_poi_inside"]
    parent = baseline["candidates"][poi["parent"]]["properties"]
    assert [p["id"] for p in parent["poi_inside"]] == [poi["id"]]
    points = baseline["points"]
    assert EXPECTED["_poi_alone"]["id"] in points
    assert EXPECTED["_poi_religious"]["id"] not in points
    assert poi["id"] not in points


def test_outside_study_area_absent(baseline):
    ref = EXPECTED["_outside"]["id"]
    assert ref not in baseline["candidates"] and ref not in baseline["excluded"]


def test_schema_and_meta(baseline):
    for f in baseline["candidates"].values():
        p = f["properties"]
        assert p["reason_excluded"] is None and p["reasons_all"] == []
        assert p["verification_mode"] == "continuous_gps" and p["floor_level"] is None
        assert p["district"] and p["province_iso"] == "TH-10"
    for f in baseline["excluded"].values():
        assert f["properties"]["reason_excluded"] is not None
    steps = baseline["meta"]["counts"]["steps"]
    assert [s["step"] for s in steps] == ["normalize", "area", "blocklist", "overlap"]
    for a, b in zip(steps, steps[1:]):
        assert a["out"] == b["in"]
    assert steps[-1]["out"] == len(baseline["candidates"])


def test_rerun_is_byte_identical(run_fixture):
    """METHOD 11: same inputs and config -> identical GeoJSON bytes."""
    rels = ("data/candidates.geojson", "data/excluded.geojson")
    first = run_fixture("rerun")
    h1 = {r: hashlib.sha256((first["base"] / r).read_bytes()).hexdigest() for r in rels}
    run_fixture("rerun", base=first["base"])
    h2 = {r: hashlib.sha256((first["base"] / r).read_bytes()).hexdigest() for r in rels}
    assert h1 == h2
