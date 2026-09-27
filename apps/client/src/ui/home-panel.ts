/**
 * The home-state fallback panel (spec F06 R50-R58, flow F06 section 7, `home/home-state.ts`'s
 * `HomeState` union): the state-specific title/body/CTA for `far` (+ its `outside_launch_district`
 * sub-state) / `out_of_area` / `unknown`, plus the 5 shortcuts R51 requires on *every* home state
 * (avatar, role info, inventory, recent runs — class-select is P2-F06-T10's own build, Flow B, not
 * this task's `writes`). Distance/direction/navigate/closed-time for `far`/`outside_launch_district`
 * stay `nav-panel.ts`'s job (this module never re-implements the nav link or the straight-line
 * distance chip) — the caller (`f04-app.ts`) feeds `nav-panel` the *tracker-resolved* target
 * dungeon id instead of "nearest dungeon overall" once a `HomeState` other than `near` is showing.
 *
 * The avatar card is a lazy asset part (`assets/runtime.ts#loadAvatarPart`, asset-pipeline 7.2):
 * `show()` triggers the load once per session (fire-and-forget, `catch` never surfaces — a failed
 * load just leaves the default frame, `assets/manifest.ts` §6.4) and never blocks the rest of the
 * panel from rendering.
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import { formatOpenTime } from '../dungeons/open-time';
import { formatDistanceText } from '../dungeons/distance';
import type { DistanceStep } from '../dungeons/distance';
import type { AssetRuntimeController } from '../assets/runtime';
import type { HomeState } from '../home/home-state';

export interface HomePanelDeps {
  readonly assets: AssetRuntimeController;
  readonly utcOffsetMin: number;
  readonly distanceDisplaySteps_m: readonly DistanceStep[];
  readonly onOpenRoleInfo: () => void;
  readonly onOpenInventory: () => void;
  readonly onOpenRecentRuns: () => void;
  readonly onRegisterDistrict: () => void;
  readonly onRegisterProvince: () => void;
  readonly onRequestConsent: () => void;
}

export interface HomePanel {
  readonly root: HTMLElement;
  /** `undefined` (e.g. `near`, or masks not loaded yet) hides the whole panel — the caller keeps
   * showing the plain `nav-panel`/map instead. */
  render(state: HomeState | undefined, now_ms: number): void;
  hide(): void;
  /** `home.recentRunsShortcut`'s own detail text (F06 flow section 7.0's "run ที่ผ่านมา" — a short
   * one-line peek at `RunSummary`, never a second confirm/ack screen): the caller (which already
   * holds `state.lastSummary`) formats the text once per click, this module only displays it. */
  setRecentRunDetail(text: string): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function mountHomePanel(container: HTMLElement, deps: HomePanelDeps): HomePanel {
  const root = el('div', 'home-panel');
  root.hidden = true;

  // --- R51's 5 shortcuts (shared across every state, section 7.0) ---
  const shortcuts = el('div', 'home-panel-shortcuts');
  const avatarCard = el('div', 'home-avatar-card');
  let avatarLoadStarted = false;
  const roleInfoLink = document.createElement('button');
  roleInfoLink.className = 'btn btn-secondary home-role-info-link';
  roleInfoLink.textContent = getCopyText('home.farRoleInfoLink');
  roleInfoLink.addEventListener('click', () => deps.onOpenRoleInfo());
  const inventoryLink = document.createElement('button');
  inventoryLink.className = 'btn btn-secondary home-inventory-link';
  inventoryLink.textContent = getCopyText('inventory.homeShortcut');
  inventoryLink.addEventListener('click', () => deps.onOpenInventory());
  const recentRunsLink = document.createElement('button');
  recentRunsLink.className = 'btn btn-secondary home-recent-runs-link';
  recentRunsLink.textContent = getCopyText('home.recentRunsShortcut');
  const recentRunsDetail = el('div', 'home-recent-runs-detail');
  recentRunsDetail.hidden = true;
  recentRunsLink.addEventListener('click', () => {
    recentRunsDetail.hidden = !recentRunsDetail.hidden;
    deps.onOpenRecentRuns();
  });
  shortcuts.append(avatarCard, roleInfoLink, inventoryLink, recentRunsLink, recentRunsDetail);

  const title = el('div', 'home-panel-title');
  const body = el('div', 'home-panel-body');
  const nextOpenLine = el('div', 'home-panel-next-open');
  nextOpenLine.hidden = true;
  const registerCard = el('div', 'home-panel-register-card');
  registerCard.hidden = true;
  const registerTitle = document.createElement('div');
  const registerBody = document.createElement('div');
  const registerCta = document.createElement('button');
  registerCta.className = 'btn btn-secondary home-register-cta';
  registerCard.append(registerTitle, registerBody, registerCta);
  const primaryCta = document.createElement('button');
  primaryCta.className = 'btn btn-primary home-primary-cta';

  root.append(shortcuts, title, body, nextOpenLine, registerCard, primaryCta);
  container.append(root);

  return {
    root,
    hide() {
      root.hidden = true;
    },
    setRecentRunDetail(text) {
      recentRunsDetail.textContent = text;
    },
    render(state, now_ms) {
      if (state === undefined || state.kind === 'near') {
        root.hidden = true;
        return;
      }
      if (!avatarLoadStarted) {
        avatarLoadStarted = true;
        void deps.assets.loadAvatarPart().catch(() => undefined);
      }
      root.hidden = false;
      renderState(state, now_ms);
    },
  };

  function renderState(state: HomeState, now_ms: number): void {
    nextOpenLine.hidden = true;
    registerCard.hidden = true;
    primaryCta.hidden = true;
    primaryCta.onclick = null;
    if (state.kind === 'unknown') {
      title.textContent = getCopyText('home.unknownTitle');
      body.textContent = getCopyText('home.unknownBody');
      primaryCta.hidden = false;
      primaryCta.textContent = getCopyText('home.unknownCta');
      primaryCta.onclick = () => deps.onRequestConsent();
      registerCard.hidden = false;
      registerTitle.textContent = getCopyText('home.unknownRegisterHint');
      registerBody.textContent = '';
      registerCta.textContent = getCopyText('home.outOfAreaCta');
      registerCta.onclick = () => deps.onRegisterProvince();
      return;
    }
    if (state.kind === 'out_of_area') {
      title.textContent = getCopyText('home.outOfAreaTitle');
      // [ASSUMPTION A-P2-F06-T09-2: `{provinceName}` is left empty (the sentence still reads fine
      // in Thai without it, "ยังไม่เปิด อยากให้เปิด...") because no province-boundary-to-name lookup
      // exists anywhere in this repo yet (`data/map/provinces.geojson`'s own features carry only
      // `{kind: "border"}`, no name) — resolving the real province from an out-of-play-area point
      // needs a full nationwide province polygon set, out of this task's scope. owner: location-
      // engineer/tech-lead, a real lookup slots in here with no other change.]
      body.textContent = formatCopyText('home.outOfAreaBody', { provinceName: '' });
      primaryCta.hidden = false;
      primaryCta.textContent = getCopyText('home.outOfAreaCta');
      primaryCta.onclick = () => deps.onRegisterProvince();
      return;
    }
    if (state.kind === 'temporarilyClosed') {
      title.textContent = getCopyText('home.farTitle');
      body.textContent = '';
      nextOpenLine.hidden = false;
      nextOpenLine.textContent = formatCopyText('home.farNextOpen', {
        openTime:
          state.nextOpenAt_ms === null
            ? ''
            : formatOpenTime(state.nextOpenAt_ms, now_ms, deps.utcOffsetMin),
      });
      return;
    }
    if (state.kind === 'near') return; // unreachable: the caller's render() never gets here (guard above)
    // far / outside_launch_district
    title.textContent = getCopyText('home.farTitle');
    body.textContent = formatCopyText('home.farBody', {
      distanceText: formatDistanceText(state.distance_m, deps.distanceDisplaySteps_m),
    });
    if (state.kind === 'outside_launch_district') {
      registerCard.hidden = false;
      registerTitle.textContent = getCopyText('home.outsideLaunchTitle');
      // D-126/D-127-adjacent: `home.outsideLaunchBody` carries no `{areaName}` (or any other
      // variable) by design (this module's own doc comment, `formatCopyText` with no `vars` is
      // just `getCopyText` — kept as `formatCopyText` only so a future edit that *does* add a
      // variable here does not silently forget to switch functions).
      registerBody.textContent = formatCopyText('home.outsideLaunchBody');
      registerCta.textContent = getCopyText('home.outOfAreaCta');
      registerCta.onclick = () => deps.onRegisterDistrict();
    }
  }
}
