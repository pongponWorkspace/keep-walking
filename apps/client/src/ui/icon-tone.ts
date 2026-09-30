/**
 * Pure `icon.ui.*` id + colour lookups for the run-state pill (components.md 13.2) and the chip-
 * status "closed" line (13.1) — table 13.9.1's own rows, copied here as literal hex values (the
 * same convention `app.css` already uses for every other token: a literal value with a comment
 * naming the token, never a second runtime JSON parse of `design/ux/tokens.json` just for two call
 * sites). `setIconGlyph` (`assets/icon-glyph.ts`) decides tintable-vs-`<img>` on its own per id; this
 * module only supplies which id and which `colorCss` to pass it, exactly as its own doc comment
 * asks callers to do ("a CSS colour value already resolved by the caller ... per components.md
 * 13.9.1's table").
 *
 * No DOM here (pure functions, direct Vitest coverage) — `run-bar.ts`/`nav-panel.ts` are the DOM
 * glue that calls these and feeds the result into `setIconGlyph`.
 *
 * [ASSUMPTION A-P2-F06-T14-1: `onNightBackground` is always `false` at every call site today — this
 * client has no day/night theme switch anywhere yet (no CSS class, no config, `app.css` is a single
 * flat light theme). The night column of 13.9.1 is implemented here and unit-tested (so the day
 * this client gains a real night theme, the caller only has to pass `true`, nothing here changes),
 * but until then every glyph this module drives renders in its documented day colour. Owner:
 * uiux-designer/tech-lead to confirm when a night theme lands.]
 */
import type { RunStatus } from '@keep-walking/shared/session';

/** `design/ux/tokens.json` literals used below (component.md 13.9.1's own token names in comments,
 * ADR 0001 3.10 unit-suffix convention does not apply to colour strings). */
const TOKEN_INK_900 = '#1A1A22';
const TOKEN_INK_700 = '#333344';
const TOKEN_INK_100 = '#DDDDEE';
const TOKEN_BG_PAPER = '#FFF8EE';
const TOKEN_BG_SURFACE = '#FFFFFF';
const TOKEN_STATE_INFO = '#006699';

export interface IconTone {
  readonly id: string;
  readonly colorCss: string;
}

/**
 * Run-state pill (components.md 13.2 + 13.9.1): Active -> `icon.ui.in-run` (`ink.900` day /
 * `bg.paper` night), Grace -> `icon.ui.grace` (`state.info`, both tones), Suspended ->
 * `icon.ui.suspended` (fixed-colour badge per D-123/P2-H17 — `setIconGlyph` renders it as a plain
 * `<img>` on its own once it sees no `tintable` field; `colorCss` here is therefore never applied,
 * but a value is still returned so every call site has one shape to call `setIconGlyph` with).
 */
export function runStatePillIconTone(status: RunStatus, onNightBackground: boolean): IconTone {
  if (status === 'active') {
    return { id: 'icon.ui.in-run', colorCss: onNightBackground ? TOKEN_BG_PAPER : TOKEN_INK_900 };
  }
  if (status === 'grace') {
    return { id: 'icon.ui.grace', colorCss: TOKEN_STATE_INFO };
  }
  return { id: 'icon.ui.suspended', colorCss: TOKEN_BG_SURFACE };
}

/** Chip-status "closed" (components.md 13.1 + 13.9.1): `ink.700` day / `ink.100` night. */
export function closedChipIconTone(onNightBackground: boolean): IconTone {
  return { id: 'icon.ui.closed', colorCss: onNightBackground ? TOKEN_INK_100 : TOKEN_INK_700 };
}

/** 13.9.2's night-only `bg.surface` backing-plate colour, for the `IconGlyphOptions` every call
 * site of `setIconGlyph` must also supply regardless of `onNightBackground` (the option is only
 * read when both `onNightBackground` is true and the tintable fetch fell back to `<img>`). */
export const NIGHT_BACKING_PLATE_COLOR_CSS = TOKEN_BG_SURFACE;

/** Recovering banner (components.md 6.1 + 13.9.1's new row, P2-X47/H51): always `state.info`, the
 * same colour as the banner's own text — table 13.9.1 lists no separate night value for this row
 * (the banner's plate is always `bg.surface`, never painted on `bg.night`). */
export function recoveringBannerIconTone(): IconTone {
  return { id: 'icon.ui.recovering', colorCss: TOKEN_STATE_INFO };
}

/** Speed-lock overlay (components.md 13.4, V-41 art gate F04-F06-visual-gate.md §8): `ink.900`,
 * the same colour `.speedlock-title`/`.speedlock-body` already use on the overlay's own
 * `bg.paper` plate — no night variant (the overlay is a single flat day-coloured full screen, no
 * `bg.night` context anywhere in it). */
export function speedLockIconTone(): IconTone {
  return { id: 'icon.ui.speed-lock', colorCss: TOKEN_INK_900 };
}
