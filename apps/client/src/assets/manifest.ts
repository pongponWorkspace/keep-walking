/**
 * The client's own copy of `tools/art/out/client/asset-manifest.json`'s `RuntimeManifest` shape
 * (`docs/tech/asset-delivery.md` sections 5-6): fetched once per session, before the first
 * icon/font/audio is shown (`§6.1`). This module never imports anything from `tools/` (ESLint
 * `TOOLS_IMPORT_BAN`, the file is read as a static asset, never a module) and never assembles a
 * path from an id itself — every URL is `basePath + files[].url` verbatim, already carrying its
 * own `?v=` cache-buster.
 */

export interface RuntimeFile {
  readonly url: string;
  readonly format: string;
  readonly scale: 1 | 2 | null;
  readonly variant: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly bytes: number;
}

/** Matches `tools/art/src/manifest.ts`'s `ManifestEntry['sheet']` exactly (found to differ from
 * this file's own shape while wiring P2-X24's `parts`, tech-lead handoff): `cols`/`rows` are the
 * sheet's row/column *labels* (e.g. skin/hair variant ids), not counts — the actual grid size is
 * `cols.length` x `rows.length` frames of `frameW` x `frameH` each. */
export interface RuntimeAssetSheet {
  readonly frameW: number;
  readonly frameH: number;
  readonly cols: readonly string[];
  readonly rows: readonly string[];
  readonly frames?: number;
  readonly fps?: number;
}

/** Matches `ManifestEntry['variants']` (an axis + its value ids), not a bare list of ids. */
export interface RuntimeAssetVariants {
  readonly axis: 'skin' | 'hair';
  readonly values: readonly string[];
}

export interface RuntimeAsset {
  readonly kind: string;
  readonly status: string;
  readonly placeholder: boolean;
  readonly size: { readonly width: number; readonly height: number } | null;
  readonly layer?: string;
  readonly sheet?: RuntimeAssetSheet;
  readonly variants?: RuntimeAssetVariants;
  readonly replacedBy?: string;
  readonly files: readonly RuntimeFile[];
}

/** A lazily loaded part (P2-X24, asset-delivery.md 5.1/6.1): same `assets` shape as the main
 * manifest, staged separately (today only `avatar`) so the initial page load never pays for it. */
export interface RuntimeManifestPart {
  readonly runtimeVersion: 1;
  readonly avatarRig: 1;
  readonly assets: Readonly<Record<string, RuntimeAsset>>;
}

export interface RuntimePartRef {
  readonly url: string;
  readonly bytes: number;
}

export interface RuntimeFont {
  readonly id: string;
  readonly role: 'ui' | 'map';
  readonly family: string;
  readonly weight: number;
  readonly url: string;
  readonly format: string;
  readonly bytes: number;
}

export interface RuntimeAudioCue {
  readonly url: string;
  readonly [field: string]: unknown;
}

export interface RuntimeCredit {
  readonly attribution: string;
  readonly spdx: string;
  readonly holder: string;
}

export interface RuntimeManifest {
  readonly runtimeVersion: 1;
  readonly avatarRig: 1;
  readonly assets: Readonly<Record<string, RuntimeAsset>>;
  /** Part name -> versioned URL + byte size (P2-X24). Optional: additive, so a manifest fetched
   * before this field existed (or a hand-built test fixture) still parses. */
  readonly parts?: Readonly<Record<string, RuntimePartRef>>;
  readonly fonts: readonly RuntimeFont[];
  readonly audio: Readonly<Record<string, RuntimeAudioCue>>;
  readonly credits: readonly RuntimeCredit[];
}

/** `import.meta.env.BASE_URL + 'kw/'` (asset-delivery.md 6.1) — the one base every asset URL in
 * this module is resolved against, never hardcoded a second time at a call site. */
export const ASSET_BASE_PATH = `${import.meta.env.BASE_URL}kw/`;

function isRuntimeFile(v: unknown): v is RuntimeFile {
  if (typeof v !== 'object' || v === null) return false;
  const f = v as Record<string, unknown>;
  return typeof f['url'] === 'string' && typeof f['format'] === 'string';
}

