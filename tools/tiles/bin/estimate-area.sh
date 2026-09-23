#!/usr/bin/env bash
# Estimate tile count and archive size for any bbox without downloading tiles
# (pmtiles extract --dry-run against the pinned build; needs network, no account).
# usage: estimate-area.sh <minlon,minlat,maxlon,maxlat|thailand|area> <maxzoom> [--region FILE]
source "$(dirname "$0")/lib.sh"
[[ $# -ge 2 ]] || die "usage: estimate-area.sh <bbox|thailand|area> <maxzoom> [--region FILE]"
case "$1" in
  thailand) bbox="$(bbox_csv .estimates.thailandBbox)" ;;
  area)     bbox="$(bbox_csv .area.bbox)" ;;
  *)        bbox="$1" ;;
esac
z="$2"; shift 2
sel=(--bbox="$bbox")
[[ "${1:-}" == --region ]] && sel=(--region="$2")
[[ -x "$PMTILES_BIN" ]] || "$TILES_DIR/bin/fetch-tools.sh"
out="$("$PMTILES_BIN" extract "$(cfg .schema.sourceUrl)" /dev/null "${sel[@]}" --maxzoom="$z" --dry-run 2>&1)" \
  || { printf '%s\n' "$out" >&2; die "dry-run failed"; }
tiles="$(printf '%s\n' "$out" | sed -nE 's/.*Region tiles ([0-9]+), result tile entries ([0-9]+).*/\1 \2/p')"
size="$(printf '%s\n' "$out" | sed -nE 's/.*archive size of (.*)$/\1/p')"
printf 'selection=%s maxzoom=%s region_tiles=%s tile_entries=%s pmtiles_size=%s\n' \
  "${sel[*]}" "$z" "${tiles% *}" "${tiles#* }" "$size"
