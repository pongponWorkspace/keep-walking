"""BUG-F01-001: health, government, military and diplomatic blocklist categories.

Mirrors the religious coverage: unit tests on BlockRules.categories() for every
tag spec in config, a guard that the GDD-required tags stay in config, and an
end-to-end run of the real CLI on fixture_blocklist.py.
"""

from __future__ import annotations

import json

import pytest

from pipeline.__main__ import main
from pipeline.config import DEFAULT_DUNGEONS, load_config
from pipeline.tags import BlockRules, parse_spec

from .conftest import load_features, make_params
from .fixture_blocklist import NODE_SHARE, build_blocklist_fixture

CFG = load_config()
RULES = BlockRules.from_filter(CFG.cf)
CATS = ("health", "government", "military", "diplomatic")
_, EXPECTED, _ = build_blocklist_fixture()
CASES = sorted(EXPECTED)

# GDD "สถานที่ที่ไม่ควรเป็น dungeon" / METHOD 7.1: tags that must stay listed.
REQUIRED = {
    "health": {"amenity=hospital", "healthcare=hospital", "building=hospital"},
    "government": {"office=government", "government=*", "amenity=townhall",
                   "landuse=government", "building=government"},
    "military": {"landuse=military", "military=*"},
    "diplomatic": {"office=diplomatic", "amenity=embassy", "diplomatic=*"},
}


def _spec_tags(spec: str) -> dict[str, str]:
    key, value = parse_spec(spec)
    return {key: value if value is not None else "anything"}


def _params() -> list[tuple[str, str]]:
    return [(cat, spec) for cat in CATS for spec in CFG.cf["blocklistTags"][cat]]


# ---------------------------------------------------------------- unit
@pytest.mark.parametrize("cat", CATS)
def test_required_tags_stay_in_config(cat):
    """Dropping one of these from dungeons.json must fail a test, not pass silently."""
    missing = REQUIRED[cat] - set(RULES.by_category.get(cat, ()))
    assert not missing, f"{cat}: missing {sorted(missing)}"


@pytest.mark.parametrize("cat", CATS)
def test_max_blocked_share_present(cat):
    assert 0 <= float(CFG.cf["maxBlockedShare"][cat]) < 1


@pytest.mark.parametrize("cat,spec", _params())
def test_every_spec_maps_to_its_category(cat, spec):
    """Each config spec, as an area, maps to exactly its own category."""
    assert RULES.categories(_spec_tags(spec), is_area=True) == [cat]


@pytest.mark.parametrize("cat,spec", _params())
def test_node_mapping_respects_area_only(cat, spec):
    expected = [] if spec in RULES.area_only else [cat]
    assert RULES.categories(_spec_tags(spec), is_area=False) == expected


def test_hospital_building_with_extra_tags():
    """A whole hospital drawn with several tags is still one category."""
    tags = {"amenity": "hospital", "healthcare": "hospital", "building": "hospital",
            "name": "โรงพยาบาลทดสอบ"}
    assert RULES.categories(tags, is_area=True) == ["health"]


def test_mixed_tags_give_every_category():
    tags = {"amenity": "embassy", "military": "barracks", "landuse": "government"}
    assert RULES.categories(tags, is_area=True) == ["diplomatic", "government", "military"]


# ---------------------------------------------------------------- end to end
@pytest.fixture(scope="module")
def block_run(tmp_path_factory) -> dict:
    xml, _, prov = build_blocklist_fixture()
    base = tmp_path_factory.mktemp("blocklist")
    osm = base / "fixture.osm.xml"
    osm.write_text(xml, encoding="utf-8")
    p_path = base / "params.json"
    p_path.write_text(json.dumps(make_params(prov), ensure_ascii=False), encoding="utf-8")
    code = main(["run", "--osm", str(osm), "--params", str(p_path),
                 "--dungeons", str(DEFAULT_DUNGEONS), "--out-base", str(base)])
    assert code == 0, f"pipeline exit code {code}"
    return {"candidates": load_features(base / "data/candidates.geojson"),
            "excluded": load_features(base / "data/excluded.geojson")}


def _find(out: dict, ref: str) -> tuple[str | None, dict | None]:
    for where in ("candidates", "excluded"):
        if ref in out[where]:
            return where, out[where][ref]["properties"]
    return None, None


@pytest.mark.parametrize("name", CASES)
def test_case_table(block_run, name):
    exp = EXPECTED[name]
    where, props = _find(block_run, exp["id"])
    assert where is not None, f"{name} ({exp['id']}) missing from outputs"
    assert props["reason_excluded"] == exp["reason"], \
        f"{name}: expected {exp['reason']}, got {props['reason_excluded']}"
    assert where == ("candidates" if exp["reason"] is None else "excluded")


def test_node_share_between_category_limits():
    """The node cases only prove the per-category limit if the share sits between them."""
    ms = CFG.cf["maxBlockedShare"]
    assert ms["military"] < NODE_SHARE and ms["diplomatic"] < NODE_SHARE
    assert NODE_SHARE <= ms["health"] and NODE_SHARE <= ms["government"]


def test_print_case_table(block_run, capsys):
    """Human-readable table: case -> expected -> actual (shown with pytest -s)."""
    rows = []
    for name in CASES:
        exp = EXPECTED[name]
        _, props = _find(block_run, exp["id"])
        actual = props["reason_excluded"] if props else "MISSING"
        rows.append(f"| {name} | {exp['reason'] or 'candidate'} | {actual or 'candidate'} |")
    with capsys.disabled():
        print("\n| case | expected | actual |\n| --- | --- | --- |")
        print("\n".join(rows))
