"""Self-contained heatmap: one HTML file that opens offline (no CDN, no tile
server) plus a PNG overview. Population is aggregated to blocks of
displayBlockCells x displayBlockCells source cells before drawing, and
candidates are public places (polygon rep_point), so no home or individual
location is shown."""

from __future__ import annotations

import base64
import functools
import html
import json
import math
import struct
import zlib
from pathlib import Path
from typing import Any

import numpy as np
from shapely.geometry import shape

# UI text and page layout live next to this module as data (BUG-F01-002):
# the Thai strings are str.format templates, the page is a str.format
# template with literal braces doubled.
_HERE = Path(__file__).resolve().parent
STRINGS_PATH = _HERE / "heatmap-strings.th.json"
TEMPLATE_PATH = _HERE / "heatmap-template.html"


@functools.lru_cache(maxsize=None)
def strings() -> dict[str, Any]:
    return json.loads(STRINGS_PATH.read_text(encoding="utf-8"))


@functools.lru_cache(maxsize=None)
def html_template() -> str:
    # newline="" keeps the file bytes as written (no newline translation).
    with TEMPLATE_PATH.open(encoding="utf-8", newline="") as fh:
        return fh.read()


def summary_lines(totals: dict[str, Any], not_counted: int, snap_m: Any) -> dict[str, str]:
    """totals_line and method_line shown under the page title."""
    s = strings()
    return {
        "totals_line": s["totals_line"].format(
            usable=totals["usable_dungeons"], not_counted=not_counted,
            districts_with=totals["districts_with_usable_dungeon"], districts=totals["districts"],
            green=totals["pop_share_green"], yellow=totals["pop_share_yellow"],
            red=totals["pop_share_red"]),
        "method_line": s["method_line"].format(snap_m=snap_m),
    }


# Display palette only (not a game value): ColorBrewer Blues, light -> dark,
# so the red "empty area" hatch stays readable on top of it.
PALETTE = np.array([
    [247, 251, 255], [222, 235, 247], [198, 219, 239], [158, 202, 225], [107, 174, 214],
    [66, 146, 198], [33, 113, 181], [8, 81, 156], [8, 48, 107], [3, 19, 60],
], dtype=np.float64)
HATCH_SCALE = 3  # red layer pixels per block, for the diagonal hatch
ZONE_RGBA = {0: (26, 152, 80, 150), 1: (254, 224, 139, 150), 2: (215, 48, 39, 190)}
PRESET_COLOR = {"largePark": "#00a651", "market": "#ff7f00", "pocketPark": "#b8e186"}


