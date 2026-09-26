"""P2-F04-T03: D-083 id statuses (exclude / review / release), N-01 royal name
patterns and review flag tags (railway station, entry fee)."""

from __future__ import annotations

import copy
import dataclasses
import json

import pytest
from shapely.geometry import box

from pipeline.config import DEFAULT_DUNGEONS, DEFAULT_PARAMS, ConfigError, load_config
from pipeline.geom import Projector
from pipeline.osm_read import RawArea
from pipeline.process import Piece, apply_human_ids, blocklist, compute_area, resolve_overlaps
from pipeline.tags import compile_patterns

CFG = load_config()
PROJ = Projector.for_crs(CFG.pipeline["projectedCrs"])
X0, Y0 = 662000.0, 1520000.0  # UTM 47N near Bangkok


def _cfg(**over):
    cf = copy.deepcopy(CFG.cf)
    cf.update(over)
    return dataclasses.replace(CFG, cf=cf)


def _piece(osm_id: int, tags: dict, cls: str = "park", size: float = 80.0, dx: float = 0.0) -> Piece:
    geom = box(X0 + dx, Y0, X0 + dx + size, Y0 + size)
    return Piece(RawArea("way", osm_id, tags, PROJ.to_wgs(geom), [cls], [], None), geom)


def _run(pieces: list[Piece], cfg) -> dict[str, Piece]:
    patterns = {"religious": compile_patterns(cfg.cf["religiousNamePatterns"]),
                "review": compile_patterns(cfg.cf["reviewNamePatterns"])}
    compute_area(pieces, cfg)
    blocklist(pieces, [], [], cfg, patterns)
    resolve_overlaps(pieces, cfg)
    apply_human_ids(pieces, cfg)
    return {p.id: p for p in pieces}


def test_excluded_id_gets_its_own_reason():
    got = _run([_piece(10, {"leisure": "park", "name": "สนามทดสอบ"})], _cfg(excludeOsmIds=["osm-w10"]))
    assert got["osm-w10"].reason_excluded() == "excluded_osm_id"


def test_review_id_is_flagged_not_dropped():
    got = _run([_piece(11, {"leisure": "park"})], _cfg(reviewOsmIds=["osm-w11"]))["osm-w11"]
    assert got.reason_excluded() is None
    assert "review_required" in got.flags and got.related["review_reasons"] == ["review_osm_id"]


@pytest.mark.parametrize("osm_id,tags,cls,reason", [
    (12, {"amenity": "marketplace", "name": "ตลาด", "name:en": "Wat Test market"}, "marketplace",
     "religious_name"),  # like #9 ตลาดน้ำวัดไทร
    (13, {"leisure": "park", "name": "สวนสาธารณะ หมู่บ้านวังทอง"}, "park", "review_name"),  # like #11
])
def test_release_clears_automatic_review(osm_id, tags, cls, reason):
    fid = f"osm-w{osm_id}"
    before = _run([_piece(osm_id, tags, cls)], _cfg())[fid]
    assert "review_required" in before.flags and reason in before.related["review_reasons"]
    after = _run([_piece(osm_id, tags, cls)], _cfg(releaseOsmIds=[fid]))[fid]
    assert "review_required" not in after.flags and after.reason_excluded() is None
    assert reason in after.related["review_released"]


def test_release_never_clears_an_exclusion():
    tags = {"leisure": "park", "name": "สวนวังทดสอบ", "access": "private"}
    got = _run([_piece(14, tags)], _cfg(releaseOsmIds=["osm-w14"]))["osm-w14"]
    assert got.reason_excluded() == "access_private"


@pytest.mark.parametrize("word", ["เฉลิมพระเกียรติ", "ราชานุสรณ์", "ราชานุสาวรีย์", "พระบรม",
                                  "ราชอุทยาน", "สมเด็จ"])
def test_royal_words_flag_review(word):
    got = _run([_piece(15, {"leisure": "park", "name": f"สวน{word}ทดสอบ"})], _cfg())["osm-w15"]
    assert got.reason_excluded() is None
    assert "review_name" in got.related["review_reasons"] and "review_required" in got.flags


