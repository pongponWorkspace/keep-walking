#!/usr/bin/env bash
# Build the client (apps/client) against a published tile deploy set, then publish the build to
# the Cloudflare Pages Free "client" project (keep-walking-preview).
#
# usage: publish-client.sh <tiles_manifest.json> <tiles_public_base_url>
#   <tiles_manifest.json>   manifest.json of the tile set that was (or will be) published --
#                            either the cloudflare-pages-xyz one (infra/scripts/publish-tiles.sh)
#                            or the github-pages-pmtiles fallback one. Only `.tileset_id` and
#                            `.layout` are read (documented contract, tech note F02 section 14).
#   <tiles_public_base_url> root URL tiles/glyphs/sprites are served from, no trailing slash
#                            (TILES_PUBLIC_BASE_URL, tech note section 8). For the GitHub Pages
#                            fallback this is the repo's Pages site root
#                            (https://<owner>.github.io/<repo>).
#
# env: DRY_RUN=1  skip `wrangler pages project create`/`deploy`, print the plan instead (also the
#                 default whenever CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN are unset)
source "$(dirname "$0")/lib.sh"
need pnpm

manifest="${1:-}"; base_url="${2:-}"
[[ -f "$manifest" ]] || die "usage: publish-client.sh <tiles_manifest.json> <tiles_public_base_url>"
[[ -n "$base_url" ]] || die "usage: publish-client.sh <tiles_manifest.json> <tiles_public_base_url>"
base_url="${base_url%/}"

tileset_id="$(jq -er '.tileset_id' "$manifest")"
layout="$(jq -er '.layout' "$manifest")"

case "$layout" in
  cloudflare-pages-xyz)
    export VITE_TILES_URL="$base_url/tiles/$tileset_id/tiles.json"
    ;;
  github-pages-pmtiles)
    export VITE_TILES_URL="pmtiles://$base_url/pmtiles/$tileset_id.pmtiles"
    ;;
  *) die "unknown manifest layout '$layout'" ;;
esac
export VITE_GLYPHS_URL="$base_url/glyphs/{fontstack}/{range}.pbf"
export VITE_SPRITE_URL="$base_url/sprites/v4/light"

log "building client: VITE_TILES_URL=$VITE_TILES_URL"
(cd "$REPO_ROOT" && pnpm --filter @keep-walking/client build)

dist="$REPO_ROOT/apps/client/dist"
[[ -d "$dist" ]] || die "$dist missing after build"
headers_dir="$REPO_ROOT/$(cfg .projects.client.headersDir)"
cp "$headers_dir/_headers" "$dist/_headers"

project="$(cfg .projects.client.name)"
branch="$(cfg .productionBranch)"

if is_dry_run; then
  log "DRY RUN: would run:"
  log "  wrangler pages project create $project --production-branch=$branch  (ignored if it already exists)"
  log "  wrangler pages deploy $dist --project-name=$project --branch=$branch --commit-dirty=true"
  log "DRY RUN: no network call made, no credential read. Result URL would be $(cfg .projects.client.url)"
  exit 0
fi

log "ensuring Pages project '$project' exists"
set +e
create_out="$(run_wrangler pages project create "$project" --production-branch="$branch" 2>&1)"
create_rc=$?
set -e
if [[ $create_rc -ne 0 ]] && ! grep -qi "already exists" <<<"$create_out"; then
  printf '%s\n' "$create_out" >&2
  die "wrangler pages project create failed for '$project'"
fi
[[ $create_rc -ne 0 ]] && log "project '$project' already exists, continuing"

log "deploying $dist to Pages project '$project' (branch $branch)"
run_wrangler pages deploy "$dist" --project-name="$project" --branch="$branch" --commit-dirty=true
log "done: $(cfg .projects.client.url)"
