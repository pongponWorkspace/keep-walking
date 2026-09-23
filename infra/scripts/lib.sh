#!/usr/bin/env bash
# Shared helpers for infra/scripts/*.sh (P1-F02-T08). Source, do not execute.
# Mirrors the conventions of tools/tiles/bin/lib.sh (log/die/cfg) so both toolchains read the
# same way, but this file is independent: infra/ must not depend on tools/tiles internals beyond
# its documented output contract (manifest.json, tiles.json, the XYZ directory).
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$INFRA_DIR/.." && pwd)"
PAGES_CONFIG="${PAGES_CONFIG:-$INFRA_DIR/config/pages.json}"

log()  { printf '[infra] %s\n' "$*" >&2; }
die()  { printf '[infra] ERROR: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command '$1'"
}

need jq
need find

# cfg <jq filter> : read a value from infra/config/pages.json, fail if null/missing.
cfg() {
  local v
  v="$(jq -er "$1" "$PAGES_CONFIG")" || die "config value $1 missing in $PAGES_CONFIG"
  printf '%s' "$v"
}

# run_wrangler <args...> : call the pinned wrangler from the root workspace (package.json
# devDependencies, ADR 0001 3.13). Never installs anything extra and never reads a token except
# from the environment (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN, GitHub Actions secrets or a
# developer's own .env.local -- CLAUDE.md "you never hold credentials").
run_wrangler() {
  (cd "$REPO_ROOT" && pnpm exec wrangler "$@")
}

# is_dry_run: true (exit 0) when DRY_RUN=1/true, or when neither Cloudflare env var is set
# (so the scripts are always safe to run locally without credentials, per acceptance
# "local preview ... รันได้โดยไม่ต้องมี credential").
is_dry_run() {
  case "${DRY_RUN:-}" in
    1 | true | TRUE | yes) return 0 ;;
  esac
  if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" || -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    return 0
  fi
  return 1
}

fsize() { wc -c <"$1" | tr -d ' '; }
