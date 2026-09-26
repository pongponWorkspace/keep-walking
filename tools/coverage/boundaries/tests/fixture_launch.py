"""Synthetic OSM XML for the launch-area tests (P2-H01).

One admin_level 4 province (3 x 2 cells) split into six admin_level 6
districts. Every cell edge is its own way, shared by the cells on either
side, and carries SUB intermediate nodes that zigzag by WIGGLE degrees
(about 2 m, below the 10 m simplification) so the tests can prove that a
shared edge is simplified once and identically for both districts.
Cell (col, row); district ids are DIST_BASE + 1 .. 6 in row order (row 0 = south).
"""

from __future__ import annotations

from xml.sax.saxutils import quoteattr

X0, Y0, CELL = 100.0, 13.0, 0.01
COLS, ROWS = 3, 2
SUB = 6
WIGGLE = 0.00002
PROVINCE_ID = 8000
DIST_BASE = 8000
OUTSIDE_ID = 8100  # a district east of the province (not inside TH-10)


def district_id(col: int, row: int) -> int:
    return DIST_BASE + row * COLS + col + 1


def district_name(rid: int) -> str:
    return f"เขตทดสอบ{rid - DIST_BASE}"


def build_fixture() -> str:
    nodes: dict[tuple[int, int], int] = {}
    coords: dict[int, tuple[float, float]] = {}
    ways: dict[tuple[tuple[int, int], tuple[int, int]], tuple[int, list[int]]] = {}

    def node(i: int, j: int) -> int:
        if (i, j) not in nodes:
            nid = len(coords) + 1
            nodes[(i, j)] = nid
            coords[nid] = (X0 + i * CELL, Y0 + j * CELL)
        return nodes[(i, j)]

    def edge(a: tuple[int, int], b: tuple[int, int]) -> int:
        key = (min(a, b), max(a, b))
        if key not in ways:
            (i0, j0), (i1, j1) = key
            refs = [node(i0, j0)]
            for k in range(1, SUB):
                t = k / SUB
                off = WIGGLE if k % 2 else -WIGGLE
                x = X0 + (i0 + (i1 - i0) * t) * CELL + (off if i0 == i1 else 0.0)
                y = Y0 + (j0 + (j1 - j0) * t) * CELL + (off if j0 == j1 else 0.0)
                nid = len(coords) + 1
                coords[nid] = (x, y)
                refs.append(nid)
            refs.append(node(i1, j1))
            ways[key] = (1000 + len(ways), refs)
        return ways[key][0]

    def ring(corners: list[tuple[int, int]]) -> list[int]:
        return [edge(corners[k], corners[(k + 1) % len(corners)]) for k in range(len(corners))]

    rels: list[tuple[int, list[int], dict[str, str]]] = []
    for row in range(ROWS):
        for col in range(COLS):
            rid = district_id(col, row)
            members = ring([(col, row), (col + 1, row), (col + 1, row + 1), (col, row + 1)])
            rels.append((rid, members, {
                "type": "boundary", "boundary": "administrative", "admin_level": "6",
                "name": district_name(rid), "name:th": district_name(rid),
                "name:en": f"Test District {rid - DIST_BASE}"}))
    outer = [(i, 0) for i in range(COLS)] + [(COLS, j) for j in range(ROWS)]
    outer += [(i, ROWS) for i in range(COLS, 0, -1)] + [(0, j) for j in range(ROWS, 0, -1)]
    rels.append((PROVINCE_ID, ring(outer), {
        "type": "boundary", "boundary": "administrative", "admin_level": "4",
        "ISO3166-2": "TH-10", "name": "จังหวัดทดสอบ"}))
    rels.append((OUTSIDE_ID, ring([(COLS, 0), (COLS + 1, 0), (COLS + 1, 1), (COLS, 1)]), {
        "type": "boundary", "boundary": "administrative", "admin_level": "6",
        "name": "เขตนอกจังหวัด"}))

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<osm version="0.6" generator="launch-area-fixture">']
    for nid, (x, y) in sorted(coords.items()):
        out.append(f'<node id="{nid}" version="1" lat="{y:.7f}" lon="{x:.7f}"/>')
    for wid, refs in sorted(ways.values()):
        out.append(f'<way id="{wid}" version="1">' + "".join(f'<nd ref="{r}"/>' for r in refs)
                   + '<tag k="boundary" v="administrative"/></way>')
    for rid, members, tags in rels:
        out.append(f'<relation id="{rid}" version="1">')
        out += [f'<member type="way" ref="{w}" role="outer"/>' for w in members]
        out += [f'<tag k={quoteattr(k)} v={quoteattr(v)}/>' for k, v in tags.items()]
        out.append("</relation>")
    out.append("</osm>")
    return "\n".join(out) + "\n"
