"""Runs the real CLI on the synthetic 3 x 3 grid (offline, no download)."""

from __future__ import annotations

from shapely.geometry import Point, Polygon, box

from .checks import check_labels_vs_mask, check_mask, check_provinces
from .fixture_osm import CELL, FOREIGN_ID, X0, Y0, cells, unique_edge_count


def _playable_isos(ids: list[int]) -> set[str]:
    return {c.iso for c in cells() if c.rid in ids}


def test_contract_on_fixture(baseline):
    p = baseline["params"]
    mask = check_mask(baseline["mask"], p["mask"]["outerRing"])
    playable = [cells()[0].rid, cells()[1].rid]
    _, labels = check_provinces(baseline["provinces"], len(cells()), _playable_isos(playable))
    check_labels_vs_mask(labels, mask)


def test_foreign_province_ignored_and_names_stripped(baseline):
    labels = [f for f in baseline["provinces"]["features"] if f["properties"]["kind"] == "label"]
    assert all(f["properties"]["iso"].startswith("TH-") for f in labels)
    assert {f["properties"]["name"] for f in labels} == {
        c.name.removeprefix("จังหวัด") for c in cells()}
    assert str(FOREIGN_ID) not in baseline["provinces_bytes"].decode()


def test_mask_hole_equals_playable_union(baseline):
    rings = baseline["mask"]["features"][0]["geometry"]["coordinates"]
    assert len(rings) == 2
    hole = box(X0, Y0, X0 + 2 * CELL, Y0 + CELL)
    got = Polygon(rings[1])
    assert got.symmetric_difference(hole).area < 1e-9


def test_shared_edges_drawn_once(baseline):
    border = [f for f in baseline["provinces"]["features"]
              if f["properties"]["kind"] == "border"][0]
    total = sum(
        sum(abs(x1 - x0) + abs(y1 - y0) for (x0, y0), (x1, y1) in zip(line, line[1:]))
        for line in border["geometry"]["coordinates"]
    )
    assert abs(total - unique_edge_count() * CELL) < 1e-6


def test_labels_inside_their_cell(baseline):
    by_iso = {c.iso: c for c in cells()}
    for f in baseline["provinces"]["features"]:
        if f["properties"]["kind"] != "label":
            continue
        c = by_iso[f["properties"]["iso"]]
        cell = box(X0 + c.col * CELL, Y0 + c.row * CELL,
                   X0 + (c.col + 1) * CELL, Y0 + (c.row + 1) * CELL)
        assert cell.contains(Point(f["geometry"]["coordinates"]))


def test_playable_follows_params(run_fixture):
    ids = [c.rid for c in cells() if c.col == 2]  # east column
    result = run_fixture("east-column", playable=ids)
    assert result["code"] == 0
    mask = check_mask(result["mask"], result["params"]["mask"]["outerRing"])
    _, labels = check_provinces(result["provinces"], len(cells()), _playable_isos(ids))
    check_labels_vs_mask(labels, mask)


def test_two_separate_play_areas_give_two_holes(run_fixture):
    ids = [cells()[0].rid, cells()[8].rid]  # opposite corners, touching at no edge
    result = run_fixture("two-holes", playable=ids)
    assert result["code"] == 0
    assert len(result["mask"]["features"][0]["geometry"]["coordinates"]) == 3


def test_rerun_is_byte_identical(run_fixture, baseline):
    again = run_fixture("again")
    assert again["mask_bytes"] == baseline["mask_bytes"]
    assert again["provinces_bytes"] == baseline["provinces_bytes"]


def test_enclave_stops_the_build(run_fixture):
    ids = [c.rid for c in cells() if (c.col, c.row) != (1, 1)]
    result = run_fixture("enclave", playable=ids)
    assert result["code"] == 1 and result["mask"] is None


def test_unknown_playable_relation_stops(run_fixture):
    result = run_fixture("missing", playable=[cells()[0].rid, 424242])
    assert result["code"] == 1 and result["mask"] is None


def test_iso_mismatch_stops(run_fixture):
    rid = cells()[0].rid
    result = run_fixture("iso", playable=[rid], iso_override={rid: "TH-99"})
    assert result["code"] == 1


def test_expected_count_mismatch_stops(run_fixture):
    def edit(bp):
        bp["provinces"]["expectedCount"] = 77

    assert run_fixture("count", edit=edit)["code"] == 1


def test_size_limit_stops_before_writing(run_fixture):
    def edit(bp):
        bp["maxFileBytes"] = 1000

    result = run_fixture("size", edit=edit)
    assert result["code"] == 1
    assert result["mask"] is None and result["provinces"] is None
