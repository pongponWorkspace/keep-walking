"""Walk graph from the local OSM extract (D1) and multi-source Dijkstra.

PRD F01 8.1 (P1-H08): network routing on OSM walkways, local and free. The
graph is read with pyosmium (already pinned for the pipeline) in one pass;
shortest paths use a plain binary-heap Dijkstra over a CSR adjacency (stdlib
heapq), so no extra dependency is needed on CI. Walking ignores oneway.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import osmium

from pipeline.osm_read import _open
from pipeline.tags import matching_specs, parse_spec

EB = osmium.osm.osm_entity_bits


@dataclass
class WalkGraph:
    node_ids: np.ndarray  # OSM node id per graph index (sorted ascending)
    x: np.ndarray  # projected coordinates (m)
    y: np.ndarray
    indptr: np.ndarray  # CSR, undirected (each edge stored both ways)
    indices: np.ndarray
    weights: np.ndarray  # metres
    stats: dict[str, Any] = field(default_factory=dict)

    @property
    def n_nodes(self) -> int:
        return len(self.node_ids)

    @property
    def n_edges(self) -> int:
        return len(self.indices) // 2


@dataclass
class TransitPoint:
    id: str
    kind: str  # "rail" | "bus"
    lon: float
    lat: float


def is_walkable(tags: dict[str, str], acfg: dict[str, Any], exclude_access: list[str]) -> bool:
    if tags.get("highway") not in acfg["walkHighways"]:
        return False
    foot = tags.get("foot")
    if foot in acfg["footNoValues"]:
        return False
    if tags.get("access") in exclude_access and foot not in acfg["footOverrideValues"]:
        return False
    return True


def transit_kind(tags: dict[str, str], tcfg: dict[str, Any]) -> str | None:
    """rail wins over bus unless a bus indicator is present (a bus station
    tagged public_transport=station is a bus station, not a rail station)."""
    if matching_specs(tags, tcfg["railTags"]) and not matching_specs(tags, tcfg["railExcludeIfTagged"]):
        return "rail"
    if matching_specs(tags, tcfg["busTags"]):
        return "bus"
    return None


def _tag_pairs(acfg: dict[str, Any]) -> list[tuple[str, str]]:
    pairs = [("highway", h) for h in acfg["walkHighways"]]
    for spec in acfg["transit"]["railTags"] + acfg["transit"]["busTags"]:
        key, value = parse_spec(spec)
        if value is None:
            raise ValueError(f"transit tags must be key=value, got {spec}")
        pairs.append((key, value))
    return sorted(set(pairs))


def read_walk_and_transit(
    path: Path, bbox: tuple[float, float, float, float], acfg: dict[str, Any],
    exclude_access: list[str],
) -> tuple[list[np.ndarray], dict[int, tuple[float, float]], list[TransitPoint], dict]:
    """One pass: walkable ways touching the bbox (first, middle or last node
    inside) and transit nodes/ways inside it."""
    w, s, e, n = bbox
    fp = (
        osmium.FileProcessor(_open(path), EB.NODE | EB.WAY)
        .with_locations()
        .with_filter(osmium.filter.TagFilter(*_tag_pairs(acfg)))
    )
    ways: list[np.ndarray] = []
    coords: dict[int, tuple[float, float]] = {}
    transit: list[TransitPoint] = []
    stats = {"ways_seen": 0, "ways_kept": 0, "ways_not_walkable": 0}

    def inside(lon: float, lat: float) -> bool:
        return w <= lon <= e and s <= lat <= n

    for o in fp:
        tags = dict(o.tags)
        if o.is_node():
            kind = transit_kind(tags, acfg["transit"])
            if kind and o.location.valid() and inside(o.location.lon, o.location.lat):
                transit.append(TransitPoint(f"osm-n{o.id}", kind, o.location.lon, o.location.lat))
            continue
        nodes = o.nodes
        if len(nodes) < 2:
            continue
        stats["ways_seen"] += 1
        probe = (nodes[0], nodes[len(nodes) // 2], nodes[-1])
        if not any(p.location.valid() and inside(p.lon, p.lat) for p in probe):
            continue
        kind = transit_kind(tags, acfg["transit"])
        if kind:
            locs = [(p.lon, p.lat) for p in nodes if p.location.valid()]
            if locs:
                lon, lat = (sum(c) / len(locs) for c in zip(*locs))
                transit.append(TransitPoint(f"osm-w{o.id}", kind, lon, lat))
        if not is_walkable(tags, acfg, exclude_access):
            stats["ways_not_walkable"] += 1
            continue
        refs = []
        for p in nodes:
            if p.location.valid():
                refs.append(p.ref)
                coords[p.ref] = (p.lon, p.lat)
        if len(refs) >= 2:
            ways.append(np.asarray(refs, dtype=np.int64))
            stats["ways_kept"] += 1
    transit.sort(key=lambda t: t.id)
    return ways, coords, transit, stats


def build_graph(ways: list[np.ndarray], coords: dict[int, tuple[float, float]], proj: Any) -> WalkGraph:
    """Nodes = every way node (no degree-2 contraction, so snapping sees the
    full geometry). Parallel edges keep the shortest. Undirected."""
    node_ids = np.array(sorted(coords), dtype=np.int64)
    lonlat = np.array([coords[i] for i in node_ids.tolist()], dtype=np.float64)
    if len(node_ids) == 0:
        empty = np.zeros(0)
        return WalkGraph(node_ids, empty, empty, np.zeros(1, np.int64), np.zeros(0, np.int64), empty)
    x, y = proj.fwd.transform(lonlat[:, 0], lonlat[:, 1])
    x, y = np.asarray(x), np.asarray(y)
    us, vs = [], []
    for refs in ways:
        idx = np.searchsorted(node_ids, refs)
        us.append(idx[:-1])
        vs.append(idx[1:])
    u = np.concatenate(us)
    v = np.concatenate(vs)
    keep = u != v
    u, v = u[keep], v[keep]
    a, b = np.minimum(u, v), np.maximum(u, v)
    length = np.hypot(x[a] - x[b], y[a] - y[b])
    order = np.lexsort((length, b, a))
    a, b, length = a[order], b[order], length[order]
    first = np.ones(len(a), dtype=bool)
    first[1:] = (a[1:] != a[:-1]) | (b[1:] != b[:-1])
    a, b, length = a[first], b[first], length[first]
    src = np.concatenate([a, b])
    dst = np.concatenate([b, a])
    wts = np.concatenate([length, length])
    order = np.lexsort((dst, src))
    src, dst, wts = src[order], dst[order], wts[order]
    indptr = np.zeros(len(node_ids) + 1, dtype=np.int64)
    np.add.at(indptr, src + 1, 1)
    indptr = np.cumsum(indptr)
    return WalkGraph(node_ids, x, y, indptr, dst.astype(np.int64), wts)


def components(g: WalkGraph) -> np.ndarray:
    """Component label per node; label 0 = largest, then by size desc, ties
    by lowest node index (deterministic)."""
    n = g.n_nodes
    label = [-1] * n
    indptr, indices = g.indptr.tolist(), g.indices.tolist()
    comp = 0
    sizes: list[tuple[int, int]] = []
    for start in range(n):
        if label[start] >= 0:
            continue
        stack = [start]
        label[start] = comp
        size = 0
        while stack:
            u = stack.pop()
            size += 1
            for k in range(indptr[u], indptr[u + 1]):
                v = indices[k]
                if label[v] < 0:
                    label[v] = comp
                    stack.append(v)
        sizes.append((size, comp))
        comp += 1
    rank = {c: r for r, (_, c) in enumerate(sorted(sizes, key=lambda t: (-t[0], t[1])))}
    return np.array([rank[c] for c in label], dtype=np.int64)


def multi_source_dijkstra(
    g: WalkGraph, sources: list[tuple[int, float, int]]
) -> tuple[np.ndarray, np.ndarray]:
    """sources: (node index, initial distance m, source rank). Returns
    (distance per node, winning source rank per node; inf / -1 if
    unreachable). Tie-break: equal distance -> lower source rank wins, so the
    result does not depend on heap order."""
    n = g.n_nodes
    dist = [float("inf")] * n
    owner = [-1] * n
    heap: list[tuple[float, int, int]] = []
    for node, d0, rank in sources:
        if (d0, rank) < (dist[node], owner[node] if owner[node] >= 0 else 1 << 62):
            dist[node], owner[node] = d0, rank
    for node in range(n):
        if owner[node] >= 0:
            heap.append((dist[node], owner[node], node))
    heapq.heapify(heap)
    indptr, indices, weights = g.indptr.tolist(), g.indices.tolist(), g.weights.tolist()
    done = [False] * n
    pop, push = heapq.heappop, heapq.heappush
    while heap:
        d, r, u = pop(heap)
        if done[u] or d != dist[u] or r != owner[u]:
            continue
        done[u] = True
        for k in range(indptr[u], indptr[u + 1]):
            v = indices[k]
            if done[v]:
                continue
            nd = d + weights[k]
            if nd < dist[v] or (nd == dist[v] and r < owner[v]):
                dist[v], owner[v] = nd, r
                push(heap, (nd, r, v))
    return np.array(dist), np.array(owner, dtype=np.int64)
