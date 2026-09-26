// Vite config for the mobile web client spike (P1-F02-T09, ADR 0001 3.2).
//
// `pnpm dev` serves plain HTTP on localhost, which is enough for a desktop
// browser. Geolocation and other secure-context APIs are blocked by mobile
// browsers over LAN http://, so a phone on the same Wi-Fi needs HTTPS
// (TL-N03). `pnpm dev:https` (after `node scripts/ensure-dev-cert.mjs`) reads
// a locally generated, gitignored self-signed cert instead of adding a Vite
// plugin dependency (ADR 0001: no new dependency without a tech-lead task).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { writeBalanceSubset } from './scripts/generate-config';

const CLIENT_ROOT = import.meta.dirname;
const DEV_CERT_DIR = resolve(CLIENT_ROOT, '.certs');
const DEV_CERT_FILE = resolve(DEV_CERT_DIR, 'dev-cert.pem');
const DEV_KEY_FILE = resolve(DEV_CERT_DIR, 'dev-key.pem');
const PREVIEW_PORT = 4173;

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

export default defineConfig(({ mode }) => {
  const wantsHttps = mode === 'https';
  const hasDevCert = existsSync(DEV_CERT_FILE) && existsSync(DEV_KEY_FILE);

  return {
    envPrefix: 'VITE_',
    plugins: [kwBalanceSubsetPlugin()],
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
