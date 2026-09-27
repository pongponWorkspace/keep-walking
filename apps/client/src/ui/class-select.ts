/**
 * `S-00-class-select` (GDD "10 นาทีแรกของคนใหม่" minute 0-1, R29: class cannot be skipped, no
 * confirm screen layered on top — "เลือกเสร็จเข้าเกมเลย", `onboarding.pickRoleHint`). Same four
 * cards/copy `ui/role-info.ts` reuses read-only (`onboarding.pickRole<Class>`, `class.<id>`,
 * `badge.class.<id>-48`) — one piece of narrative content, not duplicated.
 *
 * Dispatches `{type: 'chooseClass', classId}` on tap (`onChoose`), the identical input the
 * `testForceClassId`/`?e2eClassId=` hook already sends (`session/engine.ts`) — no second code path
 * for picking a class.
 */
import { getCopyText } from '../copy/load';
import { setIconImg } from '../assets/icon-dom';
import type { AssetRuntime } from '../assets/icon-dom';
import type { PlayerClass } from '@keep-walking/shared/session';

const CLASSES: readonly {
  readonly id: PlayerClass;
  readonly nameKey: string;
  readonly descKey: string;
}[] = [
  { id: 'tanker', nameKey: 'class.tanker', descKey: 'onboarding.pickRoleTanker' },
  { id: 'ranged', nameKey: 'class.ranged', descKey: 'onboarding.pickRoleRanged' },
  { id: 'support', nameKey: 'class.support', descKey: 'onboarding.pickRoleSupport' },
  { id: 'magic', nameKey: 'class.magic', descKey: 'onboarding.pickRoleMagic' },
];

export interface ClassSelectSheet {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountClassSelect(
  container: HTMLElement,
  onChoose: (classId: PlayerClass) => void,
  assets: AssetRuntime,
): ClassSelectSheet {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay class-select-overlay';
  overlay.hidden = true;
  const popup = document.createElement('div');
  popup.className = 'popup class-select-popup';
  overlay.append(popup);

  const title = document.createElement('div');
  title.className = 'class-select-title';
  title.textContent = getCopyText('onboarding.pickRoleTitle');
  const hint = document.createElement('div');
  hint.className = 'class-select-hint';
  hint.textContent = getCopyText('onboarding.pickRoleHint');
  popup.append(title, hint);

  const cards = document.createElement('div');
  cards.className = 'class-select-cards';
  for (const cls of CLASSES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card class-select-card';
    const badge = document.createElement('img');
    badge.className = 'class-select-badge';
    setIconImg(badge, assets, `badge.class.${cls.id}-48`, getCopyText(cls.nameKey));
    const name = document.createElement('div');
    name.className = 'class-select-name';
    name.textContent = getCopyText(cls.nameKey);
    const desc = document.createElement('div');
    desc.className = 'class-select-desc';
    desc.textContent = getCopyText(cls.descKey);
    card.append(badge, name, desc);
    card.addEventListener('click', () => onChoose(cls.id));
    cards.append(card);
  }
  popup.append(cards);
  container.append(overlay);

  return {
    root: overlay,
    show() {
      overlay.hidden = false;
    },
    hide() {
      overlay.hidden = true;
    },
  };
}