@pytest.mark.parametrize("tags,flag", [
    ({"leisure": "park", "building": "train_station"}, "railway_station"),
    ({"leisure": "park", "railway": "station"}, "railway_station"),
    ({"leisure": "park", "public_transport": "station"}, "railway_station"),
    ({"leisure": "garden", "fee": "yes"}, "fee_entry"),
    ({"leisure": "garden", "tourism": "museum"}, "fee_entry"),
])
def test_review_flag_tags(tags, flag):
    got = _run([_piece(16, tags)], _cfg())["osm-w16"]
    assert flag in got.flags and "review_required" in got.flags
    assert f"flag_{flag}" in got.related["review_reasons"]


def test_plain_park_gets_no_flag():
    got = _run([_piece(17, {"leisure": "park", "fee": "no", "name": "สวนทดสอบ"})], _cfg())["osm-w17"]
    assert got.flags == set() and got.reason_excluded() is None


def test_candidate_nested_in_excluded_id_is_flagged():
    """Excluded pieces never swallow others, so the nested one is flagged."""
    parent = _piece(20, {"leisure": "park"}, size=200.0)
    child = _piece(21, {"leisure": "garden"}, cls="garden", size=60.0, dx=20.0)
    got = _run([parent, child], _cfg(excludeOsmIds=["osm-w20"]))
    assert got["osm-w20"].reason_excluded() == "excluded_osm_id"
    assert got["osm-w21"].related["review_reasons"] == ["inside_excluded_osm_id"]
    assert got["osm-w21"].related["excluded_parent"] == ["osm-w20"]
    plain = _run([_piece(20, {"leisure": "park"}, size=200.0),
                  _piece(21, {"leisure": "garden"}, cls="garden", size=60.0, dx=20.0)], _cfg())
    assert plain["osm-w21"].reason_excluded() == "nested_in"


def _write(tmp_path, **over) -> "object":
    dungeons = json.loads(DEFAULT_DUNGEONS.read_text(encoding="utf-8"))
    dungeons["coverageFilter"].update(over)
    d = tmp_path / "dungeons.json"
    d.write_text(json.dumps(dungeons, ensure_ascii=False), encoding="utf-8")
    return d


@pytest.mark.parametrize("over", [
    {"reviewOsmIds": ["osm-w347586838"]},          # already in excludeOsmIds
    {"releaseOsmIds": ["osm-w23630232"]},          # already in excludeOsmIds
    {"excludeOsmIds": ["w123"]},                   # wrong form
    {"reviewOsmIds": "osm-w1"},                    # not a list
    {"reviewFlagTags": {"Railway": ["railway=station"]}},
    {"reviewFlagTags": {"fee_entry": []}},
    {"reviewFlagTags": ["fee=yes"]},
])
def test_bad_id_lists_stop_the_run(tmp_path, over):
    with pytest.raises(ConfigError):
        load_config(DEFAULT_PARAMS, _write(tmp_path, **over))


# D-083 (HUMAN 2026-09-25), numbering = design/levels/coverage-report.md section 6.
D083 = {
    "exclude": {1, 2, 3, 4, 5, 8, 12, 13, 14, 15, 16, 17, 20, 22, 23},
    "pending": {6, 7, 10, 18, 19, 21, 24, 25},
    "release": {9, 11},
}


def test_config_matches_d083():
    cf = CFG.cf
    notes = cf["_osmIdNotes"]
    lists = {"exclude": cf["excludeOsmIds"], "pending": cf["reviewOsmIds"], "release": cf["releaseOsmIds"]}
    for status, ids in lists.items():
        nums = set()
        for i in ids:
            words = notes[i].split()
            assert words[0] == "D-083" and words[1] == status, (i, notes[i])
            nums.add(int(words[2].lstrip("#")))
        assert nums == D083[status], status
        assert len(ids) == len(D083[status])
    assert set(notes) == set().union(*lists.values())
