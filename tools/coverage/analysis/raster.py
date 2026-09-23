"""Minimal GeoTIFF window reader for the WorldPop population grid (D2).

No GDAL / rasterio: the file is one band of float32 in a north-up WGS84 grid,
tiled or striped, compressed with LZW (5), Deflate (8, 32946) or none (1),
predictor 1 (none) or 2 (horizontal). Classic TIFF and BigTIFF are both read.
Anything else raises RasterError instead of guessing.
"""

from __future__ import annotations

import struct
import zlib
from dataclasses import dataclass
from pathlib import Path

import numpy as np

TYPE_FMT = {1: "B", 2: "s", 3: "H", 4: "I", 5: "II", 11: "f", 12: "d", 16: "Q", 17: "q"}
TYPE_SIZE = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8, 16: 8, 17: 8}


class RasterError(Exception):
    """Unsupported or malformed raster."""


@dataclass
class Grid:
    """A north-up window: value[row, col] covers lon0 + col*dx .. +dx,
    lat0 - row*dy .. -dy (lon0/lat0 = top-left corner of the window)."""

    values: np.ndarray  # float64, nodata replaced by 0
    lon0: float
    lat0: float
    dx: float
    dy: float

    def centers(self) -> tuple[np.ndarray, np.ndarray]:
        rows, cols = self.values.shape
        lon = self.lon0 + (np.arange(cols) + 0.5) * self.dx
        lat = self.lat0 - (np.arange(rows) + 0.5) * self.dy
        return lon, lat


def _read_ifd(fh, bo: str) -> dict[int, tuple]:
    head = fh.read(16)
    big = struct.unpack(bo + "H", head[2:4])[0] == 43
    if big:
        off = struct.unpack(bo + "Q", head[8:16])[0]
    else:
        off = struct.unpack(bo + "I", head[4:8])[0]
    fh.seek(off)
    n = struct.unpack(bo + ("Q" if big else "H"), fh.read(8 if big else 2))[0]
    entry, inline = (20, 8) if big else (12, 4)
    tags: dict[int, tuple] = {}
    raw = fh.read(n * entry)
    for i in range(n):
        e = raw[i * entry:(i + 1) * entry]
        tag, typ = struct.unpack(bo + "HH", e[:4])
        cnt = struct.unpack(bo + ("Q" if big else "I"), e[4:12 if big else 8])[0]
        payload = e[12:] if big else e[8:]
        if typ not in TYPE_SIZE:
            continue
        size = TYPE_SIZE[typ] * cnt
        if size > inline:
            ptr = struct.unpack(bo + ("Q" if big else "I"), payload[:inline])[0]
            here = fh.tell()
            fh.seek(ptr)
            payload = fh.read(size)
            fh.seek(here)
        if typ == 2:
            tags[tag] = (payload[:size].rstrip(b"\0").decode("latin-1"),)
        else:
            fmt = TYPE_FMT[typ] * cnt if typ != 5 else "I" * (2 * cnt)
            tags[tag] = struct.unpack(bo + fmt, payload[:size])
    return tags


def lzw_decode(data: bytes) -> bytes:
    """TIFF LZW (MSB first, 9-12 bit codes, early change, 256 clear, 257 end)."""
    chunks: list[bytes] = []
    emit = chunks.append
    base = [bytes([i]) for i in range(256)] + [b"", b""]
    table = list(base)
    add = table.append
    width, mask, bump = 9, 511, 511
    nbits = buf = pos = 0
    n = len(data)
    prev = None
    while True:
        if nbits < width:
            if pos + 2 < n:
                buf = ((buf << 24) | (data[pos] << 16) | (data[pos + 1] << 8)
                       | data[pos + 2]) & 0xFFFFFFFFFF
                pos += 3
                nbits += 24
            elif pos < n:
                buf = ((buf << 8) | data[pos]) & 0xFFFFFFFFFF
                pos += 1
                nbits += 8
                continue
            else:
                break
        nbits -= width
        code = (buf >> nbits) & mask
        if code == 256:
            table = list(base)
            add = table.append
            width, mask, bump = 9, 511, 511
            prev = None
            continue
        if code == 257:
            break
        if prev is None:
            entry = table[code]
        elif code < len(table):
            entry = table[code]
            add(prev + entry[:1])
        else:
            entry = prev + prev[:1]
            add(entry)
        emit(entry)
        prev = entry
        if len(table) >= bump and width < 12:
            width += 1
            mask = (1 << width) - 1
            bump = mask
    return b"".join(chunks)


