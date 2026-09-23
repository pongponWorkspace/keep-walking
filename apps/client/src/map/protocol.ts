/**
 * Registers the two URL protocols MapLibre resources travel through, both so the byte counters in
 * `debug/byte-counter.ts` see every tile/style/glyph/sprite byte MapLibre loads in its Web Worker
 * (docs/tech/F02-map-location-spike.md section 11, TL-S07):
 *
 * - `pmtiles://<url>` (D-031, unchanged scheme): a counting `pmtiles.Source` wraps `FetchSource`
 *   and is pre-registered on the global `pmtiles.Protocol` via `.add()`, so every `getBytes` call
 *   PMTiles makes for that archive (tile bytes AND header/directory bytes, per the tech note's
 *   "รวม header/directory") adds to the `tiles` category before MapLibre ever sees the response.
 * - `kw+https://<real-https-url>`: this workspace's own protocol for the XYZ/TileJSON path and for
 *   style/glyph/sprite requests (section 11 table rows "tile แบบ XYZ" and "style, glyph, sprite").
 *   The handler strips the `kw+` prefix, `fetch()`s the real URL on the main thread (where `fetch`
 *   is countable, unlike a worker's request MapLibre makes internally for `pmtiles://`), adds the
 *   decoded byte length to the category encoded in the `__kwCategory` query param, then strips that
 *   param back out before returning bytes to MapLibre so no query-string leaks into anything MapLibre
 *   itself logs or caches by URL.
 *
 * Both protocols are idempotent to register (guarded booleans) since `main.ts` may re-run this in a
 * hot-reload dev session.
 */
import { addProtocol } from 'maplibre-gl';
import type { GetResourceResponse, RequestParameters } from 'maplibre-gl';
import { FetchSource, PMTiles, Protocol } from 'pmtiles';
import type { RangeResponse, Source as PmtilesSource } from 'pmtiles';
import { countBytes } from '../debug/byte-counter';
import type { ByteCategory } from '../debug/byte-counter';

export const PMTILES_PROTOCOL = 'pmtiles';
export const KW_HTTPS_PROTOCOL = 'kw+https';
const KW_CATEGORY_PARAM = '__kwCategory';
/** Carries the real URL's original scheme (`http`/`https`) through the `kw+https://` wrapper: a
 * local fixture/dev server (e.g. `tools/tiles/bin/serve.py` at `http://127.0.0.1:8765`) is `http`,
 * not `https`, and always reconstructing as `https://` breaks that with `ERR_SSL_PROTOCOL_ERROR`. */
const KW_SCHEME_PARAM = '__kwScheme';
const DEFAULT_SCHEME = 'https';

let pmtilesProtocol: Protocol | undefined;
let kwHttpsRegistered = false;

/** Wraps a `pmtiles.Source`, adding every `getBytes` response's byte length to the `tiles` counter.
 * Exported for a direct unit test (`protocol.test.ts`); real callers use `registerCountingPmtilesArchive`. */
export class CountingPmtilesSource implements PmtilesSource {
  constructor(private readonly inner: PmtilesSource) {}

  getKey(): string {
    return this.inner.getKey();
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string,
  ): Promise<RangeResponse> {
    const result = await this.inner.getBytes(offset, length, signal, etag);
    countBytes('tiles', result.data.byteLength);
    return result;
  }
}

/** `addProtocol` is process-global in MapLibre; register both handlers once. */
export function ensureMapProtocolsRegistered(): void {
  if (pmtilesProtocol === undefined) {
    pmtilesProtocol = new Protocol();
    addProtocol(PMTILES_PROTOCOL, pmtilesProtocol.tile);
  }
  if (!kwHttpsRegistered) {
    addProtocol(KW_HTTPS_PROTOCOL, kwHttpsHandler);
    kwHttpsRegistered = true;
  }
}

/** Pre-registers a counting PMTiles instance for `url` so `pmtiles://<url>` resolves to it. */
export function registerCountingPmtilesArchive(url: string): void {
  ensureMapProtocolsRegistered();
  const counting = new CountingPmtilesSource(new FetchSource(url));
  pmtilesProtocol?.add(new PMTiles(counting));
}

/**
 * Builds a `kw+https://` URL carrying its byte-counting category. Uses plain string
 * concatenation, never `new URL(...)`: glyph and XYZ tile templates still contain literal
 * `{fontstack}`/`{range}`/`{z}`/`{x}`/`{y}` placeholders at this point (MapLibre substitutes them
 * later, at request time), and the WHATWG `URL` parser percent-encodes `{`/`}` in a path, which
 * would break MapLibre's own literal `string.replace('{fontstack}', ...)` substitution.
 */
export function toKwHttpsUrl(realHttpsUrl: string, category: ByteCategory): string {
  const schemeMatch = /^(https?):\/\//.exec(realHttpsUrl);
  const scheme = schemeMatch?.[1] ?? DEFAULT_SCHEME;
  const withoutScheme =
    schemeMatch !== null ? realHttpsUrl.slice(schemeMatch[0].length) : realHttpsUrl;
  const separator = withoutScheme.includes('?') ? '&' : '?';
  return (
    `${KW_HTTPS_PROTOCOL}://${withoutScheme}${separator}` +
    `${KW_CATEGORY_PARAM}=${category}&${KW_SCHEME_PARAM}=${scheme}`
  );
}

/** Splits a resolved (brace-free) URL into its base and query string without a `new URL(...)`
 * round-trip, which is unnecessary here since MapLibre has already substituted every template
 * placeholder by the time this handler runs. */
function splitQuery(url: string): { base: string; params: URLSearchParams } {
  const questionMarkIndex = url.indexOf('?');
  if (questionMarkIndex === -1) {
    return { base: url, params: new URLSearchParams() };
  }
  return {
    base: url.slice(0, questionMarkIndex),
    params: new URLSearchParams(url.slice(questionMarkIndex + 1)),
  };
}

/** Exported for a direct unit test (`protocol.test.ts`) of the http/https round trip; MapLibre
 * itself only ever reaches this via the `addProtocol` registration in `ensureMapProtocolsRegistered`. */
export async function kwHttpsHandler(
  params: RequestParameters,
  abortController: AbortController,
): Promise<GetResourceResponse<ArrayBuffer>> {
  // Plain prefix strip, not a RegExp built from KW_HTTPS_PROTOCOL: '+' is a regex quantifier
  // metacharacter, and `kw+https` contains a literal one — `new RegExp('^kw+https://')` would
  // match "kwwwhttps://" (one-or-more "w") and silently never match the real, literal prefix.
  const prefix = `${KW_HTTPS_PROTOCOL}://`;
  const withoutScheme = params.url.startsWith(prefix)
    ? params.url.slice(prefix.length)
    : params.url;
  const { base, params: query } = splitQuery(withoutScheme);
  const category = (query.get(KW_CATEGORY_PARAM) ?? 'tiles') as ByteCategory;
  const scheme = query.get(KW_SCHEME_PARAM) ?? DEFAULT_SCHEME;
  query.delete(KW_CATEGORY_PARAM);
  query.delete(KW_SCHEME_PARAM);
  const queryString = query.toString();
  const realUrl = `${scheme}://${base}${queryString.length > 0 ? `?${queryString}` : ''}`;
  const response = await fetch(realUrl, { signal: abortController.signal });
  if (!response.ok) {
    throw new Error(`kw+https: ${response.status} ${response.statusText}`);
  }
  const data = await response.arrayBuffer();
  countBytes(category, data.byteLength);
  return { data };
}
