#!/usr/bin/env bash
# Shared helpers for tools/tiles scripts (P1-F02-T06). Source, do not execute.
# Every tunable value comes from tools/tiles/config.json via cfg().
# shellcheck disable=SC2034  # variables are used by the scripts that source this file
set -euo pipefail

TILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$TILES_DIR/../.." && pwd)"
CONFIG="${TILES_CONFIG:-$TILES_DIR/config.json}"
DOWNLOADS="$TILES_DIR/downloads"
OUT="$TILES_DIR/out"
PUBLISH="$OUT/publish"

log()  { printf '[tiles] %s\n' "$*" >&2; }
die()  { printf '[tiles] ERROR: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command '$1' (see README.md, section requirements)"
}

need jq
need curl

# cfg <jq filter> : print a raw value from config.json, fail if null.
cfg() {
  local v
  v="$(jq -er "$1" "$CONFIG")" || die "config value $1 missing in $CONFIG"
  printf '%s' "$v"
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else shasum -a 256 "$1" | awk '{print $1}'; fi
}

# verify_sha256 <file> <expected>
verify_sha256() {
  local got
  got="$(sha256_of "$1")"
  [[ "$got" == "$2" ]] || die "checksum mismatch for $1: expected $2, got $got"
}

# file size in bytes (BSD and GNU stat differ)
fsize() { wc -c <"$1" | tr -d ' '; }

platform_key() {
  local os arch
  os="$(uname -s)"; arch="$(uname -m)"
  case "$arch" in aarch64) arch=arm64 ;; amd64) arch=x86_64 ;; esac
  printf '%s_%s' "$os" "$arch"
}

PMTILES_VERSION="$(cfg .tools.pmtiles.version)"
PMTILES_BIN="$DOWNLOADS/pmtiles-$PMTILES_VERSION/pmtiles"

build_key()  { cfg .schema.buildKey; }
tileset_id() { # tileset_id <maxzoom>
  cfg .schema.tilesetIdTemplate | sed -e "s/{build}/$(build_key)/" -e "s/{maxzoom}/$1/"
}
bbox_csv() { jq -r "$1 | map(tostring) | join(\",\")" "$CONFIG"; }