def _decode_block(raw: bytes, compression: int) -> bytes:
    if compression == 1:
        return raw
    if compression == 5:
        return lzw_decode(raw)
    if compression in (8, 32946):
        return zlib.decompress(raw)
    raise RasterError(f"unsupported TIFF compression {compression}")


def _undo_predictor(block: np.ndarray, predictor: int) -> np.ndarray:
    """block: (rows, cols) of the sample dtype, predictor from tag 317."""
    if predictor == 1:
        return block
    if predictor == 2:
        # Horizontal differencing on the integer view of each sample (libtiff).
        itype = {1: np.uint8, 2: np.uint16, 4: np.uint32, 8: np.uint64}[block.dtype.itemsize]
        ints = block.view(itype)
        return np.cumsum(ints, axis=1, dtype=itype).view(block.dtype)
    raise RasterError(f"unsupported TIFF predictor {predictor}")


def read_window(path: Path, west: float, south: float, east: float, north: float) -> Grid:
    """Cells whose extent intersects the lon/lat box, nodata -> 0."""
    with path.open("rb") as fh:
        order = fh.read(2)
        bo = {b"II": "<", b"MM": ">"}.get(order)
        if bo is None:
            raise RasterError("not a TIFF file")
        fh.seek(0)
        t = _read_ifd(fh, bo)
        width, height = t[256][0], t[257][0]
        bits, fmt = t[258][0], t.get(339, (1,))[0]
        if t.get(277, (1,))[0] != 1 or bits != 32 or fmt != 3:
            raise RasterError("expected one band of float32")
        compression, predictor = t.get(259, (1,))[0], t.get(317, (1,))[0]
        sx, sy = t[33550][0], t[33550][1]
        tie = t[33922]
        lon_tl, lat_tl = tie[3] - tie[0] * sx, tie[4] + tie[1] * sy
        nodata = float(t[42113][0]) if 42113 in t else None
        dtype = np.dtype(bo + "f4")
        if 322 in t:
            bw, bh = t[322][0], t[323][0]
            offsets, counts = t[324], t[325]
        else:
            bw, bh = width, t.get(278, (height,))[0]
            offsets, counts = t[273], t[279]
        c0 = max(0, int(np.floor((west - lon_tl) / sx)))
        c1 = min(width, int(np.ceil((east - lon_tl) / sx)))
        r0 = max(0, int(np.floor((lat_tl - north) / sy)))
        r1 = min(height, int(np.ceil((lat_tl - south) / sy)))
        if c0 >= c1 or r0 >= r1:
            raise RasterError("window outside the raster")
        out = np.zeros((r1 - r0, c1 - c0), dtype=np.float64)
        across = (width + bw - 1) // bw
        for br in range(r0 // bh, (r1 - 1) // bh + 1):
            for bc in range(c0 // bw, (c1 - 1) // bw + 1):
                idx = br * across + bc
                fh.seek(offsets[idx])
                raw = _decode_block(fh.read(counts[idx]), compression)
                rows = len(raw) // (bw * 4)
                block = np.frombuffer(raw[: rows * bw * 4], dtype=dtype).reshape(rows, bw)
                block = _undo_predictor(block.copy(), predictor).astype(np.float64)
                gr0, gc0 = br * bh, bc * bw
                rs, re_ = max(r0, gr0), min(r1, gr0 + rows)
                cs, ce = max(c0, gc0), min(c1, gc0 + bw)
                out[rs - r0:re_ - r0, cs - c0:ce - c0] = block[rs - gr0:re_ - gr0, cs - gc0:ce - gc0]
    bad = ~np.isfinite(out) | (out < 0)
    if nodata is not None:
        bad |= out == nodata
    out[bad] = 0.0
    return Grid(out, lon_tl + c0 * sx, lat_tl - r0 * sy, sx, sy)
