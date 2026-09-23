"""QA gaps GAP-01 and GAP-02 (qa/plans/F01-test-plan.md section 8, P1-X08).

GAP-01: area limits at exactly 2,999 / 3,000 / 150,000 / 150,001 m2, plus a
        run with the limits set to the measured areas (area == limit).
GAP-02: blocker as an inner ring, overlap below partialOverlapShare,
        geometry that needs make_valid, and assembly_failed.
"""

from __future__ import annotations

import json
import math

import pytest
from shapely.geometry import Polygon, shape

from pipeline.boundaries import build_study_area
from pipeline.config import DEFAULT_DUNGEONS, load_config
from pipeline.geom import Projector
from pipeline.osm_read import RawArea, read_osm
from pipeline.output import piece_feature
from pipeline.process import Piece, compute_area, extract, normalize

from .conftest import make_params
from .fixture_osm import BOUNDARY_TOL_M2, ORIGIN_X, ORIGIN_Y, build_fixture

_, EXP, _ = build_fixture()
CFG = load_config()
PROJ = Projector.for_crs(CFG.pipeline["projectedCrs"])
BOUNDARY = {"park_too_small": 2999.0, "park_at_min": 3000.0,
            "park_at_max": 150000.0, "park_too_large": 150001.0}


def _props(out: dict, ref: str) -> tuple[str, dict]:
    for where in ("candidates", "excluded"):
        if ref in out[where]:
            return where, out[where][ref]["properties"]
    raise AssertionError(f"{ref} missing from outputs")


@pytest.fixture(scope="module")
def measured(fixture_osm, tmp_path_factory) -> dict[str, float]:
    """Unrounded areas exactly as the pipeline computes them (steps 1-5)."""
    osm_path, _, prov = fixture_osm
    p = tmp_path_factory.mktemp("measure") / "params.json"
    p.write_text(json.dumps(make_params(prov), ensure_ascii=False), encoding="utf-8")
    cfg = load_config(p, DEFAULT_DUNGEONS)
    data = read_osm(osm_path, cfg.cf, cfg.pipeline)
    study = build_study_area(data.areas, cfg.pipeline, PROJ)
    pieces, _, _, _ = extract(data, study, PROJ, cfg.cf)
    normalize(pieces, cfg.cf)
    compute_area(pieces, cfg)
    return {piece.id: piece.area_m2 for piece in pieces}


# ---------------------------------------------------------------- GAP-01
@pytest.mark.parametrize("name", sorted(BOUNDARY))
def test_boundary_fixture_is_at_the_exact_value(baseline, measured, name):
    """AREA-01..04: stored area within BOUNDARY_TOL_M2 of the QA value, on the right side."""
    target, ref = BOUNDARY[name], EXP[name]["id"]
    area = measured[ref]
    assert abs(area - target) <= BOUNDARY_TOL_M2
    if name == "park_at_min":
        assert area >= CFG.min_area_m2 == target
    if name == "park_at_max":
        assert area <= CFG.max_area_m2 == target
    where, props = _props(baseline, ref)
    assert props["area_m2"] == target  # rounded to areaPrecision in the output
    assert props["reason_excluded"] == EXP[name]["reason"]
    assert where == ("candidates" if EXP[name]["reason"] is None else "excluded")


@pytest.mark.parametrize("name,key,nudge,expected", [
    ("park_at_min", "minArea_m2", 0, None),
    ("park_at_min", "minArea_m2", +1, "area_too_small"),
    ("park_at_max", "maxArea_m2", 0, None),
    ("park_at_max", "maxArea_m2", -1, "area_too_large"),
])
def test_area_equal_to_limit_is_inclusive(run_fixture, measured, name, key, nudge, expected):
    """Limit set to the measured float itself (area == limit), then one ulp past it."""
    ref = EXP[name]["id"]
    limit = measured[ref]
    if nudge:
        limit = math.nextafter(limit, math.inf if nudge > 0 else -math.inf)

    def edit(d):
        d["area"][key] = limit

    out = run_fixture(f"eq-{name}-{nudge}", dungeons_edit=edit)
    assert out["meta"]["config"]["area"][key] == limit
    _, props = _props(out, ref)
    assert props["reason_excluded"] == expected


