// PNG encode (8-bit palette + tRNS, asset-pipeline 4.2 step 3) and decode (for V5, V8, V12).
// Pure Node (zlib). Only what the pipeline needs: bit depth 8, no interlace.
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from('\x89PNG\r\n\x1a\n', 'latin1');
const BIT_DEPTH = 8;
const COLOR_TYPE_RGB = 2;
const COLOR_TYPE_INDEXED = 3;
const COLOR_TYPE_RGBA = 6;
const RGB = 3;
const RGBA = 4;
const OPAQUE = 255;
const BYTE_MASK = 0xff;
const MAX_PALETTE = 256;
const IHDR_BYTES = 13;
const U32 = 4;
const CHUNK_OVERHEAD = 12;
const IHDR_COLOR_TYPE = 9;
const IHDR_INTERLACE = 12;
const CRC_POLY = 0xedb88320;
const CRC_INIT = 0xffffffff;
const CRC_BITS = 8;
const DEFLATE_LEVEL = 9;
const FILTER_NONE = 0;
const FILTER_SUB = 1;
const FILTER_UP = 2;
const FILTER_AVERAGE = 3;
const FILTER_PAETH = 4;

const CRC_TABLE = (() => {
  const table = new Uint32Array(MAX_PALETTE);
  for (let n = 0; n < MAX_PALETTE; n++) {
    let c = n;
    for (let k = 0; k < CRC_BITS; k++) c = c & 1 ? CRC_POLY ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = CRC_INIT;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & BYTE_MASK] ?? 0) ^ (c >>> CRC_BITS);
  return (c ^ CRC_INIT) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(CHUNK_OVERHEAD + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, U32, 'ascii');
  data.copy(out, U32 + U32);
  out.writeUInt32BE(crc32(out.subarray(U32, U32 + U32 + data.length)), U32 + U32 + data.length);
  return out;
}

export interface IndexedImage {
  width: number;
  height: number;
  /** RGBA per palette entry. */
  palette: Uint8Array;
  indices: Uint8Array;
}

/** Deterministic encoder: filter 0 on every row, zlib level 9. */
export function encodeIndexedPng(img: IndexedImage): Buffer {
  const count = img.palette.length / RGBA;
  if (count > MAX_PALETTE) throw new Error('png: palette over 256 entries');
  const ihdr = Buffer.alloc(IHDR_BYTES);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, U32);
  ihdr[U32 + U32] = BIT_DEPTH;
  ihdr[IHDR_COLOR_TYPE] = COLOR_TYPE_INDEXED;
  const plte = Buffer.alloc(count * RGB);
  const trns = Buffer.alloc(count);
  let lastTranslucent = -1;
  for (let i = 0; i < count; i++) {
    plte[i * RGB] = img.palette[i * RGBA] ?? 0;
    plte[i * RGB + 1] = img.palette[i * RGBA + 1] ?? 0;
    plte[i * RGB + 2] = img.palette[i * RGBA + 2] ?? 0;
    const alpha = img.palette[i * RGBA + RGB] ?? OPAQUE;
    trns[i] = alpha;
    if (alpha !== OPAQUE) lastTranslucent = i;
  }
  const raw = Buffer.alloc((img.width + 1) * img.height);
  for (let y = 0; y < img.height; y++) {
    raw[y * (img.width + 1)] = FILTER_NONE;
    raw.set(img.indices.subarray(y * img.width, (y + 1) * img.width), y * (img.width + 1) + 1);
  }
  const parts = [SIGNATURE, chunk('IHDR', ihdr), chunk('PLTE', plte)];
  if (lastTranslucent >= 0) parts.push(chunk('tRNS', trns.subarray(0, lastTranslucent + 1)));
  parts.push(chunk('IDAT', deflateSync(raw, { level: DEFLATE_LEVEL })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

export interface PngInfo {
  width: number;
  height: number;
  colorType: number;
  hasAlpha: boolean;
  paletteSize: number | null;
}

export interface DecodedPng extends PngInfo {
  /** RGBA, 4 bytes per pixel. */
  rgba: Uint8Array;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilter(data: Buffer, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = data[pos++] ?? 0;
    for (let x = 0; x < stride; x++) {
      const raw = data[pos++] ?? 0;
      const a = x >= bpp ? (out[y * stride + x - bpp] ?? 0) : 0;
      const b = y > 0 ? (out[(y - 1) * stride + x] ?? 0) : 0;
      const c = x >= bpp && y > 0 ? (out[(y - 1) * stride + x - bpp] ?? 0) : 0;
      let v = raw;
      if (filter === FILTER_SUB) v = raw + a;
      else if (filter === FILTER_UP) v = raw + b;
      else if (filter === FILTER_AVERAGE) v = raw + Math.floor((a + b) / 2);
      else if (filter === FILTER_PAETH) v = raw + paeth(a, b, c);
      out[y * stride + x] = v & BYTE_MASK;
    }
  }
  return out;
}

export function decodePng(buf: Buffer): DecodedPng {
  if (!buf.subarray(0, SIGNATURE.length).equals(SIGNATURE)) throw new Error('png: bad signature');
  let pos = SIGNATURE.length;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let palette: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + U32, pos + U32 + U32);
    const data = buf.subarray(pos + U32 + U32, pos + U32 + U32 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(U32);
      colorType = data[IHDR_COLOR_TYPE] ?? -1;
      if (data[U32 + U32] !== BIT_DEPTH || data[IHDR_INTERLACE] !== 0) {
        throw new Error('png: only 8-bit, non-interlaced images are supported');
      }
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    pos += CHUNK_OVERHEAD + len;
  }
  const bpp = colorType === COLOR_TYPE_RGBA ? RGBA : colorType === COLOR_TYPE_RGB ? RGB : 1;
  if (![COLOR_TYPE_RGB, COLOR_TYPE_INDEXED, COLOR_TYPE_RGBA].includes(colorType)) {
    throw new Error(`png: colour type ${colorType} not supported`);
  }
  const px = unfilter(inflateSync(Buffer.concat(idat)), width, height, bpp);
  const rgba = new Uint8Array(width * height * RGBA);
  for (let i = 0; i < width * height; i++) {
    if (colorType === COLOR_TYPE_INDEXED) {
      const idx = px[i] ?? 0;
      rgba[i * RGBA] = palette?.[idx * RGB] ?? 0;
      rgba[i * RGBA + 1] = palette?.[idx * RGB + 1] ?? 0;
      rgba[i * RGBA + 2] = palette?.[idx * RGB + 2] ?? 0;
      rgba[i * RGBA + RGB] = trns?.[idx] ?? OPAQUE;
    } else {
      for (let c = 0; c < RGB; c++) rgba[i * RGBA + c] = px[i * bpp + c] ?? 0;
      rgba[i * RGBA + RGB] = bpp === RGBA ? (px[i * bpp + RGB] ?? OPAQUE) : OPAQUE;
    }
  }
  const hasAlpha = colorType === COLOR_TYPE_RGBA || (colorType === COLOR_TYPE_INDEXED && trns !== null);
  const paletteSize = palette === null ? null : palette.length / RGB;
  return { width, height, colorType, hasAlpha, paletteSize, rgba };
}
