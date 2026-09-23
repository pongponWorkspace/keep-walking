#!/usr/bin/env bash
# Publish a built tile deploy set to the Cloudflare Pages Free "map" project (keep-walking-map).
# Consumes ONLY the documented output contract of tools/tiles/bin/build.sh: manifest.json,
# tiles.json, and the XYZ directory (never tools/tiles/config.json or other internals).
#
# usage: publish-tiles.sh <publish_dir> [--allow-over-target]
# env:   DRY_RUN=1            skip `wrangler pages project create`/`deploy`, print the plan instead
#                              (also the default whenever CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN
#                              are unset, so this is always safe to run without credentials)
#        CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN   read by `wrangler` itself, never by this
#                              script (CLAUDE.md "you never hold credentials")
#
# exit codes: 0 published (or dry-run passed) · 10 over target budget and --allow-over-target not
#             given (nothing was uploaded) · 20 over the hard Cloudflare Pages cap (never uploads)
source "$(dirname "$0")/lib.sh"
need pnpm

dir=""
allow_over=0
for a in "$@"; do
  case "$a" in
    --allow-over-target) allow_over=1 ;;
    -*) die "unknown flag $a" ;;
    *) dir="$a" ;;
  esac
done
[[ -n "$dir" && -d "$dir" ]] || die "usage: publish-tiles.sh <publish_dir> [--allow-over-target]"

manifest="$dir/manifest.json"
[[ -f "$manifest" ]] || die "$manifest missing -- run tools/tiles/bin/build.sh first"
layout="$(jq -er '.layout' "$manifest")"
[[ "$layout" == "cloudflare-pages-xyz" ]] \
  || die "manifest layout is '$layout', not 'cloudflare-pages-xyz' -- use prepare-ghpages-fallback.sh instead (tech note 7.3 fallback step 3)"
tileset_id="$(jq -er '.tileset_id' "$manifest")"

project="$(cfg .projects.map.name)"
branch="$(cfg .productionBranch)"
headers_dir="$REPO_ROOT/$(cfg .projects.map.headersDir)"

log "assembling Pages headers/404 into $dir (tileset $tileset_id)"
cp "$headers_dir/_headers" "$dir/_headers"
cp "$headers_dir/404.html" "$dir/404.html"

set +e
"$(dirname "$0")/check-file-budget.sh" "$dir"
budget_rc=$?
set -e
if [[ $budget_rc -eq 20 ]]; then
  die "over the Cloudflare Pages hard cap -- do not publish (see tech note 7.3 fallback step 2: lower maxzoom, or step 3: GitHub Pages)"
fi
if [[ $budget_rc -eq 10 && $allow_over -eq 0 ]]; then
  die "over the target budget -- rerun with --allow-over-target to publish anyway, or shrink the build first"
fi

if is_dry_run; then
  log "DRY RUN: would run:"
  log "  wrangler pages project create $project --production-branch=$branch  (ignored if it already exists)"
  log "  wrangler pages deploy $dir --project-name=$project --branch=$branch --commit-dirty=true"
  log "DRY RUN: no network call made, no credential read. Result URL would be $(cfg .projects.map.url)"
  exit 0
fi

log "ensuring Pages project '$project' exists"
set +e
create_out="$(run_wrangler pages project create "$project" --production-branch="$branch" 2>&1)"
create_rc=$?
set -e
if [[ $create_rc -ne 0 ]] && ! grep -qi "already exists" <<<"$create_out"; then
  printf '%s\n' "$create_out" >&2
  die "wrangler pages project create failed for '$project' (check token scope: Account > Cloudflare Pages > Edit)"
fi
[[ $create_rc -ne 0 ]] && log "project '$project' already exists, continuing"

log "deploying $dir to Pages project '$project' (branch $branch)"
run_wrangler pages deploy "$dir" --project-name="$project" --branch="$branch" --commit-dirty=true

log "done: $(cfg .projects.map.url)/tiles/$tileset_id/tiles.json"
