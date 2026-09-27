/**
 * `run_gps_status_changed` (product/telemetry-events.md section 3, P2-H50 -> P2-X48 handoff):
 * fires on every `LocationProvider` state change, no debounce, no sampling. `properties.status` is
 * one of exactly six enum values the doc names (`searching`|`off`|`denied`|`low_accuracy`|
 * `offline`|`restored`) — "ตรงกับ gps.* copy key ใน design/ux/flows/F03-core-loop.md §9.5", i.e. the
 * doc's own six canonical `gps.*` keys (searching/off/denied/lowAccuracy/offline/restored), not the
 * two engineering-only variants `src/copy/gps-state.ts` also carries (`unsupported`, the `suspended`
 * toast) that sit outside that §9.5 table. `properties.context` says where the player was
 * (`onboarding`|`map`|`run`) — the whole reason product-manager asked for this: telling a real
 * pocket-screen GPS drop apart from a movement-gate tick problem needs to know it happened `during
 * a run`, not just that it happened.
 *
 * No coordinate, no accuracy number, ever — this module never reads a `lat`/`lng`/`accuracy` field
 * at all (same first line of defense `telemetry/f04-events.ts` documents; `telemetry/guard.ts` is
 * the second, independent one).
 *
 * Two assumptions this file makes, flagged in the task report (P2-X48) for product-manager to
 * confirm, not blocking the P2-F06-T27 field playtest:
 * - `unsupported` (fatal, `navigator.geolocation` missing/unimplemented) collapses to `denied`: both
 *   are a fatal, this-session-unrecoverable block on getting a fix at all, and the doc's own enum
 *   has no seventh value for it. Very rare in practice (old/unsupported browsers only).
 * - the `suspended` toast (screen lock / tab switch, recovered) collapses to `restored`: the doc's
 *   enum has no separate "recovered from a suspended period" value, and `restored` is defined as
 *   "leaving a bad state", which a suspended period is. `suspended` never gets its own status at
 *   entry either (`GpsStatusTracker` intentionally shows no persistent label for it, F03-core-loop.md
 *   9.5's own six keys agree) — the field data on how much movement time it costs, if the pocket
 *   screen (D-063) does not fully prevent it, arrives via `dungeon_exited.page_hidden_total_s_bucket`
 *   / `wake_lock_engaged_share_bucket` (already emitted, P2-F06-T14) instead of a new status value
 *   here.
 */
import type { GpsDisplayState, GpsToast } from '../copy/gps-state';

export const RUN_GPS_STATUSES = [
  'searching',
  'off',
  'denied',
  'low_accuracy',
  'offline',
  'restored',
] as const;
export type RunGpsStatus = (typeof RUN_GPS_STATUSES)[number];

export const RUN_GPS_CONTEXTS = ['onboarding', 'map', 'run'] as const;
export type RunGpsContext = (typeof RUN_GPS_CONTEXTS)[number];

export interface RunGpsStatusChangedEvent {
  readonly name: 'run_gps_status_changed';
  readonly properties: { readonly status: RunGpsStatus; readonly context: RunGpsContext };
}

export function runGpsStatusChangedEvent(
  status: RunGpsStatus,
  context: RunGpsContext,
): RunGpsStatusChangedEvent {
  return { name: 'run_gps_status_changed', properties: { status, context } };
}

/** `GpsDisplayState -> RunGpsStatus`. `null` for `none` (no problem shown; the recovery side of
 * "leaving a bad state" is reported through the `restored` toast instead, never by observing a
 * transition *into* `none` directly — a cold start's first `none` is not a recovery, see
 * `gps-status.ts`'s own `problemActive` handling, which the toast already respects). */
const DISPLAY_TO_STATUS: Readonly<Record<GpsDisplayState, RunGpsStatus | null>> = {
  none: null,
  searching: 'searching',
  off: 'off',
  denied: 'denied',
  unsupported: 'denied',
  lowAccuracy: 'low_accuracy',
};

export function mapGpsDisplayToStatus(display: GpsDisplayState): RunGpsStatus | null {
  return DISPLAY_TO_STATUS[display];
}

