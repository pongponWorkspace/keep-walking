"""P1-F01-T06 analysis: raster reader, walk graph, Dijkstra, snapping.

Synthetic inputs only (no download). Case table: test_print_analysis_case_table
in test_analysis_metrics.py.
"""

from __future__ import annotations

import json
import random

import numpy as np
import pytest

from analysis.graph import (
    WalkGraph, build_graph, components, is_walkable, multi_source_dijkstra,
    read_walk_and_transit, transit_kind,
)
from analysis.raster import RasterError, lzw_decode, read_window
from analysis.run import snap
from pipeline.config import TOOL_DIR, load_config
from pipeline.geom import Projector

from .analysis_fixtures import lzw_encode, write_geotiff

ACFG = json.loads((TOOL_DIR / "analysis" / "launch-score.config.json").read_text(encoding="utf-8"))
CFG = load_config()
PROJ = Projector.for_crs(CFG.pipeline["projectedCrs"])


# ------------------------------------------------------------------ raster
@pytest.mark.parametrize("n,clear_every", [(0, None), (1, None), (3000, None), (120000, None), (5000, 37)])
def test_lzw_round_trip(n, clear_every):
    rng = random.Random(n)
    data = bytes(rng.getrandbits(8) if rng.random() < 0.6 else 9 for _ in range(n))
    assert lzw_decode(lzw_encode(data, clear_every)) == data


@pytest.mark.parametrize("compression,predictor", [(5, 2), (5, 1), (8, 2), (1, 1)])
def test_read_window_matches_written_grid(tmp_path, compression, predictor):
    rng = np.random.default_rng(7)
    vals = rng.random((37, 45)).astype("<f4") * 50
    vals[3, 4] = -99999.0  # nodata -> 0
    path = tmp_path / "pop.tif"
    path.write_bytes(write_geotiff(vals, 100.0, 14.0, 0.01, 16, compression, predictor))
    g = read_window(path, 100.055, 13.705, 100.295, 13.945)
    # cells intersecting the box: cols 5..29, rows 5..29
    assert g.values.shape == (25, 25)
    assert g.lon0 == pytest.approx(100.05) and g.lat0 == pytest.approx(13.95)
    expect = vals[5:30, 5:30].astype(np.float64)
    assert np.allclose(g.values, expect)
    full = read_window(path, 99.0, 13.0, 101.0, 15.0)
    assert full.values[3, 4] == 0.0
    assert full.values.sum() == pytest.approx(float(vals[vals > 0].astype(np.float64).sum()), rel=1e-6)


def test_read_window_outside_raises(tmp_path):
    path = tmp_path / "pop.tif"
    path.write_bytes(write_geotiff(np.ones((4, 4), "<f4"), 100.0, 14.0, 0.01, 16))
    with pytest.raises(RasterError):
        read_window(path, 90.0, 10.0, 91.0, 11.0)


# ------------------------------------------------------------------ dijkstra
def _graph(n: int, edges: list[tuple[int, int, float]]) -> WalkGraph:
    src = [a for a, b, _ in edges] + [b for a, b, _ in edges]
    dst = [b for a, b, _ in edges] + [a for a, b, _ in edges]
    w = [c for *_, c in edges] * 2
    order = np.lexsort((dst, src))
    src, dst, w = np.array(src)[order], np.array(dst)[order], np.array(w, float)[order]
    indptr = np.zeros(n + 1, np.int64)
    np.add.at(indptr, src + 1, 1)
    return WalkGraph(np.arange(n), np.zeros(n), np.zeros(n), np.cumsum(indptr), dst, w)


def _brute(n, edges, sources):
    """Independent reference: Floyd-Warshall, then min over sources."""
    d = np.full((n, n), np.inf)
    np.fill_diagonal(d, 0)
    for a, b, c in edges:
        d[a, b] = d[b, a] = min(d[a, b], c)
    for k in range(n):
        d = np.minimum(d, d[:, [k]] + d[[k], :])
    best = np.full(n, np.inf)
    for node, d0, _ in sources:
        best = np.minimum(best, d0 + d[node])
    return best


@pytest.mark.parametrize("seed", range(6))
def test_dijkstra_matches_floyd_warshall(seed):
    rng = random.Random(seed)
    n = 40
    edges = [(rng.randrange(n), rng.randrange(n), float(rng.randint(1, 30))) for _ in range(90)]
    edges = [e for e in edges if e[0] != e[1]]
    sources = [(rng.randrange(n), float(rng.randint(0, 5)), r) for r in range(4)]
    dist, owner = multi_source_dijkstra(_graph(n, edges), sources)
    assert np.allclose(dist, _brute(n, edges, sources))
    reach = np.isfinite(dist)
    assert ((owner >= 0) == reach).all()


def test_dijkstra_tie_break_lower_rank_wins():
    # path 0 - 1 - 2 with sources at both ends: node 1 is 5 m from each.
    g = _graph(3, [(0, 1, 5.0), (1, 2, 5.0)])
    _, owner = multi_source_dijkstra(g, [(2, 0.0, 0), (0, 0.0, 1)])
    assert owner.tolist() == [1, 0, 0]
    _, owner = multi_source_dijkstra(g, [(0, 0.0, 0), (2, 0.0, 1)])
    assert owner.tolist() == [0, 0, 1]


