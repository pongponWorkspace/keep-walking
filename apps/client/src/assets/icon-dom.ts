/**
 * The one place `apps/client` turns a resolved icon URL into a real `<img>` (`docs/tech/
 * asset-delivery.md` 6.1, 6.4). Every screen module calls this instead of building an `<img>` by
 * hand, so the fallback rule (hide rather than show a broken image, asset-pipeline 10) is applied
 * exactly once.
 */
import { resolveIconUrl } from './icon';
import type { RuntimeManifest } from './manifest';

export interface AssetRuntime {
  /** A function, not a snapshot: the manifest may still be `undefined` when the first screen
   * mounts (fetch in flight) and arrive afterwards — every render reads the latest value. */
  readonly getManifest: () => RuntimeManifest | undefined;
  readonly basePath: string;
  readonly scale: 1 | 2;
  /** `env.ts`'s existing environment read (asset-delivery.md 6.3) — not a new env variable. */
  readonly isProduction: boolean;
}

/** Sets `img.src`/`alt` when `id` resolves, hides the element (never a broken-image icon or an
 * English `alt`, asset-pipeline 10) when it does not. Safe to call on every render. */
export function setIconImg(
  img: HTMLImageElement,
  runtime: AssetRuntime,
  id: string | undefined,
  altText: string,
): void {
  const manifest = runtime.getManifest();
  const url =
    id === undefined || manifest === undefined
      ? undefined
      : resolveIconUrl(manifest, runtime.basePath, id, runtime.scale, runtime.isProduction);
  if (url === undefined) {
    img.hidden = true;
    img.removeAttribute('src');
    return;
  }
  img.hidden = false;
  img.src = url;
  img.alt = altText;
}