# ---------------------------------------------------------------- GAP-02
# GEO-02: blocker drawn as the inner ring of a multipolygon.
def test_temple_as_inner_ring_is_still_checked(baseline):
    """The hole is subtracted from the park and the temple is still found and
    recorded by the blocklist step (METHOD 6.2), with share 0 because the
    temple lies outside the park footprint, so the park stays a candidate."""
    ref = EXP["park_temple_hole"]["id"]
    where, props = _props(baseline, ref)
    assert where == "candidates"
    assert props["area_m2"] == pytest.approx(150 * 150 - 50 * 50, abs=2)
    rel = props["related_ids"]["blockers"]["religious"]
    assert rel["ids"] == [EXP["_temple_hole_blocker"]["id"]]
    assert rel["share"] == 0.0
    assert "contains_religious_feature" not in props["flags"]
    # The temple itself is a blocker, never a candidate or an excluded piece.
    blocker = EXP["_temple_hole_blocker"]["id"]
    assert blocker not in baseline["candidates"] and blocker not in baseline["excluded"]


def test_temple_hole_in_heritage_piece_triggers_r2(baseline):
    """GEO-02 (fixed in P1-F01-T06): R2 tests the outer ring, so a temple in
    the hole of a tourism=attraction multipolygon excludes it (D-006)."""
    ref = EXP["_attraction_temple_hole"]["id"]
    where, props = _props(baseline, ref)
    assert where == "excluded"
    assert props["reason_excluded"] == EXP["_attraction_temple_hole"]["reason"]
    assert props["related_ids"]["religious_inside_heritage"].startswith("osm-w")


# GEO-07: a real overlap below partialOverlapShare is not an overlap.
def _proj_geom(out: dict, ref: str):
    where, _ = _props(out, ref)
    return PROJ.to_proj(shape(out[where][ref]["geometry"]))


def test_overlap_below_partial_share_is_ignored(baseline):
    a_ref, b_ref = EXP["touch_a"]["id"], EXP["touch_b"]["id"]
    a, b = _proj_geom(baseline, a_ref), _proj_geom(baseline, b_ref)
    share = a.intersection(b).area / min(a.area, b.area)
    assert share > 0, "the fixture must really overlap, not just touch"
    assert share == pytest.approx(EXP["_touch_share"]["value"], abs=0.002)
    assert share < CFG.cf["partialOverlapShare"]
    for ref in (a_ref, b_ref):
        where, props = _props(baseline, ref)
        assert where == "candidates"
        assert "overlaps_candidate" not in props["flags"]
        assert "overlaps" not in props["related_ids"]


def test_same_overlap_is_flagged_when_share_limit_is_lowered(run_fixture):
    """Control: the threshold, not the geometry, decides (0.015 < 0.02)."""
    def edit(d):
        d["coverageFilter"]["partialOverlapShare"] = 0.015

    out = run_fixture("touch-lowered", dungeons_edit=edit)
    a_ref, b_ref = EXP["touch_a"]["id"], EXP["touch_b"]["id"]
    for ref, other in ((a_ref, b_ref), (b_ref, a_ref)):
        where, props = _props(out, ref)
        assert where == "candidates"
        assert "overlaps_candidate" in props["flags"]
        assert props["related_ids"]["overlaps"] == [other]


# GEO-08: geometry that needs make_valid (METHOD 6.2). pyosmium already
# rejects self-intersecting rings at assembly (see GEO-11 below), so these
# shapes are fed to the normalize step directly, in projected metres near the
# fixture origin, exactly as extract() would hand them over.
def _looped_square(loop: float) -> Polygon:
    """100 x 100 m square whose last edge crosses the first one. The ring
    cuts a loop**2 / 8 m2 triangle off the corner and adds a reversed one of
    the same size below the bottom edge: make_valid gives 10,000 m2, the
    signed ring area is 10,000 - loop**2 / 4, so the change share is
    (loop**2 / 4) / (10,000 - loop**2 / 4): 0.0001 at 2 m, 0.0082 at 18 m,
    0.0101 at 20 m (just over the 0.01 default)."""
    x0, y0 = ORIGIN_X, ORIGIN_Y
    return Polygon([(x0, y0), (x0 + 100, y0), (x0 + 100, y0 + 100), (x0, y0 + 100),
                    (x0, y0 + loop / 2), (x0 + loop, y0 - loop / 2)])


def _bowtie() -> Polygon:
    x0, y0 = ORIGIN_X, ORIGIN_Y
    return Polygon([(x0, y0), (x0 + 100, y0 + 100), (x0 + 100, y0), (x0, y0 + 100)])


def _piece(geom_proj) -> Piece:
    raw = RawArea("way", 1, {"leisure": "park"}, PROJ.to_wgs(geom_proj), ["park"], [], None)
    return Piece(raw, geom_proj)


