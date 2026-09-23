"""Synthetic inputs for the P1-F01-T06 analysis tests (no download, no OSM
extract): a TIFF LZW encoder + GeoTIFF writer, and small graphs."""

from __future__ import annotations

import struct
import zlib

import numpy as np


def lzw_encode(data: bytes, clear_every: int | None = None) -> bytes:
    """TIFF LZW encoder (MSB first, early change), independent of the decoder
    under test. clear_every forces extra clear codes to test table resets."""
    out_bits: list[tuple[int, int]] = []
    table = {bytes([i]): i for i in range(256)}
    next_code, width = 258, 9
    out_bits.append((256, width))
    w = b""
    emitted = 0
    for byte in data:
        wc = w + bytes([byte])
        if wc in table:
            w = wc
            continue
        out_bits.append((table[w], width))
        emitted += 1
        table[wc] = next_code
        next_code += 1
        if next_code >= (1 << width) and width < 12:
            width += 1
        w = bytes([byte])
        if next_code >= 4093 or (clear_every and emitted % clear_every == 0):
            out_bits.append((256, width))
            table = {bytes([i]): i for i in range(256)}
            next_code, width = 258, 9
    if w:
        out_bits.append((table[w], width))
        next_code += 1
        if next_code >= (1 << width) and width < 12:
            width += 1
    out_bits.append((257, width))
    acc, nbits, buf = 0, 0, bytearray()
    for code, wd in out_bits:
        acc = (acc << wd) | code
        nbits += wd
        while nbits >= 8:
            nbits -= 8
            buf.append((acc >> nbits) & 0xFF)
        acc &= (1 << nbits) - 1
    if nbits:
        buf.append((acc << (8 - nbits)) & 0xFF)
    return bytes(buf)


def write_geotiff(values: np.ndarray, lon0: float, lat0: float, dx: float, tile: int,
                  compression: int = 5, predictor: int = 2, nodata: float = -99999.0) -> bytes:
    """Classic little-endian tiled GeoTIFF, one float32 band."""
    h, w = values.shape
    across, down = -(-w // tile), -(-h // tile)
    blocks = []
    for br in range(down):
        for bc in range(across):
            blk = np.full((tile, tile), nodata, dtype="<f4")
            part = values[br * tile:(br + 1) * tile, bc * tile:(bc + 1) * tile]
            blk[:part.shape[0], :part.shape[1]] = part
            if predictor == 2:
                ints = blk.view("<u4")
                diff = ints.copy()
                diff[:, 1:] = ints[:, 1:] - ints[:, :-1]
                blk = diff.view("<f4")
            raw = blk.tobytes()
            blocks.append(lzw_encode(raw) if compression == 5 else zlib.compress(raw) if compression == 8 else raw)
    nd = str(nodata).encode() + b"\0"
    tags = [  # (tag, type, values)
        (256, 3, [w]), (257, 3, [h]), (258, 3, [32]), (259, 3, [compression]), (262, 3, [1]),
        (277, 3, [1]), (284, 3, [1]), (317, 3, [predictor]), (322, 3, [tile]), (323, 3, [tile]),
        (324, 4, None), (325, 4, [len(b) for b in blocks]), (339, 3, [3]),
        (33550, 12, [dx, dx, 0.0]), (33922, 12, [0.0, 0.0, 0.0, lon0, lat0, 0.0]),
        (42113, 2, nd),
    ]
    fmt = {3: "H", 4: "I", 12: "d"}
    size = {3: 2, 4: 4, 12: 8, 2: 1}
    header = 8
    ifd_len = 2 + 12 * len(tags) + 4
    extra_off = header + ifd_len
    extras = bytearray()
    counts = {t: (len(v) if v is not None else len(blocks)) for t, _, v in tags}
    # Reserve the tile-offset array first so offsets are known afterwards.
    ext_pos = {}
    for t, typ, v in tags:
        n = counts[t] * size[typ]
        if n > 4:
            ext_pos[t] = extra_off + len(extras)
            extras += b"\0" * n
    data_off = extra_off + len(extras)
    offsets, pos = [], data_off
    for b in blocks:
        offsets.append(pos)
        pos += len(b)
    ifd = bytearray(struct.pack("<H", len(tags)))
    for t, typ, v in sorted(tags, key=lambda x: x[0]):
        vals = offsets if t == 324 else v
        payload = vals if typ == 2 else struct.pack("<" + fmt[typ] * len(vals), *vals)
        if len(payload) > 4:
            start = ext_pos[t] - extra_off
            extras[start:start + len(payload)] = payload
            ifd += struct.pack("<HHII", t, typ, counts[t], ext_pos[t])
        else:
            ifd += struct.pack("<HHI", t, typ, counts[t]) + payload.ljust(4, b"\0")
    ifd += struct.pack("<I", 0)
    return b"II*\0" + struct.pack("<I", header) + bytes(ifd) + bytes(extras) + b"".join(blocks)
