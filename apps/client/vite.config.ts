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
import { defineConfig } from 'vite';

const CLIENT_ROOT = import.meta.dirname;
const DEV_CERT_DIR = resolve(CLIENT_ROOT, '.certs');
const DEV_CERT_FILE = resolve(DEV_CERT_DIR, 'dev-cert.pem');
const DEV_KEY_FILE = resolve(DEV_CERT_DIR, 'dev-key.pem');
const PREVIEW_PORT = 4173;

export default defineConfig(({ mode }) => {
  const wantsHttps = mode === 'https';
  const hasDevCert = existsSync(DEV_CERT_FILE) && existsSync(DEV_KEY_FILE);

  return {
    envPrefix: 'VITE_',
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
    },
  };
});
