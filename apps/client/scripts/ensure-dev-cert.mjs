#!/usr/bin/env node
// Generates a local, gitignored self-signed TLS cert for `pnpm dev:https`
// (TL-N03: phones on the LAN need https:// for geolocation to work at all).
//
// Deliberately shells out to the system `openssl` instead of adding an npm
// TLS/cert-generation dependency (ADR 0001: new deps go through a tech-lead
// task). Safe to re-run; it is a no-op once the cert exists.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const certDir = resolve(clientRoot, '.certs');
const certFile = resolve(certDir, 'dev-cert.pem');
const keyFile = resolve(certDir, 'dev-key.pem');
const DAYS_VALID = 365;

if (existsSync(certFile) && existsSync(keyFile)) {
  console.warn(`[dev-cert] already exists: ${certFile}`);
  process.exit(0);
}

mkdirSync(certDir, { recursive: true });

try {
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyFile,
      '-out',
      certFile,
      '-days',
      String(DAYS_VALID),
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ],
    { stdio: 'inherit' },
  );
  console.warn(`[dev-cert] generated ${certFile} (gitignored, *.pem)`);
} catch (error) {
  console.error(
    '[dev-cert] could not run "openssl". Install OpenSSL (macOS/Linux ship it by ' +
      'default) or generate apps/client/.certs/dev-cert.pem + dev-key.pem manually, ' +
      'then re-run "pnpm dev:https". Falling back to plain "pnpm dev" works without HTTPS ' +
      'but a phone on the LAN cannot grant geolocation permission over http://.',
  );
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
}
