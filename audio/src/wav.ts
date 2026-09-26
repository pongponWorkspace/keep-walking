// Minimal PCM WAV encoder (16-bit signed, mono). No third-party dependency: the whole file format
// is a small fixed header plus raw samples, so hand-rolling it keeps `audio/src/generate.ts` free
// of a new dependency (asset-delivery.md 8: "dependency ใหม่ต้อง handoff ถึง tech-lead").
// WAV/PCM was chosen over OGG (the earlier draft in cue-list.md) because Safari/iOS WebKit does not
// decode Ogg Vorbis but decodes PCM WAV everywhere (task brief: "a format the client plays
// everywhere incl. iOS Safari").

export interface PcmClip {
  /** Mono samples in [-1, 1]. Values outside that range are clamped, never wrapped. */
  samples: Float32Array;
  sampleRate: number;
}

const U32_BYTES = 4;
const U16_BYTES = 2;
const ASCII_TAG_BYTES = 4; // "RIFF", "WAVE", "fmt ", "data" are each 4 ASCII bytes
const AUDIO_FORMAT_PCM = 1;
const NUM_CHANNELS_MONO = 1;
const BITS_PER_SAMPLE = 16;
const BITS_PER_BYTE = 8;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / BITS_PER_BYTE;
const PCM_FMT_CHUNK_BYTES = 16; // fixed size of the "fmt " chunk body for uncompressed PCM
const INT16_MAX = 32767;
const INT16_MIN_MAGNITUDE = 32768;
// Canonical size of a PCM WAV header: 4 ASCII tags ("RIFF","WAVE","fmt ","data"), 4 u32 fields
// (RIFF size, fmt chunk size, sample rate, byte rate, data size — wait, that's 5; the fmt chunk
// size itself is counted below with the 4 u32s: RIFF size / fmt chunk size / sample rate / byte
// rate, and "data" size is the 5th... kept explicit below instead of by count, to stay honest.
const ASCII_TAG_COUNT = 4;
const U32_FIELD_COUNT = 5; // riffSize, fmtChunkSize, sampleRate, byteRate, dataSize
const U16_FIELD_COUNT = 4; // audioFormat, numChannels, blockAlign, bitsPerSample
const HEADER_BYTES = ASCII_TAG_COUNT * ASCII_TAG_BYTES + U32_FIELD_COUNT * U32_BYTES + U16_FIELD_COUNT * U16_BYTES;
const RIFF_SIZE_FIELD_BYTES = ASCII_TAG_BYTES + U32_BYTES; // "RIFF" tag + the size field itself

function clampSample(x: number): number {
  const CEILING = 1;
  const FLOOR = -1;
  if (x > CEILING) return CEILING;
  if (x < FLOOR) return FLOOR;
  return x;
}

/**
 * Tiny sequential byte writer so every field is placed right after the previous one — no
 * hardcoded offsets to keep in sync by hand.
 */
class ChunkWriter {
  private offset = 0;
  constructor(readonly buffer: Buffer) {}
  ascii(tag: string): void {
    this.buffer.write(tag, this.offset, 'ascii');
    this.offset += ASCII_TAG_BYTES;
  }
  u32(value: number): void {
    this.buffer.writeUInt32LE(value, this.offset);
    this.offset += U32_BYTES;
  }
  u16(value: number): void {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += U16_BYTES;
  }
  get position(): number {
    return this.offset;
  }
}

/** Encodes a mono Float32 buffer as a 16-bit PCM WAV file. Deterministic: same input, same bytes. */
export function encodeWavPcm16(clip: PcmClip): Buffer {
  const { samples, sampleRate } = clip;
  const blockAlign = NUM_CHANNELS_MONO * BYTES_PER_SAMPLE;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * BYTES_PER_SAMPLE;
  const buffer = Buffer.alloc(HEADER_BYTES + dataSize);
  const w = new ChunkWriter(buffer);

  w.ascii('RIFF');
  w.u32(HEADER_BYTES - RIFF_SIZE_FIELD_BYTES + dataSize); // total file size after this field
  w.ascii('WAVE');
  w.ascii('fmt ');
  w.u32(PCM_FMT_CHUNK_BYTES);
  w.u16(AUDIO_FORMAT_PCM);
  w.u16(NUM_CHANNELS_MONO);
  w.u32(sampleRate);
  w.u32(byteRate);
  w.u16(blockAlign);
  w.u16(BITS_PER_SAMPLE);
  w.ascii('data');
  w.u32(dataSize);

  let offset = w.position;
  for (let i = 0; i < samples.length; i++) {
    const s = clampSample(samples[i] ?? 0);
    // Round to nearest int16, matching the sign convention of PCM WAV.
    const int16 = s < 0 ? Math.round(s * INT16_MIN_MAGNITUDE) : Math.round(s * INT16_MAX);
    buffer.writeInt16LE(int16, offset);
    offset += BYTES_PER_SAMPLE;
  }
  return buffer;
}
