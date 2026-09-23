/**
 * Points MapLibre at a Vite-bundled copy of its Web Worker (P1-X23 root-cause fix).
 *
 * maplibre-gl 6's ESM build no longer inlines its worker as a blob. At runtime it derives the
 * worker URL as `new URL('./maplibre-gl-worker.mjs', import.meta.url)` with the file name held in
 * a variable, which Vite/Rolldown cannot detect statically, so the worker file is never emitted
 * into `dist/`. In the built app the request for `/assets/maplibre-gl-worker.mjs` then falls
 * through to the SPA fallback and returns `index.html` (HTTP 200, `text/html`); the module worker
 * dies on the first `<` without any `error` event reaching the map. With no live worker no vector
 * tile is ever parsed and no GeoJSON source ever finishes `loadData`, so `map.on('load')` never
 * fires and the canvas stays black, whatever the style, glyphs, sprite or tile scheme.
 *
 * `?worker&url` makes Vite bundle the worker entry together with its `maplibre-gl-shared.mjs`
 * import into one self-contained asset (default worker format `iife`, which also runs as the
 * module worker MapLibre creates) and hands back its final hashed URL. `setWorkerUrl` must run
 * before the first `new MapLibreMap(...)`, since MapLibre creates its worker pool lazily then.
 * No new dependency: this only uses Vite's built-in worker import suffix.
 */
import { getWorkerUrl, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

/** Idempotent; call before constructing any map. */
export function ensureMapWorkerUrl(): void {
  if (getWorkerUrl() !== maplibreWorkerUrl) {
    setWorkerUrl(maplibreWorkerUrl);
  }
}
