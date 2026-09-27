/**
 * Icon file resolution by manifest id (`docs/tech/asset-delivery.md` 6.1, 6.3, 6.4): pure lookup
 * logic, no DOM — `ui/*` screens turn the result into an `<img>` (or an empty frame on a miss).
 * Never assembles a path from an id string itself; the URL is always `basePath + file.url`.
 */
import type { RuntimeAsset, RuntimeFile, RuntimeManifest } from './manifest';

/** `devicePixelRatio >= 1.5 -> scale 2, else scale 1` (asset-pipeline 5), decided once per session
 * by the caller (never re-decided per icon — same value every call in one page life). */
export function pickScale(devicePixelRatio: number): 1 | 2 {
  const HIGH_DPR_THRESHOLD = 1.5;
  return devicePixelRatio >= HIGH_DPR_THRESHOLD ? 2 : 1;
}

/** `status`/environment gating (6.3): `draft`/`placeholder` fall back in production; `deprecated`
 * always resolves through `replacedBy` instead of its own id. `approved` always shows. */
export function effectiveAssetId(
  manifest: RuntimeManifest,
  id: string,
  isProduction: boolean,
): string | undefined {
  const asset = manifest.assets[id];
  if (asset === undefined) return undefined;
  if (asset.status === 'deprecated') {
    return asset.replacedBy === undefined
      ? undefined
      : effectiveAssetId(manifest, asset.replacedBy, isProduction);
  }
  if (isProduction && (asset.status === 'draft' || asset.status === 'placeholder')) {
    return undefined;
  }
  return id;
}

function pickFile(asset: RuntimeAsset, scale: 1 | 2): RuntimeFile | undefined {
  return (
    asset.files.find((f) => f.scale === scale) ??
    asset.files.find((f) => f.scale === null) ??
    asset.files[0]
  );
}

export interface ResolvedIcon {
  readonly url: string;
  readonly format: string;
  readonly width: number | null;
  readonly height: number | null;
}

/** The file this session should show for `id` right now, or `undefined` on any miss (unknown id,
 * `prompt-only`/not shipped, empty `files[]`, or a `deprecated` chain with no live `replacedBy`) —
 * the caller falls back to `icon.ui.help`, per §6.4. */
export function resolveIconFile(
  manifest: RuntimeManifest,
  id: string,
  scale: 1 | 2,
  isProduction: boolean,
): ResolvedIcon | undefined {
  const effectiveId = effectiveAssetId(manifest, id, isProduction);
  if (effectiveId === undefined) return undefined;
  const asset = manifest.assets[effectiveId];
  if (asset === undefined) return undefined;
  const file = pickFile(asset, scale);
  if (file === undefined) return undefined;
  return { url: file.url, format: file.format, width: file.width, height: file.height };
}

export const FALLBACK_ICON_ID = 'icon.ui.help';

/**
 * `resolveIconFile(id)`, then `icon.ui.help`, then `undefined` (an empty frame, §6.4: "ถ้า
 * icon.ui.help เองก็ไม่มี ใช้กรอบว่าง"). `basePath` is prefixed onto the resolved file's own `url`
 * (already carrying `?v=`) — this is the only place apps/client turns an icon id into a real URL.
 */
export function resolveIconUrl(
  manifest: RuntimeManifest | undefined,
  basePath: string,
  id: string,
  scale: 1 | 2,
  isProduction: boolean,
): string | undefined {
  if (manifest === undefined) return undefined;
  const primary = resolveIconFile(manifest, id, scale, isProduction);
  if (primary !== undefined) return basePath + primary.url;
  if (id === FALLBACK_ICON_ID) return undefined;
  const fallback = resolveIconFile(manifest, FALLBACK_ICON_ID, scale, isProduction);
  return fallback === undefined ? undefined : basePath + fallback.url;
}
