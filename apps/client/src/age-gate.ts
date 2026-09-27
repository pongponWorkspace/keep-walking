/**
 * `S-00-age-gate` (design/features/F06-hp-damage-onboarding.md R45; design/ux/flows/
 * F06-hp-damage-onboarding.md A2/A2b; docs/tech/F06-hp-damage-onboarding.md section 8.1-8.2): a
 * pure pass/fail computation off `config/balance/privacy.json#minAge_yr`/`#minAgeComparison`
 * (`config/balance.ts#balancePrivacyConfig`), plus the birth-year option list the age-gate screen
 * shows. No DOM, no storage, no clock read of its own — `nowYear` is always an injected value
 * (ADR 0003 C1-3), never `new Date().getFullYear()` read here.
 *
 * Age math is deliberately calendar-year-only (never month/day): the spec's own wording is "เลือก
 * ปีเกิดจากรายการ" (pick a birth *year*), not a full birth date, and `minAge_yr`/`minAgeComparison`
 * are themselves whole-year values (F06-R45's own "ผ่านเมื่อตามเกณฑ์ config: privacy.minAge_yr แบบ
 * minAgeComparison") — `age = nowYear - birthYear` is the one honest reading of that (a player who
 * turns the minimum age *later this calendar year* already passes, the same generous rounding the
 * real world uses for a same-year birthday one is unsure of the exact date of).
 *
 * The birth-year option list deliberately spans *every* plausible birth year, not just the ones
 * that pass `minAge_yr` — an honestly-answering under-`minAge_yr` player must be able to pick their
 * real birth year and see the real `underage` result (F06-R46); a list that only ever offered
 * passing years could never actually reject anyone, defeating the gate. Its own length has no
 * config value anywhere (checked: `config/balance/privacy.json`, `config/app/client.json` — neither
 * declares a span) — [ASSUMPTION A-P2-X38-1: the list runs from `nowYear` down
 * `MAX_SELECTABLE_AGE_SPAN_YR` further years, a UI-only display-length choice with no gameplay/
 * balance effect of its own (`minAge_yr` alone decides pass/fail once a year is picked) — not a
 * `config:`-sourced number under CLAUDE.md's "no literals" rule for the same reason `client.json`'s
 * own toast/animation-timing constants cite when a flow doc gives no exact figure: this one has no
 * natural ceiling, and 100 covers effectively every real player. owner: uiux-designer/
 * systems-designer, a real config value replaces this constant with no other change.]
 */
import type { GateComparison } from './config/balance';

const MAX_SELECTABLE_AGE_SPAN_YR = 100;

/** `true` when a player born in `birthYear` passes `minAge_yr` under `comparison`, evaluated at
 * `nowYear` (this module's own doc comment explains the whole-calendar-year rounding). Only
 * `'greaterThanOrEqual'` is a real gate today; every other `GateComparison` value fails loudly
 * rather than silently guessing (CLAUDE.md "fail loudly, never guess" — mirrors `config/balance.ts`'s
 * own `parseBalancePrivacyConfig`, which already rejects an unknown comparison at load time, so this
 * branch is unreachable in practice; it exists so this function's own return type stays a plain
 * `boolean`, never a thrown surprise deep inside a click handler). */
export function ageGatePassed(
  birthYear: number,
  nowYear: number,
  minAge_yr: number,
  comparison: GateComparison,
): boolean {
  const age = nowYear - birthYear;
  if (comparison === 'greaterThanOrEqual') return age >= minAge_yr;
  return age > minAge_yr;
}

/** Birth years for the age-gate `<select>`, newest first (the wireframe's own "2550 ▾" default —
 * the most recently born selectable player sits at the top, not the oldest) — spans every plausible
 * birth year (this module's own doc comment explains why underage years are included on purpose),
 * not just the ones that pass `minAge_yr`. */
export function ageGateBirthYearOptions(nowYear: number): readonly number[] {
  const oldest = nowYear - MAX_SELECTABLE_AGE_SPAN_YR;
  const years: number[] = [];
  for (let year = nowYear; year > oldest; year -= 1) {
    years.push(year);
  }
  return years;
}
