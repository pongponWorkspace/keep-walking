#!/usr/bin/env bash
# Serve a built deploy directory locally, no Cloudflare account or credential needed
# (docs/tech/environments.md section 1 "local" row; board acceptance "local preview ...
# รันได้โดยไม่ต้องมี credential"). Uses `wrangler pages dev`, which is a pure local static
# server for a plain asset directory (no wrangler.toml / bindings here, so it never asks for a
# Cloudflare login).
#
# usage: local-preview.sh <dir> [port]
#   e.g. local-preview.sh tools/tiles/out/publish 8788     # tiles (after infra adds _headers/404)
#        local-preview.sh apps/client/dist 8789             # client build
#
# `wrangler pages dev` does not evaluate `_headers` `Content-Type` overrides for every MIME type
# the way the real Cloudflare edge does, so it is a sanity check (does the map load, does 404.html
# come back for a missing tile) rather than a byte-for-byte stand-in for the curl checks in
# infra/runbooks/preview-setup.md, which must be run against the real deployed URL.
source "$(dirname "$0")/lib.sh"
need pnpm

dir="${1:-}"; port="${2:-8788}"
[[ -n "$dir" && -d "$dir" ]] || die "usage: local-preview.sh <dir> [port]"

log "serving $dir on http://127.0.0.1:$port (Ctrl-C to stop, no credential read)"
(cd "$REPO_ROOT" && pnpm exec wrangler pages dev "$dir" --port "$port" --ip 127.0.0.1)
