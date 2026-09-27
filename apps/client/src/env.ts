// Reads the three locked env var names into a small typed shape.
//
// Deliberately takes a plain object instead of `import.meta.env` directly so
// this stays a pure function: it can run under plain Node in a Vitest `node`
// environment (ADR 0001 3.6) without a DOM, and a unit test can cover every
// branch without touching Vite.

/** Shape of the three client env vars locked by the tech note (P1-F02-T03). */
export interface EnvSource {
  readonly VITE_TILES_URL?: string | undefined;
  readonly VITE_GLYPHS_URL?: string | undefined;
  readonly VITE_SPRITE_URL?: string | undefined;
}

/** Parsed, trimmed env values the map spike needs to build a style. */
export interface MapEnv {
  readonly tilesUrl: string | undefined;
  readonly glyphsUrl: string | undefined;
  readonly spriteUrl: string | undefined;
}

export function readMapEnv(source: EnvSource): MapEnv {
  return {
    tilesUrl: nonEmpty(source.VITE_TILES_URL),
    glyphsUrl: nonEmpty(source.VITE_GLYPHS_URL),
    spriteUrl: nonEmpty(source.VITE_SPRITE_URL),
  };
}

/** `MapEnv` narrowed to "all three set" (`map.ts`'s old, module-private `isRuntimeMapEnv`, moved
 * here for P2-F04-T10's code-split: `main.ts` needs this check *before* it decides whether to
 * `import('./map')` at all, and `./map` itself statically imports `maplibre-gl` — importing it just
 * to ask "is the env even configured?" would defeat the lazy-load (ADR 0003 section 10). Pure, no
 * Vite/DOM dependency, so it stays testable the same way as the rest of this file. */
export function hasRuntimeMapEnv(
  env: MapEnv,
): env is MapEnv & { tilesUrl: string; glyphsUrl: string; spriteUrl: string } {
  return env.tilesUrl !== undefined && env.glyphsUrl !== undefined && env.spriteUrl !== undefined;
}

/** Treats an unset or blank/whitespace-only env var the same as "not set". */
function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

/** Query param names the e2e suite uses to force a known, local, offline-safe env (see e2e/map-shell.spec.ts). */
export const E2E_ENV_OVERRIDE_PARAMS = {
  tilesUrl: 'e2eTilesUrl',
  glyphsUrl: 'e2eGlyphsUrl',
  spriteUrl: 'e2eSpriteUrl',
} as const;

/**
 * Lets the Playwright suite force every env value to something local and
 * offline-safe, without a committed `.env.test` — the root `.gitignore`
 * ignores every `.env.*` file except `.env.example` (ADR 0001 3.12), so an
 * env file checked in here would silently never reach anyone who clones the
 * repo. A dev's own `.env.local` may point glyphs/sprite at the real
 * Protomaps CDN (see .env.example); without this, an e2e run on that
 * machine would depend on the network (TL-S11). Presence of the query key
 * decides whether to override (so the e2e suite can force-clear a value to
 * "unset" with `key=`), not merely a non-blank value. Has no effect outside
 * of tests: unrecognized/absent params leave the env untouched, and none of
 * this reads or writes anything that affects rewards (ADR 0001 3.8).
 */
export function withTestEnvOverrides(env: MapEnv, search: string): MapEnv {
  const params = new URLSearchParams(search);
  return {
    tilesUrl: overrideIfPresent(params, E2E_ENV_OVERRIDE_PARAMS.tilesUrl, env.tilesUrl),
    glyphsUrl: overrideIfPresent(params, E2E_ENV_OVERRIDE_PARAMS.glyphsUrl, env.glyphsUrl),
    spriteUrl: overrideIfPresent(params, E2E_ENV_OVERRIDE_PARAMS.spriteUrl, env.spriteUrl),
  };
}

function overrideIfPresent(
  params: URLSearchParams,
  key: string,
  fallback: string | undefined,
): string | undefined {
  if (!params.has(key)) {
    return fallback;
  }
  return nonEmpty(params.get(key) ?? undefined);
}

/** Same e2e-only convention as `E2E_ENV_OVERRIDE_PARAMS` above: a query key an e2e spec sets to
 * get a known, isolated environment that plain production/dev URLs never trigger. A map-rendering
 * spec that injects its own `kw-rift`/`kw-rift-count` source data (e.g. `e2e/dungeon-labels.spec.
 * ts`) races against `f04App`'s own periodic `refreshMapDungeons` (`main.ts`'s
 * `window.setInterval(... f04App?.onTick ...)`), which rebuilds those same sources from the real
 * dungeon artifact roughly once a second — the spec's injected fixture data would eventually be
 * silently overwritten mid-test. Setting `e2eSkipF04App=1` skips creating `f04App` and its tick
 * interval entirely, leaving the map's dungeon sources solely under the spec's own control. Has no
 * effect unless present (same "presence, not merely a non-blank value" rule as the other e2e
 * overrides) and reads nothing that affects a reward (ADR 0001 3.8) — it only decides whether the
 * F04/F05 game loop is wired up at all, for a spec that only needs the raw map. */
export const E2E_SKIP_F04APP_PARAM = 'e2eSkipF04App';

export function shouldSkipF04App(search: string): boolean {
  return new URLSearchParams(search).has(E2E_SKIP_F04APP_PARAM);
}

/**
 * Build profile (TL B-10, docs/tech/F04-dungeon-presence.md section 17, ADR 0003 8.1): two env
 * vars read at build time only (`import.meta.env`, never re-read at runtime). `dev` is every
 * build that does not explicitly opt into `playtest` (a local `pnpm dev`, an unconfigured preview);
 * `playtest` is set by the deploy-preview workflow (P2-F05-T14, devops-engineer) for a build
 * handed to real playtesters, where the HUD stays off unless `?hud=1` is on the URL (already the
 * `production`-mode default, `client.json#providerQueryDefaultsByMode`) and the build shows its own
 * version so a bug report can be tied to a commit.
 */
export type BuildProfile = 'dev' | 'playtest';

const KNOWN_BUILD_PROFILES: readonly BuildProfile[] = ['dev', 'playtest'];

export interface BuildProfileEnvSource {
  readonly VITE_KW_PROFILE?: string | undefined;
  readonly VITE_KW_COMMIT?: string | undefined;
}

export interface ResolvedBuildProfile {
  readonly profile: BuildProfile;
  /** Short git SHA (devops-engineer's workflow sets this); `undefined` on a local dev build. */
  readonly commit: string | undefined;
}

function isKnownBuildProfile(value: string): value is BuildProfile {
  return (KNOWN_BUILD_PROFILES as readonly string[]).includes(value);
}

/** `VITE_KW_PROFILE` unset or unrecognized falls back to `dev` (the safer choice: HUD/Mock
 * defaults are still governed separately by `providerQueryDefaultsByMode`'s MODE key, this only
 * controls the version badge and is never used to gate a security-relevant behaviour by itself). */
export function readBuildProfile(source: BuildProfileEnvSource): ResolvedBuildProfile {
  const raw = source.VITE_KW_PROFILE?.trim();
  let profile: BuildProfile = 'dev';
  if (raw !== undefined && raw.length > 0) {
    if (isKnownBuildProfile(raw)) {
      profile = raw;
    } else {
      console.warn(`unknown VITE_KW_PROFILE "${raw}"; falling back to "dev"`);
    }
  }
  return { profile, commit: nonEmpty(source.VITE_KW_COMMIT) };
}
