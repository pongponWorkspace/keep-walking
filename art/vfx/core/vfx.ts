// art/vfx/core/vfx.ts
//
// Framework-free VFX engine (D-001: zero cost, no external animation library).
// Documented import path for consumers:
//   - Bundled app code (gameplay-programmer, P2-F05-T10): import straight from this .ts file,
//     e.g. `import { play } from '../../../art/vfx/core/vfx';` — any bundler that already
//     handles the rest of this TypeScript monorepo (esbuild/Vite/tsc) resolves it natively, no
//     extra build step needed on top of what apps/client already runs.
//   - Zero-build demo pages (art/vfx/demo/*.html, reviewers/QA): import the compiled output in
//     art/vfx/dist/core/vfx.js instead (plain ES module, no bundler) — see art/vfx/tsconfig.json
//     and art/vfx/specs/core-api.md for how dist/ is produced and why it is not committed as
//     source-of-truth.
//
// Engine choice (art/vfx/specs/motion-direction.md §2/§10): every effect in this package is
// driven by the Web Animations API (`element.animate()`), even the ones the spec table marks
// "CSS" as the *default* choice for a hand-authored one-off. WAAPI is explicitly allowed for
// every effect and is the only engine that gives a single, uniform `.cancel()`/`.finished`
// contract — which is what §2 requires ("ต้อง cancel() ได้แน่นอนตอน visibilitychange"). Using
// one engine for all effects means the visibilitychange guard below is correct for every effect
// without each module re-implementing its own cancellation bookkeeping.
//
// Property budget (motion-direction §2): only `transform` and `opacity` are compositor-only safe
// on low-end mobile. Every effect module in this package animates those two properties only,
// `opacity` restricted to the ≤200 ms enter/exit exceptions accepted in D-077, plus the two
// named `filter` exceptions (death grayscale, legendary brightness) called out in §2's table.
// This core module does not enforce that budget in code (it is a content rule, not a runtime
// one) — see art/vfx/specs/*.md for the per-effect accounting.

/** Full one-shot animation set for a single `play()` call. */
export interface EffectRun {
  animations: Animation[];
  /** Runs once every animation has settled (finished or cancelled). Never runs twice. */
  cleanup?: () => void;
}

export interface EffectDefinition {
  /** Matches a cue id in audio/cue-list.md 1:1 where one exists (e.g. "run.tickGranted"). */
  id: string;
  /** Full one-shot duration in ms, including all beats (motion-direction §3/§9). */
  durationMs: number;
  run: (target: Element) => EffectRun;
  /**
   * prefers-reduced-motion variant. When omitted, `play()` falls back to `run()` even under
   * reduced motion — only acceptable for an effect that already contains no transform/rotate;
   * document why in the effect's spec file if relying on this fallback.
   */
  reducedMotion?: (target: Element) => EffectRun;
}

/** A `play()` result: a Promise that never rejects on cancellation, plus a `.cancel()` method. */
export type PlayHandle = Promise<void> & { cancel: () => void };

const registry = new Map<string, EffectDefinition>();

interface ActiveEntry {
  cancel: () => void;
}

const active = new Set<ActiveEntry>();

/**
 * Register an effect. Throws on duplicate ids so two modules can never silently clobber each
 * other's `play('run.tickGranted', …)` call.
 */
export function registerEffect(def: EffectDefinition): void {
  if (!def.id) {
    throw new Error('vfx: registerEffect requires a non-empty string id');
  }
  if (registry.has(def.id)) {
    throw new Error(`vfx: effect "${def.id}" is already registered`);
  }
  registry.set(def.id, def);
}

/** Test/demo helper: remove every registered effect. Never called by production code. */
export function resetRegistry(): void {
  registry.clear();
}

export function getEffect(id: string): EffectDefinition | undefined {
  return registry.get(id);
}

export function listEffects(): string[] {
  return Array.from(registry.keys());
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Centralized reduced-motion check (motion-direction §2: "ตรวจด้วย window.matchMedia … ที่ต้น
 * module ทุกตัว ไม่ใช่เช็คทีละจุดเรียก" — this function is the single place that checks it; effect
 * modules never call matchMedia themselves).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

function settleAnimations(animations: Animation[]): void {
  for (const anim of animations) {
    try {
      anim.cancel();
    } catch {
      // cancel() on an already-idle/finished Animation is a no-op in every engine tested; the
      // rare engine that throws here is not worth failing the whole cancel path over.
    }
  }
}

/**
 * Play a registered effect once on `target`. Returns a Promise that resolves when every
 * animation in the effect has finished or been cancelled (never rejects on cancel — cancelling
 * is a normal outcome, not an error). The returned Promise also carries a `.cancel()` method.
 */
export function play(effectId: string, target: Element): PlayHandle {
  const def = registry.get(effectId);
  if (!def) {
    const rejected = Promise.reject(new Error(`vfx: unknown effect "${effectId}"`));
    rejected.catch(() => {
      /* swallow: callers that only read `.cancel`/await later should not see an unhandled
         rejection warning for a mistake they will see immediately anyway via the thrown id. */
    });
    return Object.assign(rejected, { cancel: () => {} });
  }

  const reduced = prefersReducedMotion();
  const effectRun = reduced && def.reducedMotion ? def.reducedMotion(target) : def.run(target);
  const animations = effectRun.animations;
  const cleanup = effectRun.cleanup;

  let settled = false;
  const entry: ActiveEntry = {
    cancel: () => {
      if (settled) return;
      settled = true;
      settleAnimations(animations);
      cleanup?.();
      active.delete(entry);
    },
  };
  active.add(entry);

  const promise = Promise.allSettled(animations.map((a) => a.finished)).then(() => {
    if (settled) return; // already handled by an explicit cancel() racing the natural finish
    settled = true;
    cleanup?.();
    active.delete(entry);
  });

  return Object.assign(promise, { cancel: entry.cancel });
}

/** Cancel every effect currently playing. Called automatically on `visibilitychange` (below). */
export function cancelAll(): void {
  for (const entry of Array.from(active)) {
    entry.cancel();
  }
}

/** How many effects are mid-flight right now (demo/measurement helper). */
export function activeCount(): number {
  return active.size;
}

// Motion budget rule with zero exceptions (motion-direction §2, §11 row 1): the instant the
// tab/screen is hidden, every running effect is cancelled outright — never paused-and-resumed.
// Binding this once at module load means every consumer gets the guarantee just by importing
// this file; no per-effect boilerplate, no missed subscription.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      cancelAll();
    }
  });
}
