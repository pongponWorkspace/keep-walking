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
 * DOM-only glue (not unit-tested at the Vitest level — same convention as `ui/gps-ui.ts`), visible
 * on top of the pocket screen too (`app.css`'s z-index for `.cue-visual-pulse` sits above
 * `.pocket-screen`, components.md 12.1's "Toast/cue ... ไม่ต้องออกจากจอพกกระเป๋าเพราะหน้าเว็บยัง
 * foreground").
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