/** Both `GpsToast` values report the same telemetry status: leaving a bad state. */
export function mapGpsToastToStatus(_toast: GpsToast): RunGpsStatus {
  return 'restored';
}

/**
 * `run_gps_status_changed.context`. Priority: an active run always wins (that is the one case
 * P2-H50 cares about most); otherwise `onboarding` until the player has ever chosen a class
 * (`player.classId === null`, the same "still onboarding" signal `mapSessionEvent`'s doc comment
 * uses — F06 R29: a run cannot start before a class is chosen); `map` otherwise (home screen,
 * settings, between runs). Takes plain booleans, not a `SessionState`, so this stays a pure
 * function with no import of `@keep-walking/shared/session` beyond what the caller already reads.
 */
export function resolveGpsStatusContext(
  hasActiveRun: boolean,
  classChosen: boolean,
): RunGpsContext {
  if (hasActiveRun) return 'run';
  if (!classChosen) return 'onboarding';
  return 'map';
}

/** Structural subset of `location/gps-status.ts#GpsStatusTracker` this bridge reads — a real
 * tracker instance satisfies this without an explicit `implements`. */
export interface GpsStatusTelemetrySource {
  readonly current: GpsDisplayState;
  onDisplayChange(listener: (display: GpsDisplayState) => void): () => void;
  onToast(listener: (toast: GpsToast) => void): () => void;
}

/** Structural subset of `location/network-status.ts#NetworkStatusSource`. */
export interface GpsStatusTelemetryNetworkSource {
  isOnline(): boolean;
  subscribe(listener: (online: boolean) => void): () => void;
}

export interface GpsStatusTelemetryDeps {
  readonly gps: GpsStatusTelemetrySource;
  readonly network: GpsStatusTelemetryNetworkSource;
  /** Read fresh on every emit (never cached): `context` reflects where the player is *at the moment
   * of this exact state change*, e.g. a GPS drop right as a run starts must read `run`, not
   * whatever context was true when the bridge was first wired. */
  readonly resolveContext: () => RunGpsContext;
  readonly record: (status: RunGpsStatus, context: RunGpsContext) => void;
}

/**
 * Wires `run_gps_status_changed` to the real `GpsStatusTracker` + network status, no debounce, no
 * sampling (product/telemetry-events.md section 3): every call `deps.gps`/`deps.network` makes to a
 * listener here results in at most one `deps.record()` call, synchronously, in the same turn.
 *
 * Catch-up on wiring (`main.ts` wires this once `f04App`/its `TelemetrySink` exists — see that
 * file's own comment on why the sink cannot exist any earlier): if the tracker or the network are
 * already in a bad state the moment this function runs (e.g. GPS already searching, or the device
 * already offline), that current state is reported immediately, once, so a bridge that starts
 * listening slightly late never silently drops the state the player is already in.
 *
 * Returns an unsubscribe function (disposed with the app; Phase 2 has exactly one page lifetime per
 * session so nothing currently calls it, but every other `on*` wiring in this codebase returns one).
 */
export function wireGpsStatusTelemetry(deps: GpsStatusTelemetryDeps): () => void {
  let wasOnline = deps.network.isOnline();

  function emit(status: RunGpsStatus | null): void {
    if (status === null) return;
    deps.record(status, deps.resolveContext());
  }

  const unsubDisplay = deps.gps.onDisplayChange((display) => {
    emit(mapGpsDisplayToStatus(display));
  });
  const unsubToast = deps.gps.onToast((toast) => {
    emit(mapGpsToastToStatus(toast));
  });
  const unsubNetwork = deps.network.subscribe((online) => {
    if (online === wasOnline) return;
    wasOnline = online;
    emit(online ? 'restored' : 'offline');
  });

  const initialDisplayStatus = mapGpsDisplayToStatus(deps.gps.current);
  if (initialDisplayStatus !== null) emit(initialDisplayStatus);
  if (!wasOnline) emit('offline');

  return () => {
    unsubDisplay();
    unsubToast();
    unsubNetwork();
  };
}
