// Vite config for the mobile web client spike (P1-F02-T09, ADR 0001 3.2).
//
// `pnpm dev` serves plain HTTP on localhost, which is enough for a desktop
// browser. Geolocation and other secure-context APIs are blocked by mobile
// browsers over LAN http://, so a phone on the same Wi-Fi needs HTTPS
// (TL-N03). `pnpm dev:https` (after `node scripts/ensure-dev-cert.mjs`) reads
// a locally generated, gitignored self-signed cert instead of adding a Vite
// plugin dependency (ADR 0001: no new dependency without a tech-lead task).
import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { writeBalanceSubset } from './scripts/generate-config';

const CLIENT_ROOT = import.meta.dirname;
const DEV_CERT_DIR = resolve(CLIENT_ROOT, '.certs');
const DEV_CERT_FILE = resolve(DEV_CERT_DIR, 'dev-cert.pem');
const DEV_KEY_FILE = resolve(DEV_CERT_DIR, 'dev-key.pem');
const PREVIEW_PORT = 4173;

/** `tools/art`'s own staged output (`tools/art/out/client/`, gitignored, built by the root
 * `prebuild` step — never imported as a module here, only read as static files off disk, ESLint's
 * `TOOLS_IMPORT_BAN` only bans `import`/`require` of `tools/*`). */
const ART_OUT_CLIENT = resolve(CLIENT_ROOT, '..', '..', 'tools', 'art', 'out', 'client');
const KW_PREFIX = '/kw/';

const KW_CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
};

/**
 * F-04 (docs/tech/F04-dungeon-presence.md section 15, ADR 0003 9.3): regenerates the committed
 * `src/config/generated/balance-subset.generated.json` before every `vite dev`/`vite build`/`vite
 * preview`, so a `config/balance/*.json` edit that a developer forgot to run
 * `apps/client/scripts/generate-config.ts` for still reaches the dev server/build with the latest
 * whitelisted values — never the raw file itself (`buildStart` runs before any module is resolved,
 * so `config/balance.ts`'s import of the generated file always sees the freshly written one).
 * `config/generated.test.ts` still fails `pnpm test` on a stale commit; this plugin only keeps
 * `pnpm dev`/`pnpm build` themselves from serving stale data in the meantime.
 */
function kwBalanceSubsetPlugin(): Plugin {
  return {
    name: 'kw-balance-subset',
    buildStart(): void {
      writeBalanceSubset();
    },
  };
}

const DIST_KW = resolve(CLIENT_ROOT, 'dist', 'kw');

/**
 * `docs/tech/asset-delivery.md` section 6.1: "Vite ของ client copy `tools/art/out/client/` ทั้ง
 * โฟลเดอร์ไปที่ `dist/kw/` ตอน build ... และตอน dev เสิร์ฟโฟลเดอร์เดียวกันที่ `/kw/`" — this plugin
 * is both halves. `configureServer` (`pnpm dev`) serves `ART_OUT_CLIENT` directly, straight off the
 * `tools/art prebuild` output, so an iterating dev sees an asset change without a full build.
 * `configurePreviewServer` (`pnpm preview`, and the `webServer` every e2e spec runs against, root
 * `playwright.config.ts`) instead serves the resolved `DIST_KW` — the exact bytes `closeBundle`
 * copied there, the same ones a real deploy ships — so an e2e spec checks the actual committed
 * `closeBundle` copy step, not a dev-only shortcut around it (P2-H03: `configurePreviewServer`
 * previously also pointed at `ART_OUT_CLIENT`, so a bug only `closeBundle`'s copy could introduce
 * would never have shown up under `pnpm test:e2e`). No `Cache-Control` header is added here (TL
 * P2-H12): this middleware only serves bytes, it does not decide caching policy for either root.
 * `closeBundle` copies the same folder into `dist/kw/` once the build's own JS/CSS output has been
 * written. A missing root (prebuild not run, or nothing built yet) is a no-op everywhere — the
 * client's own `assets/manifest.ts` fallback (`§6.4`) handles a missing `/kw/asset-manifest.json`
 * at runtime; this plugin never fails the build over it.
 */
function kwAssetStagePlugin(): Plugin {
  function serveKwFrom(root: string) {
    return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
      const url = req.url;
      if (url === undefined || !url.startsWith(KW_PREFIX)) {
        next();
        return;
      }
      const relative = decodeURIComponent(url.slice(KW_PREFIX.length).split('?')[0] ?? '');
      const resolved = normalize(join(root, relative));
      if (resolved !== root && !resolved.startsWith(root + sep)) {
        next();
        return;
      }
      if (!existsSync(resolved) || !statSync(resolved).isFile()) {
        next();
        return;
      }
      res.setHeader(
        'content-type',
        KW_CONTENT_TYPES[extname(resolved)] ?? 'application/octet-stream',
      );
      res.end(readFileSync(resolved));
    };
  }

  return {
    name: 'kw-asset-stage',
    configureServer(server) {
      server.middlewares.use(serveKwFrom(ART_OUT_CLIENT));
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveKwFrom(DIST_KW));
    },
    closeBundle(): void {
      if (!existsSync(ART_OUT_CLIENT)) return;
      cpSync(ART_OUT_CLIENT, DIST_KW, { recursive: true });
    },
  };
}

export default defineConfig(({ mode }) => {
  const wantsHttps = mode === 'https';
  const hasDevCert = existsSync(DEV_CERT_FILE) && existsSync(DEV_KEY_FILE);

  return {
    envPrefix: 'VITE_',
    plugins: [kwBalanceSubsetPlugin(), kwAssetStagePlugin()],
    server: {
      // Listen on the LAN interface, not just localhost, so a phone on the
      // same Wi-Fi can reach `pnpm dev` / `pnpm dev:https` (TL-N03).
      host: true,
      ...(wantsHttps && hasDevCert
        ? { https: { cert: readFileSync(DEV_CERT_FILE), key: readFileSync(DEV_KEY_FILE) } }
        : {}),
    },
    preview: {
      host: true,
      port: PREVIEW_PORT,
    },
    build: {
      sourcemap: true,
      // P2-F04-T10 (ADR 0003 section 10): `apps/client/scripts/measure-bundle.ts` reads
      // `dist/.vite/manifest.json` to tell the initial (static-import) JS apart from the lazy
      // maplibre-gl chunk group `main.ts`'s `loadMapModules` only `await import(...)`s.
      manifest: true,
    },
  };
});
