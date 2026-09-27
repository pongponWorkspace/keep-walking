/**
 * `S-05-role-info` (ia.md 3.7, flow F06 section 7.0 "อ่านว่าแต่ละ role ทำอะไร" — one of the 5
 * shortcuts every home state carries, R51): read-only, reachable before consent/class-select too
 * (ia.md: "เข้าถึงได้ทุกสถานะรวมก่อนให้ consent"). Four rows, one per `PlayerClass`
 * (`badge.class.<id>-48`, `art/direction/briefs/P2-assets.md` line 58) with the same short
 * description `onboarding.pickRole<Class>` already uses on the class-select sheet (Flow B) — one
 * piece of narrative content, reused, not duplicated.
 */
import { getCopyText } from '../copy/load';
import { setIconImg } from '../assets/icon-dom';
import type { AssetRuntime } from '../assets/icon-dom';

const ROLES = [
  { id: 'tanker', nameKey: 'class.tanker', descKey: 'onboarding.pickRoleTanker' },
  { id: 'ranged', nameKey: 'class.ranged', descKey: 'onboarding.pickRoleRanged' },
  { id: 'support', nameKey: 'class.support', descKey: 'onboarding.pickRoleSupport' },
  { id: 'magic', nameKey: 'class.magic', descKey: 'onboarding.pickRoleMagic' },
] as const;

export interface RoleInfoScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountRoleInfo(
  container: HTMLElement,
  onClose: () => void,
  assets: AssetRuntime,
): RoleInfoScreen {
  const root = document.createElement('div');
  root.className = 'screen role-info';
  root.hidden = true;

  const title = document.createElement('h1');
  title.textContent = getCopyText('roleInfo.title');

  const list = document.createElement('div');
  list.className = 'role-info-list';
  for (const role of ROLES) {
    const row = document.createElement('div');
    row.className = 'role-info-row';
    const badge = document.createElement('img');
    badge.className = 'role-info-badge';
    setIconImg(badge, assets, `badge.class.${role.id}-48`, getCopyText(role.nameKey));
    const name = document.createElement('div');
    name.className = 'role-info-name';
    name.textContent = getCopyText(role.nameKey);
    const desc = document.createElement('div');
    desc.className = 'role-info-desc';
    desc.textContent = getCopyText(role.descKey);
    row.append(badge, name, desc);
    list.append(row);
  }

  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-secondary';
  closeButton.textContent = getCopyText('common.close');
  closeButton.addEventListener('click', () => onClose());

  root.append(title, list, closeButton);
  container.append(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