def png_bytes(rgba: np.ndarray) -> bytes:
    """Minimal PNG encoder (8-bit RGBA, filter 0)."""
    h, w, _ = rgba.shape
    raw = b"".join(b"\x00" + rgba[r].astype(np.uint8).tobytes() for r in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def block_layers(grid, cells: dict[str, np.ndarray], block: int, cell_km2: np.ndarray):
    """Aggregate cells to blocks. Returns (population density per km2 per
    block, dominant zone per block by population or -1)."""
    rows, cols = grid.values.shape
    bh, bw = math.ceil(rows / block), math.ceil(cols / block)
    br, bc = cells["row"] // block, cells["col"] // block
    pop = np.zeros((bh, bw))
    area = np.zeros((bh, bw))
    np.add.at(pop, (br, bc), cells["pop"])
    np.add.at(area, (br, bc), cell_km2[cells["row"]])
    zpop = np.zeros((3, bh, bw))
    for z in range(3):
        m = cells["zone"] == z
        np.add.at(zpop[z], (br[m], bc[m]), cells["pop"][m])
    dens = np.divide(pop, area, out=np.zeros_like(pop), where=area > 0)
    zone = np.where(pop > 0, np.argmax(zpop, axis=0), -1)
    return dens, zone


def density_rgba(dens: np.ndarray) -> tuple[np.ndarray, list[float]]:
    pos = dens[dens > 0]
    rgba = np.zeros(dens.shape + (4,))
    if pos.size == 0:
        return rgba, []
    lo, hi = np.log10(np.quantile(pos, 0.02)), np.log10(np.quantile(pos, 0.99))
    t = np.clip((np.log10(np.where(dens > 0, dens, 1)) - lo) / max(hi - lo, 1e-9), 0, 1)
    idx = t * (len(PALETTE) - 1)
    i0 = np.floor(idx).astype(int)
    i1 = np.minimum(i0 + 1, len(PALETTE) - 1)
    frac = (idx - i0)[..., None]
    rgba[..., :3] = PALETTE[i0] * (1 - frac) + PALETTE[i1] * frac
    rgba[..., 3] = np.where(dens > 0, 210, 0)
    ticks = [round(10 ** (lo + (hi - lo) * k / 4)) for k in range(5)]
    return rgba, ticks


def zone_rgba(zone: np.ndarray) -> np.ndarray:
    rgba = np.zeros(zone.shape + (4,))
    for z, color in ZONE_RGBA.items():
        rgba[zone == z] = color
    return rgba


def red_hatch_rgba(zone: np.ndarray) -> np.ndarray:
    """Red zone only, as a diagonal hatch at HATCH_SCALE pixels per block."""
    big = np.kron((zone == 2).astype(np.uint8), np.ones((HATCH_SCALE, HATCH_SCALE), np.uint8))
    yy, xx = np.indices(big.shape)
    on = (big == 1) & ((xx + yy) % HATCH_SCALE == 0)
    rgba = np.zeros(big.shape + (4,))
    rgba[on] = (215, 25, 28, 255)
    rgba[(big == 1) & ~on] = (215, 25, 28, 40)
    return rgba


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def _path(geom, X, Y) -> str:
    parts = []
    polys = getattr(geom, "geoms", [geom])
    for poly in polys:
        for ring in [poly.exterior, *poly.interiors]:
            xy = np.asarray(ring.coords)
            pts = " ".join(f"{X(x):.1f},{Y(y):.1f}" for x, y in xy)
            parts.append(f"M{pts}Z")
    return " ".join(parts)


def build_html(grid, rows: list[dict[str, Any]], usable: list[dict[str, Any]],
               districts: list[dict[str, Any]], pop_png: bytes, zone_png: bytes, red_png: bytes,
               ticks: list[float], block: int, meta: dict[str, Any]) -> str:
    h_cells, w_cells = grid.values.shape
    lat_c = grid.lat0 - h_cells * grid.dy / 2
    k = math.cos(math.radians(lat_c))

    def X(lon: float) -> float:
        return (lon - grid.lon0) / grid.dx * k

    def Y(lat: float) -> float:
        return (grid.lat0 - lat) / grid.dy

    img_w = math.ceil(w_cells / block) * block * k
    img_h = math.ceil(h_cells / block) * block
    vb_w, vb_h = w_cells * k, h_cells
    row_by_id = {r["district_osm_id"]: r for r in rows}
    text = strings()
    d_svg = []
    for d in sorted(districts, key=lambda f: f["properties"]["district_osm_id"]):
        p = d["properties"]
        r = row_by_id[p["district_osm_id"]]
        geom = shape(d["geometry"]).simplify(grid.dx / 2, preserve_topology=True)
        empty = r["g2_valid_count_incl_multi"] == 0
        title = text["district_title"].format(
            district=p["district"], province=p["province"], count=r["valid_polygon_count"],
            green=_pct(r["g1_pop_share_green"]), red=_pct(r["g4_pop_share_red"]),
            score=r["launch_score"], rank=r["launch_rank"])
        cls = "d empty" if empty else "d"
        d_svg.append(f'<path class="{cls}" d="{_path(geom, X, Y)}"><title>{html.escape(title)}</title></path>')
    c_svg = []
    for f in usable:
        p = f["properties"]
        lon, lat = p["rep_point"]
        color = PRESET_COLOR.get(p["_preset"], "#000")
        title = text["candidate_title"].format(
            name=p.get("name") or text["no_name"], cls=p["class"], area=p["area_m2"], id=f["id"])
        c_svg.append(f'<circle cx="{X(lon):.1f}" cy="{Y(lat):.1f}" r="3.2" fill="{color}" stroke="#000" stroke-width="0.6">'
                     f'<title>{html.escape(title)}</title></circle>')
    table = _table(rows)
    legend_ticks = " · ".join(f"{t:,.0f}" for t in ticks)
    return html_template().format(
        vb_w=f"{vb_w:.1f}", vb_h=f"{vb_h:.1f}", img_w=f"{img_w:.1f}", img_h=img_h,
        pop_png=_b64(pop_png), zone_png=_b64(zone_png), red_png=_b64(red_png), districts="\n".join(d_svg),
        candidates="\n".join(c_svg), table=table, ticks=legend_ticks, block_m=block * 100,
        data_date=html.escape(str(meta.get("osm_data_date"))),
        totals=html.escape(meta.get("totals_line", "")),
        method=html.escape(meta.get("method_line", "")),
    )


def _pct(v: float | None) -> str:
    return "-" if v is None else f"{v * 100:.0f}%"


def _table(rows: list[dict[str, Any]]) -> str:
    head = "<tr>" + "".join(f"<th>{html.escape(h)}</th>" for h in strings()["table_head"]) + "</tr>"
    body = []
    for r in sorted(rows, key=lambda r: r["launch_rank"]):
        cls = ' class="empty"' if r["g2_valid_count_incl_multi"] == 0 else ""
        walk = "-" if r["walk_avg_m"] is None else f"{r['walk_avg_m']:,.0f}"
        body.append(
            f"<tr{cls}><td>{r['launch_rank']}</td><td>{html.escape(r['district'])}</td>"
            f"<td>{html.escape(r['province'])}</td><td>{r['g2_valid_count_incl_multi']}</td>"
            f"<td>{r['g3_preset_count_incl_multi']}/3</td><td>{_pct(r['g1_pop_share_green'])}</td>"
            f"<td>{_pct(r['s1_pop_share_green_yellow'])}</td><td>{_pct(r['g4_pop_share_red'])}</td>"
            f"<td>{walk}</td><td>{r['population']:,.0f}</td><td>{r['launch_score']:.3f}</td></tr>")
    return head + "\n".join(body)

