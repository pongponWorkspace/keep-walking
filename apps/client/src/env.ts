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
