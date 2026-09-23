# @keep-walking/client

Mobile web client (Vite + MapLibre GL JS + PMTiles). Owner: gameplay-programmer.
Layout and dependency rules: `docs/adr/0001-repo-layout.md`.

Scope so far:
- P1-F02-T09: a PMTiles basemap renders in a MapLibre map on a mobile viewport.
- P1-F02-T10: `LocationProvider` (Web/Mock/Capacitor, `@keep-walking/location`)
  wired to the map — position dot, accuracy circle, follow mode, and the
  `gps.*` status UI (searching/off/denied/unsupported/lowAccuracy/offline,
  restored/suspended toasts). See "Location / GPS spike" below.
- P1-F02-T11: the real art-directed Bangkok style
  (`art/direction/map-style/kw-light.style.json`) loads at runtime with
  either a `pmtiles://` archive or a TileJSON/XYZ host behind one
  `VITE_TILES_URL` (D-031); the `hud=1` debug panel (FPS, battery, byte
  counters by category, accuracy/gap/gate/latency stats) and its two export
  buttons (summary CSV, opt-in raw trace). See "Map style + tiles (P1-F02-T11,
  D-031)" and "Debug HUD (P1-F02-T11)" below.

Still out of scope: any reward logic (client never computes drops, damage,
or the movement gate — CLAUDE.md; the HUD's own gate-window number is a
spike measurement only, see `src/debug/stats.ts`).

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

