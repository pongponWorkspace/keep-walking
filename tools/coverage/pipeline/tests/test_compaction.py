"""Compaction of the committed excluded.geojson (GAP-04, P1-X08).

Lossless tiers run first; every dropped property must be rebuildable from
what stays in the feature, coverage_meta, or the boundaries output.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.config import REPO_ROOT, load_config
from pipeline.geom import size_band
from pipeline.output import COMPACTION_TIERS, DERIVED_PROPERTIES, EMPTY_OMITTABLE, compact_feature

from .conftest import load_features

CFG = load_config()
LOSSLESS = list(COMPACTION_TIERS[:COMPACTION_TIERS.index("drop_derived_properties") + 1])
COMMITTED_HEADROOM = 0.20  # P1-X08 acceptance: at least 20% under the CI guard


def _rebuild(props: dict, meta: dict, districts: dict[int, dict]) -> dict:
    """Inverse of omit_empty_values + drop_derived_properties."""
    out = dict(props)
    for key in EMPTY_OMITTABLE:
        out.setdefault(key, {} if key == "related_ids" else [])
    d = districts.get(out["district_osm_id"])
    out["district"] = d["district"] if d else None
    out["district_en"] = d["district_en"] if d else None
    out["province"] = d["province"] if d else None
    ver = meta["config"]["verification"]
    out["verification_mode"], out["floor_level"] = ver["v1VerificationMode"], ver["v1FloorLevel"]
    kind, num = out["id"][4], int(out["id"][5:])
    out["osm_type"] = {"w": "way", "r": "relation"}[kind]
    out["osm_id"] = num
    tags = out["tags"]
    out["name"] = tags.get("name:th") or tags.get("name")
    out["name_en"] = tags.get("name:en")
    out["opening_hours"] = tags.get("opening_hours")
    out["class"] = out["classes_all"][0]
    out["multi_district"] = "multi_district" in out["flags"]
    out["size_band"] = size_band(out["area_m2"], meta["config"]["coverageFilter"]["sizeBandUpper_m2"])
    return out


@pytest.fixture(scope="module")
def full(baseline) -> tuple[dict, dict[str, dict], dict[int, dict]]:
    base = baseline["base"]
    fc = json.loads((base / "out/excluded-full.geojson").read_text(encoding="utf-8"))
    bnd = load_features(base / "out/boundaries.geojson")
    districts = {f["properties"]["district_osm_id"]: f["properties"] for f in bnd.values()}
    return fc["coverage_meta"], {f["id"]: f for f in fc["features"]}, districts


def test_tier_order_is_lossless_first():
    assert COMPACTION_TIERS[:3] == ("trim_tags", "omit_empty_values", "drop_derived_properties")
    assert COMPACTION_TIERS[3:] == ("point_geometry_area_only", "point_geometry_all")


def test_lossless_tiers_keep_geometry_and_rebuild_every_property(full, run_fixture):
    """Trimmed features (trim_tags) compacted with the lossless tiers rebuild
    to the trimmed full feature exactly, geometry untouched."""
    meta, feats, districts = full
    out = run_fixture("all-tiers", params_edit=lambda p: p["pipeline"].update(
        maxCommittedFileBytes=1), expect_code=3)  # forces every tier
    assert out["meta"]["excluded_compaction"] == list(COMPACTION_TIERS)
    keep = set(CFG.pipeline["excludedTrimTagKeys"])
    assert feats, "fixture must have excluded pieces"
    for fid, f in sorted(feats.items()):
        trimmed = dict(f["properties"])
        trimmed["tags"] = {k: v for k, v in trimmed["tags"].items() if k in keep}
        c = compact_feature({**f, "properties": trimmed}, LOSSLESS)
        assert c["geometry"] == f["geometry"], fid
        assert not set(DERIVED_PROPERTIES) & set(c["properties"]), fid
        assert _rebuild(c["properties"], meta, districts) == trimmed, fid


def test_multi_district_survives_as_flag(full):
    meta, feats, districts = full
    for f in feats.values():
        p = f["properties"]
        assert p["multi_district"] == ("multi_district" in p["flags"])


def test_no_compaction_when_full_fits(run_fixture):
    out = run_fixture("fits", params_edit=lambda p: p["pipeline"].update(
        maxCommittedFileBytes=50_000_000))
    base = out["base"]
    assert out["meta"]["excluded_compaction"] == []
    assert (base / "data/excluded.geojson").read_bytes() == \
        (base / "out/excluded-full.geojson").read_bytes()


def test_stops_at_first_tier_that_fits_and_never_touches_candidates(baseline, run_fixture):
    full_bytes = baseline["meta"]["output_bytes"]["excludedFull"]
    out = run_fixture("one-byte-under", params_edit=lambda p: p["pipeline"].update(
        maxCommittedFileBytes=full_bytes - 1), expect_code=3)
    applied = out["meta"]["excluded_compaction"]
    assert applied and applied == list(COMPACTION_TIERS[:len(applied)])
    assert out["meta"]["output_bytes"]["excluded"] <= full_bytes - 1
    # Only candidates (never compacted, larger than the fixture excluded) is over.
    assert set(out["meta"]["committed_files_over_limit"]) == {"candidates"}
    base, ref = out["base"], baseline["base"]
    # Features byte-identical; only the head differs (temp params path).
    body = [(b / "data/candidates.geojson").read_bytes().split(b"\n", 1)[1] for b in (base, ref)]
    assert body[0] == body[1]
    head = json.loads((base / "data/candidates.geojson").read_text(encoding="utf-8"))
    assert "excluded_compaction" not in head["coverage_meta"]


def test_committed_excluded_has_headroom_under_ci_guard():
    """GAP-04 guard on the committed file (skipped where data is not checked out)."""
    path = REPO_ROOT / "data/coverage/excluded.geojson"
    if not path.exists():
        pytest.skip("data/coverage/excluded.geojson not present")
    limit = int(CFG.pipeline["maxCommittedFileBytes"])
    assert path.stat().st_size <= limit * (1 - COMMITTED_HEADROOM)
    head = json.loads(Path(path).read_text(encoding="utf-8"))["coverage_meta"]
    tiers = head.get("excluded_compaction", {}).get("tiers", [])
    assert not set(tiers) & {"point_geometry_area_only", "point_geometry_all"}