function isRuntimeAsset(v: unknown): v is RuntimeAsset {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a['kind'] === 'string' &&
    typeof a['status'] === 'string' &&
    Array.isArray(a['files']) &&
    a['files'].every(isRuntimeFile)
  );
}

function isRuntimePartRef(v: unknown): v is RuntimePartRef {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p['url'] === 'string' && typeof p['bytes'] === 'number';
}

function isPartsRecord(v: unknown): v is Readonly<Record<string, RuntimePartRef>> {
  return typeof v === 'object' && v !== null && Object.values(v).every(isRuntimePartRef);
}

/** Structural guard only (ADR 0003 C1-4 style discipline: no Ajv outside tests/tools) — a
 * malformed manifest is treated the same as a failed fetch (`fetchAssetManifest` returns
 * `undefined`), never a crash. */
export function isRuntimeManifest(v: unknown): v is RuntimeManifest {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Record<string, unknown>;
  if (m['runtimeVersion'] !== 1) return false;
  if (typeof m['assets'] !== 'object' || m['assets'] === null) return false;
  if (!Array.isArray(m['fonts']) || !Array.isArray(m['credits'])) return false;
  if (typeof m['audio'] !== 'object' || m['audio'] === null) return false;
  if ('parts' in m && !isPartsRecord(m['parts'])) return false;
  return Object.values(m['assets'] as Record<string, unknown>).every(isRuntimeAsset);
}

export function isRuntimeManifestPart(v: unknown): v is RuntimeManifestPart {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  if (p['runtimeVersion'] !== 1) return false;
  if (typeof p['assets'] !== 'object' || p['assets'] === null) return false;
  return Object.values(p['assets'] as Record<string, unknown>).every(isRuntimeAsset);
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{ readonly ok: boolean; json(): Promise<unknown> }>;

/**
 * Fetches `<basePath>asset-manifest.json` once (asset-delivery.md 6.1: "โหลด kw/asset-manifest.
 * json ครั้งเดียวต่อ session"). `undefined` on any failure — network error, non-2xx, malformed
 * JSON, wrong `runtimeVersion` — is the caller's cue to run the whole-app fallback (6.4): empty
 * icon frames, the fallback font stack, no audio. Never throws.
 */
export async function fetchAssetManifest(
  fetchImpl: FetchLike,
  basePath: string = ASSET_BASE_PATH,
): Promise<RuntimeManifest | undefined> {
  try {
    const res = await fetchImpl(`${basePath}asset-manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return undefined;
    const json: unknown = await res.json();
    return isRuntimeManifest(json) ? json : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Loads one lazy part (asset-delivery.md 5.1/6.1: "part avatar โหลดเมื่อจะวาดอวตารตัวแรก"). Takes
 * the main manifest's own `parts[name]` ref and `avatarRig` directly (never re-derives a path from
 * a bare part name) and returns `undefined` on any failure — missing `parts[name]`, network error,
 * malformed JSON, or a `runtimeVersion`/`avatarRig` mismatch against the main manifest (`§6.4`:
 * "part avatar โหลดไม่ได้ / runtimeVersion หรือ avatarRig ไม่ตรง / ไม่มี parts.avatar → แสดงโครง
 * อวตารตั้งต้น"). The client has no avatar renderer yet (P2-X21); this loader is the contract ahead
 * of that build.
 */
export async function fetchManifestPart(
  fetchImpl: FetchLike,
  basePath: string,
  part: RuntimePartRef | undefined,
  expectedAvatarRig: 1,
): Promise<RuntimeManifestPart | undefined> {
  if (part === undefined) return undefined;
  try {
    const res = await fetchImpl(`${basePath}${part.url}`);
    if (!res.ok) return undefined;
    const json: unknown = await res.json();
    if (!isRuntimeManifestPart(json)) return undefined;
    return json.avatarRig === expectedAvatarRig ? json : undefined;
  } catch {
    return undefined;
  }
}
