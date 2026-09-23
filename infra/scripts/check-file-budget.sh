#!/usr/bin/env bash
# Independent file-count/size check for a Cloudflare Pages Free deploy directory
# (P1-F02-T08, tech note F02 section 7.1/7.4, board acceptance "file-count check before publish").
#
# This is a second, independent check on top of tools/tiles/bin/size-report.sh: it reads only
# the filesystem of the directory that is about to be uploaded (after infra has already copied in
# _headers and 404.html), never tools/tiles/config.json or its manifest.json numbers. That way a
# bug or a stale report in the tile pipeline cannot silently let an over-budget deploy through.
#
# usage: check-file-budget.sh <publish_dir>
# exit codes: 0 ok (within target) · 10 over target (soft, publish-tiles.sh may still proceed
#             with --allow-over-target) · 20 over hard cap (always fails)
source "$(dirname "$0")/lib.sh"

dir="${1:-}"
[[ -n "$dir" && -d "$dir" ]] || die "usage: check-file-budget.sh <publish_dir> (directory not found: ${dir:-<empty>})"

cap_files="$(cfg .budget.pagesMaxFilesPerDeploy)"
cap_bytes="$(cfg .budget.pagesMaxFileBytes)"
target_files="$(cfg .budget.targetMaxFilesPerDeploy)"
target_tiles="$(cfg .budget.targetMaxTileFiles)"

total_files="$(find "$dir" -type f | wc -l | tr -d ' ')"
tile_files="$(find "$dir" -path '*/tiles/*' -name '*.mvt' -type f | wc -l | tr -d ' ')"
# Largest file, portable between BSD (macOS, local dev) and GNU (CI) `find`/`stat`.
biggest="$(find "$dir" -type f -exec sh -c 'wc -c "$1" 2>/dev/null' _ {} \; \
  | awk '{print $1}' | sort -n | tail -1)"
biggest="${biggest:-0}"

log "deploy dir: $dir"
log "tiles: $tile_files / target $target_tiles"
log "total files: $total_files / target $target_files / hard cap $cap_files"
log "largest file: $biggest bytes / hard cap $cap_bytes bytes"

rc=0
if (( total_files > cap_files )); then
  log "FAIL: $total_files files exceeds Cloudflare Pages hard cap of $cap_files"
  rc=20
fi
if (( biggest > cap_bytes )); then
  log "FAIL: largest file is $biggest bytes, hard cap is $cap_bytes bytes"
  rc=20
fi
if (( rc == 0 )); then
  if (( tile_files > target_tiles )); then
    log "OVER TARGET: $tile_files tile files > target $target_tiles (still under hard cap)"
    rc=10
  fi
  if (( total_files > target_files )); then
    log "OVER TARGET: $total_files total files > target $target_files (still under hard cap)"
    rc=10
  fi
fi
[[ $rc -eq 0 ]] && log "PASS: within target budget"
exit "$rc"
