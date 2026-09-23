/**
 * Registers `kw-rift-crack` (the `kw-rift-crack` symbol layer's icon, kw-light.style.json) with
 * `map.addImage`, rasterizing the committed SVG at its native 48×72 px and declaring `pixelRatio: 2`
 * (art/direction/map-style.md metadata `kw:runtimeImages`, P1-F02-T11 acceptance: "addImage
 * kw-rift-crack pixelRatio 2") so it draws at the intended 24×36 CSS px. A static image only — no
 * animation, matching every other `kw-*` layer's "no continuous animation on the map" rule
 * (design/ux/tokens.json `motion.rule`).
 *
 * Rasterizing (not passing the SVG straight to `addImage`, which MapLibre does not accept) needs a
 * DOM `Image`/`canvas`: not unit-tested here (no DOM in this workspace's Vitest environment, ADR
 * 0001 3.6), covered by e2e like the rest of `map/`.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import riftCrackUrl from '../../../../art/direction/map-style/icons/rift-crack.svg?url';

export const RIFT_CRACK_IMAGE_ID = 'kw-rift-crack';
const RIFT_CRACK_PIXEL_RATIO = 2;

async function rasterizeSvg(
  url: string,
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const response = await fetch(url);
  const svgText = await response.text();
  const objectUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (context === null) {
      throw new Error('map: 2d canvas context unavailable, cannot rasterize kw-rift-crack');
    }
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, data: imageData.data };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Idempotent: safe to call more than once (e.g. a hot-reloaded dev session). */
export async function registerRiftCrackImage(map: MapLibreMap): Promise<void> {
  if (map.hasImage(RIFT_CRACK_IMAGE_ID)) {
    return;
  }
  try {
    const image = await rasterizeSvg(riftCrackUrl);
    if (!map.hasImage(RIFT_CRACK_IMAGE_ID)) {
      map.addImage(RIFT_CRACK_IMAGE_ID, image, { pixelRatio: RIFT_CRACK_PIXEL_RATIO });
    }
  } catch (error: unknown) {
    console.warn('map: failed to register kw-rift-crack image', error);
  }
}
