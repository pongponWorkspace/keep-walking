"""Synthetic OSM XML: a 3 x 3 grid of admin_level 4 provinces plus one
neighbouring-country province, so tests run offline in well under a second.

Cell (col, row) is a CELL-degree square; province ids are 9001..9009 in row
order (row 0 = south). Every grid edge is its own way, shared by the two
cells on either side, like real OSM boundary ways.
"""

from __future__ import annotations

from dataclasses import dataclass
from xml.sax.saxutils import quoteattr

X0, Y0, CELL = 100.0, 13.0, 0.1
N = 3  # cells per side
FOREIGN_ID = 9100
BASE_ID = 9000


@dataclass(frozen=True)
class Cell:
    rid: int
    col: int
    row: int
    iso: str
    name: str  # OSM name tag (with the "จังหวัด" prefix)


def cells() -> list[Cell]:
    out = []
    for row in range(N):
        for col in range(N):
            k = row * N + col + 1
            out.append(Cell(BASE_ID + k, col, row, f"TH-9{k}", f"จังหวัดทดสอบ{k}"))
    return out


def _node_id(i: int, j: int) -> int:
    return 1 + j * (N + 2) + i  # grid index i (x), j (y); one spare column east


def build_fixture() -> str:
    nodes: dict[int, tuple[float, float]] = {}
    for j in range(N + 1):
        for i in range(N + 2):
            nodes[_node_id(i, j)] = (X0 + i * CELL, Y0 + j * CELL)
    ways: dict[int, tuple[int, int]] = {}
    wid = 100

    def edge(a: int, b: int) -> int:
        nonlocal wid
        key = (min(a, b), max(a, b))
        for w, nd in ways.items():
            if nd == key:
                return w
        wid += 1
        ways[wid] = key
        return wid

    def ring_ways(i0: int, j0: int) -> list[int]:
        c = [_node_id(i0, j0), _node_id(i0 + 1, j0), _node_id(i0 + 1, j0 + 1),
             _node_id(i0, j0 + 1)]
        return [edge(c[k], c[(k + 1) % 4]) for k in range(4)]

    rels: list[tuple[int, list[int], dict[str, str]]] = []
    for c in cells():
        tags = {"type": "boundary", "boundary": "administrative", "admin_level": "4",
                "ISO3166-2": c.iso, "name": c.name, "name:th": c.name}
        rels.append((c.rid, ring_ways(c.col, c.row), tags))
    # Neighbouring country east of the middle row: must be ignored.
    rels.append((FOREIGN_ID, ring_ways(N, 1), {
        "type": "boundary", "boundary": "administrative", "admin_level": "4",
        "ISO3166-2": "LA-XX", "name": "แขวงทดสอบ"}))

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<osm version="0.6" generator="boundaries-fixture">']
    for nid, (x, y) in sorted(nodes.items()):
        out.append(f'<node id="{nid}" version="1" lat="{y:.7f}" lon="{x:.7f}"/>')
    for w, (a, b) in sorted(ways.items()):
        out.append(f'<way id="{w}" version="1"><nd ref="{a}"/><nd ref="{b}"/>'
                   '<tag k="boundary" v="administrative"/></way>')
    for rid, members, tags in rels:
        out.append(f'<relation id="{rid}" version="1">')
        out += [f'<member type="way" ref="{w}" role="outer"/>' for w in members]
        out += [f'<tag k={quoteattr(k)} v={quoteattr(v)}/>' for k, v in tags.items()]
        out.append("</relation>")
    out.append("</osm>")
    return "\n".join(out) + "\n"


def unique_edge_count() -> int:
    """Grid edges inside the 3 x 3 Thai grid (the foreign cell adds none)."""
    return 2 * N * (N + 1)
