/**
 * The one `AssetRuntime` every screen shares (`docs/tech/asset-delivery.md` 6.1): fetches
 * `asset-manifest.json` once per session (before the first icon/font render, per spec), decides
 * the sprite scale once (`devicePixelRatio`, asset-pipeline 5), and reads `env.ts`'s existing build
 * profile for the `draft`/`placeholder` fallback gate (6.3) — no new env variable.
 */
import { ASSET_BASE_PATH, fetchAssetManifest, fetchManifestPart } from './manifest';
import type { RuntimeManifest, RuntimeManifestPart } from './manifest';
import { pickScale } from './icon';
import type { AssetRuntime } from './icon-dom';
import type { BuildProfile } from '../env';

/** The one part name `tools/art/pipeline.config.json#runtimeParts.parts` defines today
 * (P2-X24) — read back out of `manifest.parts[AVATAR_PART_NAME]`, never assembled into a path. */
export const AVATAR_PART_NAME = 'avatar';

export interface AssetRuntimeController extends AssetRuntime {
  /** Kicks off the one-time manifest fetch; safe to call once at boot. Never throws — a failed
   * fetch leaves `getManifest()` at `undefined` forever (§6.4 whole-app fallback). */
  load(): Promise<void>;
  /** The already-loaded avatar part, or `undefined` before `loadAvatarPart()` resolves (or on a
   * failed load, §6.4 — the caller falls back to the default avatar frame). */
  getAvatarPart(): RuntimeManifestPart | undefined;
  /** Fetches the lazy avatar part (asset-pipeline 7.2: "โหลดเมื่อจะวาดอวตารตัวแรก" — the caller
   * decides *when* that is; there is no avatar renderer yet, so nothing calls this today,
   * P2-X21). Safe to call more than once; a later call simply re-fetches. */
  loadAvatarPart(): Promise<void>;
}

export function createAssetRuntime(
  fetchImpl: typeof fetch,
  devicePixelRatio: number,
  buildProfile: BuildProfile,
): AssetRuntimeController {
  let manifest: RuntimeManifest | undefined;
  let avatarPart: RuntimeManifestPart | undefined;
  const basePath = ASSET_BASE_PATH;
  return {
    getManifest: () => manifest,
    basePath,
    scale: pickScale(devicePixelRatio),
    isProduction: buildProfile === 'playtest',
    async load() {
      manifest = await fetchAssetManifest(fetchImpl);
    },
    getAvatarPart: () => avatarPart,
    async loadAvatarPart() {
      avatarPart = await fetchManifestPart(
        fetchImpl,
        basePath,
        manifest?.parts?.[AVATAR_PART_NAME],
        manifest?.avatarRig ?? 1,
      );
    },
  };
}
