/**
 * The visual leg of the fire-together cue coordinator (`feedback/cue-feedback.ts`, audio/
 * cue-list.md section 4, P2-F06-T14): a small, purely decorative flash that fires at the exact
 * instant `createCueFeedback`'s queue promotes a cue to "playing" — the same instant its sound and
 * vibration fire, never at `submit()` time (a lower-priority cue may sit queued for a while first,
 * `cue-feedback.ts`'s own doc comment).
 *
 * Deliberately carries no text and no per-cue icon: every cue this coordinator drives already has
 * its own detailed, canon-copy toast/vfx (`ui/tick-toast.ts`, `run.autoRetreat`/`run.death`'s vfx in
 * `f04-app.ts`) fired directly at `submit()` time, which — because Phase 2's queue is single-player
 * and rarely backs up — is indistinguishable from queue-promotion time in the overwhelming common
 * case. This pulse is the supplementary guarantee for the rare case it is not: a plain, aria-hidden
 * flash needs no new copy key (CLAUDE.md: no literal Thai, only copy keys — a generic per-cue
 * banner would need one narrative has not written), so it stays honest about what it is instead of
 * duplicating another module's detailed message.
 *
 * DOM-only glue (not unit-tested at the Vitest level — same convention as `ui/gps-ui.ts`). V-35 (art
 * gate F04-F06 round 1): this pulse sits at `zIndex.toast` (`app.css`), the same level as
 * `ui/tick-toast.ts`'s own toasts — components.md 15.4's own decision (P2-H39) is that nothing above
 * `zIndex.overlay` ever needs to reach the player while the pocket screen's opaque overlay is up
 * (sound/vibration carry that signal instead), so this pulse is covered by the pocket screen exactly
 * the same way a toast already is, on purpose, never a separate level above it.
 */
export interface CueVisual {
  /** Triggers one flash. Safe to call again before the previous flash finishes (restarts it). */
  pulse(): void;
}

const PULSE_ACTIVE_CLASS = 'cue-visual-pulse-active';

export function mountCueVisual(container: HTMLElement): CueVisual {
  const root = document.createElement('div');
  root.className = 'cue-visual-pulse';
  root.setAttribute('aria-hidden', 'true');
  root.addEventListener('animationend', () => root.classList.remove(PULSE_ACTIVE_CLASS));
  container.append(root);

  return {
    pulse() {
      // Force a reflow before re-adding the class so two pulses back-to-back both play their full
      // animation (removing+re-adding the same class with no reflow between is a no-op to the CSS
      // animation engine).
      root.classList.remove(PULSE_ACTIVE_CLASS);
      void root.offsetWidth;
      root.classList.add(PULSE_ACTIVE_CLASS);
    },
  };
}