`VITE_TILES_URL`, `VITE_GLYPHS_URL`, `VITE_SPRITE_URL` — all three are empty
in `.env.example` (tech-lead D-044): the value it used to carry was a
schema-v3 build that does not match the v4 art-directed style. Copy the file
to `.env.local` and uncomment one of the two options documented there. None
of these are hardcoded in source; an unset `VITE_TILES_URL` (or glyphs/sprite)
shows an honest "not configured" state instead of a blank canvas
(`src/main.ts`, `src/map.ts`'s `isRuntimeMapEnv`).

## Map style + tiles (P1-F02-T11, D-031)

`src/map/style.ts` fetches `art/direction/map-style/kw-light.style.json` at
runtime and replaces its four `https://kw-placeholder.invalid` placeholders
with the three `VITE_*` values (art/direction/map-style.md section 3),
throwing if any placeholder survives substitution. `VITE_TILES_URL` picks the
scheme (docs/tech/F02-map-location-spike.md section 8):

- starts with `pmtiles://` → a counting `pmtiles.Source`
  (`src/map/protocol.ts`) is registered for the archive so every byte PMTiles
  fetches (header, directory, tiles) is counted.
- ends with `.json` → the client fetches the TileJSON itself, inlines it into
  the style (no bare `url`), and rewrites every tile URL onto the `kw+https://`
  protocol so MapLibre's own tile fetches get counted too.

`src/map/geo-sources.ts` loads `data/map/playarea-mask.geojson` and
`data/map/provinces.geojson` into the style's `kw-playarea-mask`/
`kw-provinces` sources after `load`; a missing/invalid file leaves the empty
`FeatureCollection` the style shipped with and only `console.warn`s (never a
crash). `src/map/runtime-images.ts` rasterizes
`art/direction/map-style/icons/rift-crack.svg` and registers it as
`kw-rift-crack` (`pixelRatio: 2`). `src/map/location-layer.ts` feeds this
device's own position/accuracy into the style's `kw-self` source (never
another player's, non-negotiable 4).

Style validator (`@maplibre/maplibre-gl-style-spec`, root devDependency,
P1-X05): `node node_modules/.pnpm/@maplibre+maplibre-gl-style-spec@26.4.4/node_modules/@maplibre/maplibre-gl-style-spec/dist/gl-style-validate.mjs art/direction/map-style/kw-light.style.json` — exit 0, no errors.

Local fixture tiles (P1-F02-T06, `tools/tiles/fixtures/lumpini/`): run
`python3 tools/tiles/bin/serve.py` in another shell, then use the `.env.example`
"(a)" block's three `VITE_*` values (Lumpini Park, real Protomaps v4 data, no
external host — see `tools/tiles/README.md`).

## Location / GPS spike (P1-F02-T10)

`?loc=web|mock|capacitor` picks the `LocationProvider` (default: `mock` in
`pnpm dev`, `web` in a build/preview — `config/app/client.json
#providerQueryDefaultsByMode`). Mock-only: `?trace=<meta.id>` (default: the
first trace under `data/gps-traces/`, sorted), `?speed=1|10|60`, `?loop=1|0`.
`?hud=1` installs `window.__kwSpike` (position/state/provider/gpsDisplay) for
e2e; it does not exist otherwise (tech note section 13).

Example: `http://localhost:5173/?loc=mock&trace=synthetic-park-loop-01&speed=60&hud=1`

- `src/location/select.ts` — parses the query string against
  `config/app/client.json#providerQuery`.
- `src/location/session.ts` — builds the concrete provider and wires its
  callbacks; the only file that constructs one (everywhere else uses the
  `LocationProvider` interface, CLAUDE.md).
- `src/location/gps-status.ts` — derives the `gps.*` display state
  (searching/off/denied/unsupported/lowAccuracy) and the restored/suspended
  toasts from the provider's callbacks; thresholds come from
  `config/balance/location.json#homeState`.
- `src/copy/gps-state.ts` — the `GpsDisplayState -> gps.*` copy-key table
  (design/ux/flows/F03-core-loop.md 9.5). A key missing from
  `copy.th.json` shows as its own name (TL-N06), never a blank label.
- `src/map/location-layer.ts`, `src/map/geo-circle.ts` — the position dot,
  accuracy circle (a real-world-metre polygon, not a pixel radius), and the
  follow-mode camera.
- `src/location/traces.ts` — lazily loads `data/gps-traces/**/*.trace.json`
  (`import.meta.glob`, not `eager`) so a production build (`loc=web` by
  default) never ships any trace data.

## Debug HUD (P1-F02-T11)

`?hud=1` additionally dynamically `import()`s `src/debug/hud-panel.ts` (never
in the production JS bundle when `hud` is off, S5 budget) and mounts a panel
inside `#hud` with a live text readout plus two buttons:

- **Export summary CSV** (`#hud-export-summary`) — no coordinates, default
  export (`docs/tech/gps-trace-format.md` 4.1, `src/debug/csv-export.ts`).
- **Export raw trace (opt-in)** (`#hud-export-raw`) — trims `rawTraceTrim_m`
  off both ends, rounds coordinates, shifts to relative time, and runs
  `validateTrace` before ever offering the file
  (`src/debug/raw-trace-export.ts`, `config/app/privacy.json#rawTraceExport`).
  Refuses (logs, downloads nothing) rather than exporting an unsafe trace.

`window.__kwSpike.hud` mirrors the same row once a second for e2e/QA (see
`src/debug/spike-hook.ts`'s `SpikeHudMetrics` — identical shape to one CSV
row). `window.__kwSpike.map` is the live MapLibre `Map` (this device's own
camera only, non-negotiable 4) for driving the camera without a UI control
(e.g. QA/T14's field-walk kit).

Measurement math (FPS, byte totals by category, accuracy/gap/gate/latency
percentiles) lives in `src/debug/stats.ts`, `src/debug/byte-counter.ts`,
`src/debug/fps-sampler.ts` — pure and unit-tested, matching
`docs/tech/F02-map-location-spike.md` section 10.5's definitions. The
gate-window number is a spike measurement only (`stats.ts`'s header comment):
the real movement gate lives in `packages/shared` (Phase 2) and the server
(Phase 3), never here.

## Tests

- `pnpm test` (Vitest, root config) covers `src/**/*.test.ts` — pure logic
  only (`env.ts`, `map/style.ts`, `debug/*.ts`, etc.), no DOM, so it needs no
  jsdom/happy-dom dependency (ADR 0001 3.6). DOM-only glue (`ui/gps-ui.ts`,
  `map/location-layer.ts`, `debug/hud-panel.ts`) is covered by e2e instead.
- `pnpm test:e2e` (Playwright, root config) covers `e2e/*.spec.ts` against a
  built-and-served app (`pnpm build && pnpm preview`, then run e2e from the
  repo root) on both `android-chrome` and `ios-safari` projects. See
  `e2e/map-shell.spec.ts` for why the spec forces `e2e*Url` query params
  instead of relying on `.env.local` (network-free, real fixture bytes never
  downloaded in CI).
- Manual field-walk-readiness check (P1-F02-T11) found the real committed
  Lumpini fixture never finished loading visible tiles in this sandbox's
  headless Chromium — `map.on('load')` never fired, whatever the tile scheme.
  **Root cause and fix (P1-X23, D-068, `src/map/worker.ts`):** MapLibre GL JS
  6's ESM build derives its Web Worker URL at runtime as
  `new URL('./maplibre-gl-worker.mjs', import.meta.url)` with the file name
  held in a variable, which Vite/Rolldown cannot detect statically, so the
  worker file was never emitted into `dist/`. In the built app the request
  for `/assets/maplibre-gl-worker.mjs` fell through to the SPA fallback and
  returned `index.html` (HTTP 200, `text/html`); the module worker died on
  the first `<` with no `error` event reaching the map. With no live worker
  no vector tile is ever parsed and no GeoJSON source ever finishes
  `loadData`, so `load` never fires and the canvas stays black — style/source
  *metadata* (bounds, zoom, attribution) still loads fine, which is why only
  tile *pixels* were missing. The fix imports the worker through Vite's
  built-in `?worker&url` suffix
  (`import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'`)
  so Vite bundles it as a real hashed asset, then calls `setWorkerUrl` before
  the first `new MapLibreMap(...)` (`src/map/worker.ts`'s `ensureMapWorkerUrl`,
  called from `src/map.ts`). No new dependency. Regression-tested end to end
  against the real committed fixture and the real `kw-light.style.json`
  (`e2e/map-real-fixture.spec.ts`: `load` fires, the worker script itself
  loads, and Lumpini tiles render with Thai labels via both `pmtiles://` and
  TileJSON/XYZ). See `studio/decisions/decision-log.md` D-068.
