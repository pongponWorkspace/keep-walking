/**
 * `.item-icon-frame` (P2-X21, `design/ux/components.md` 13.7): two stacked `<img>`s, frame first
 * so the rarity border paints under the item glyph. Shared by the run-summary loot rows
 * (`ui/run-summary.ts`) and the tick-feedback toast (`ui/tick-toast.ts`, P2-F05-T10) so both mount
 * the exact DOM shape `art/vfx/rarity-reveal/rarity-reveal.ts` expects as its `target` (a frame
 * container that already shows the artist SVG as a normal child, freshly mounted per reveal).
 */
import { setIconImg } from '../assets/icon-dom';
import type { AssetRuntime } from '../assets/icon-dom';
import type { ItemLineView } from './item-line-view';

export function buildItemIconElement(assets: AssetRuntime, view: ItemLineView): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'item-icon-frame';
  const frameImg = document.createElement('img');
  frameImg.className = 'item-icon-frame-bg';
  const glyphImg = document.createElement('img');
  glyphImg.className = 'item-icon-glyph';
  setIconImg(frameImg, assets, view.frameIconId, '');
  setIconImg(glyphImg, assets, view.itemIconId, view.name);
  wrap.append(frameImg, glyphImg);
  return wrap;
}