def test_initial_distance_counts():
    g = _graph(2, [(0, 1, 10.0)])
    dist, owner = multi_source_dijkstra(g, [(0, 25.0, 0), (1, 0.0, 1)])
    assert dist.tolist() == [10.0, 0.0] and owner.tolist() == [1, 1]


def test_components_largest_first():
    g = _graph(6, [(0, 1, 1.0), (2, 3, 1.0), (3, 4, 1.0)])
    comp = components(g)
    assert comp.tolist() == [1, 1, 0, 0, 0, 2]


# ------------------------------------------------------------------ graph from OSM
def _osm_xml(nodes, ways) -> str:
    out = ["<?xml version='1.0' encoding='UTF-8'?>", "<osm version='0.6'>"]
    for nid, lon, lat, tags in nodes:
        t = "".join(f"<tag k='{k}' v='{v}'/>" for k, v in tags.items())
        out.append(f"<node id='{nid}' version='1' lat='{lat:.7f}' lon='{lon:.7f}'>{t}</node>")
    for wid, refs, tags in ways:
        nd = "".join(f"<nd ref='{r}'/>" for r in refs)
        t = "".join(f"<tag k='{k}' v='{v}'/>" for k, v in tags.items())
        out.append(f"<way id='{wid}' version='1'>{nd}{t}</way>")
    out.append("</osm>")
    return "\n".join(out)


WALK_CASES = [
    # (way id, tags, walkable)
    (1, {"highway": "footway"}, True),
    (2, {"highway": "motorway"}, False),
    (3, {"highway": "residential", "foot": "no"}, False),
    (4, {"highway": "service", "access": "private"}, False),
    (5, {"highway": "pedestrian", "access": "no", "foot": "yes"}, True),
    (6, {"highway": "trunk"}, False),
    (7, {"highway": "primary"}, True),
]


@pytest.mark.parametrize("wid,tags,walkable", WALK_CASES)
def test_is_walkable(wid, tags, walkable):
    assert is_walkable(tags, ACFG, CFG.cf["excludeAccessValues"]) is walkable


@pytest.mark.parametrize("tags,kind", [
    ({"railway": "station"}, "rail"),
    ({"public_transport": "station", "station": "subway"}, "rail"),
    ({"public_transport": "station", "amenity": "bus_station"}, "bus"),
    ({"highway": "bus_stop"}, "bus"),
    ({"amenity": "parking"}, None),
])
def test_transit_kind(tags, kind):
    assert transit_kind(tags, ACFG["transit"]) == kind


def test_read_walk_graph_from_osm_xml(tmp_path):
    lon0, lat0, step = 100.5, 13.75, 0.001
    nodes = [(i, lon0 + i * step, lat0, {}) for i in range(1, 10)]
    nodes += [(50, lon0 + 0.0045, lat0 + 0.0005, {"railway": "station"}),
              (51, lon0 + 0.0065, lat0 + 0.0005, {"highway": "bus_stop"}),
              (60, lon0 + 0.5, lat0 + 0.5, {"highway": "bus_stop"})]  # outside bbox
    ways = [(wid, [wid, wid + 1], tags) for wid, tags, _ in WALK_CASES]
    ways.append((20, [8, 9, 8], {"highway": "footway"}))  # parallel edge 8-9 twice
    path = tmp_path / "walk.osm.xml"
    path.write_text(_osm_xml(nodes, ways), encoding="utf-8")
    bbox = (lon0 - 0.01, lat0 - 0.01, lon0 + 0.02, lat0 + 0.01)
    ways_r, coords, transit, stats = read_walk_and_transit(path, bbox, ACFG, CFG.cf["excludeAccessValues"])
    kept = sorted(int(w[0]) for w in ways_r)
    assert kept == [wid for wid, _, ok in WALK_CASES if ok] + [8]
    assert [(t.id, t.kind) for t in transit] == [("osm-n50", "rail"), ("osm-n51", "bus")]
    g = build_graph(ways_r, coords, PROJ)
    assert g.n_edges == 4  # 1-2, 5-6, 7-8, 8-9 (the doubled 8-9 kept once)
    i8, i9 = np.searchsorted(g.node_ids, [8, 9])
    k = [j for j in range(g.indptr[i8], g.indptr[i8 + 1]) if g.indices[j] == i9]
    assert len(k) == 1 and g.weights[k[0]] == pytest.approx(108.0, abs=1.5)  # 0.001 deg lon at 13.75 N


def test_snap_tie_break_and_distance():
    g = WalkGraph(np.array([10, 11, 12]), np.array([0.0, 10.0, 0.0]), np.array([0.0, 0.0, 50.0]),
                  np.zeros(4, np.int64), np.zeros(0, np.int64), np.zeros(0))
    node, d = snap(g, np.array([0, 1, 2]), np.array([5.0, 0.0]), np.array([0.0, 49.0]))
    assert node.tolist() == [0, 2]  # (5,0) equidistant to nodes 0 and 1 -> lowest id
    assert d.tolist() == [5.0, 1.0]
    node, _ = snap(g, np.array([1, 2]), np.array([5.0]), np.array([0.0]))
    assert node.tolist() == [1]  # pool restricts candidates (main component only)
