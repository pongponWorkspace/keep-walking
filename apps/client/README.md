# @keep-walking/client

Mobile web client (Vite + MapLibre GL JS + PMTiles). Owner: gameplay-programmer.
Layout and dependency rules: `docs/adr/0001-repo-layout.md`.

Scope of the current scaffold (P1-F02-T09): prove a PMTiles basemap renders
in a MapLibre map on a mobile viewport. No LocationProvider wiring yet
(P1-F02-T10), no debug HUD / real Bangkok tiles (P1-F02-T11), and no reward
logic of any kind (client never computes drops, damage, or the movement
gate — CLAUDE.md).

## Commands

```sh
cp .env.example .env.local   # first time only; .env.local is gitignored
pnpm --filter @keep-walking/client dev            # http://localhost:5173
pnpm --filter @keep-walking/client dev:https       # generates a local cert first (TL-N03)
pnpm --filter @keep-walking/client build
pnpm --filter @keep-walking/client preview         # serves dist/ on :4173 (E2E_BASE_URL default)
pnpm --filter @keep-walking/client typecheck
```

Root scripts (`pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`) run
this workspace too (ADR 0001 3.7).

`pnpm dev:https` lets a phone on the same Wi-Fi open the dev server: mobile
browsers only grant geolocation over a secure context, so plain
`http://<lan-ip>:5173` will not work once P1-F02-T10 wires up
`LocationProvider`. It shells out to the system `openssl` to generate
`.certs/dev-*.pem` (gitignored) instead of adding a TLS npm dependency.

## Env vars (locked names, P1-F02-T03)

`VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` — see `.env.example`
for the temporary Protomaps fixture used before P1-F02-T06 publishes a
self-hosted Bangkok extract. None of these are hardcoded in source; an unset
`VITE_TILES_URL` shows an honest "not configured" state instead of a blank
canvas (`src/main.ts`).

## Tests

- `pnpm test` (Vitest, root config) covers `src/**/*.test.ts` — pure logic
  only (`env.ts`, `style.ts`), no DOM, so it needs no jsdom/happy-dom
  dependency (ADR 0001 3.6).
- `pnpm test:e2e` (Playwright, root config) covers `e2e/*.spec.ts` against a
  built-and-served app (`pnpm build && pnpm preview`, then run e2e from the
  repo root). See `e2e/map-shell.spec.ts` for why the spec forces
  `e2e*Url` query params instead of relying on `.env.local`.