def _normalized(geom_proj, max_change: float | None = None) -> Piece:
    cf = dict(CFG.cf)
    if max_change is not None:
        cf["repairMaxAreaChangeShare"] = max_change
    piece = _piece(geom_proj)
    assert normalize([piece], cf) == {"repaired": 1}
    return piece


@pytest.mark.parametrize("loop", [2.0, 18.0])
def test_make_valid_repair_small_change_is_kept(loop):
    geom = _looped_square(loop)
    assert not geom.is_valid
    piece = _normalized(geom)
    change = piece.related["repair_area_change_share"]
    assert change == pytest.approx((loop ** 2 / 4) / (10000 - loop ** 2 / 4))
    assert 0 < change <= CFG.cf["repairMaxAreaChangeShare"]
    assert "invalid_geometry" not in piece.reasons
    assert piece.geom_proj.is_valid
    # The repaired shape (not the raw one) is what reaches the output.
    compute_area([piece], CFG)
    feature = piece_feature(piece, CFG, PROJ)
    assert shape(feature["geometry"]).is_valid
    assert piece.area_m2 == pytest.approx(10000.0, abs=1e-6)


def test_make_valid_change_above_limit_is_excluded():
    """20 m loop: change 0.0101 > 0.01 default. Same shape passes when the
    limit is raised to exactly its change (the comparison is change > limit)."""
    geom = _looped_square(20.0)
    piece = _normalized(geom)
    change = piece.related["repair_area_change_share"]
    assert change > CFG.cf["repairMaxAreaChangeShare"]
    assert "invalid_geometry" in piece.reasons
    assert "invalid_geometry" not in _normalized(geom, max_change=change).reasons
    assert piece.geom_proj.is_valid  # the repaired shape is kept for review


def test_bowtie_counts_as_full_change():
    """Signed ring area of a symmetric bowtie is 0, so the change is 1.0."""
    piece = _normalized(_bowtie())
    assert piece.related["repair_area_change_share"] == 1.0
    assert "invalid_geometry" in piece.reasons


def test_repaired_count_reaches_run_meta(baseline):
    """Real fixture has no invalid geometry after osmium: repaired is 0."""
    assert baseline["meta"]["counts"]["normalize"] == {"repaired": 0}


# GEO-11: assembly_failed (METHOD 6.2) is listed with osm ids, never silent.
def test_assembly_failed_lists_bowtie_and_open_relation(baseline):
    extract_counts = baseline["meta"]["counts"]["extract"]
    failed = extract_counts["assembly_failed"]
    for key in ("_assembly_bowtie", "_assembly_open_relation"):
        assert EXP[key]["id"] in failed
        assert EXP[key]["id"] not in baseline["candidates"]
        assert EXP[key]["id"] not in baseline["excluded"]
    assert extract_counts["assembly_failed_count"] == len(failed)
    assert failed == sorted(failed)


def test_unclosed_candidate_way_is_listed(baseline):
    """GEO-11 (fixed in P1-F01-T06): an unclosed way with a candidate tag is
    listed in assembly_failed, never dropped silently."""
    failed = baseline["meta"]["counts"]["extract"]["assembly_failed"]
    assert EXP["_unclosed_way"]["id"] in failed
    assert len(failed) == len(set(failed))


def test_open_member_way_of_candidate_relation_is_not_listed(fixture_osm):
    """The untagged open outer way of _assembly_open_relation is covered by
    the relation entry; tagged open members of a candidate relation too."""
    from pipeline.osm_read import unassembled_candidate_ways

    osm_path, _, _ = fixture_osm
    ids = unassembled_candidate_ways(osm_path, CFG.pipeline["candidateClasses"], set())
    assert int(EXP["_unclosed_way"]["id"][5:]) in ids
    assert int(EXP["_assembly_bowtie"]["id"][5:]) in ids  # closed, nothing assembled


# coverage_meta.config records only the keys the pipeline reads (P1-X08 item 3).
def test_meta_config_lists_only_keys_the_pipeline_reads(baseline):
    from pipeline.config import REQUIRED_FILTER_KEYS

    for name in ("candidates", "excluded"):
        path = baseline["base"] / "data" / f"{name}.geojson"
        meta = json.loads(path.read_text(encoding="utf-8"))["coverage_meta"]
        assert set(meta["config"]) == {"sources", "area", "verification", "coverageFilter"}
        assert list(meta["config"]["coverageFilter"]) == list(REQUIRED_FILTER_KEYS)
    cf = meta["config"]["coverageFilter"]
    for unread in ("walkGraphSnapMaxDistance_m", "walkRouteFactorFallbackMult",
                   "educationAllowOsmIds", "maxAspectRatio", "maxEntranceGap_m"):
        assert unread not in cf
