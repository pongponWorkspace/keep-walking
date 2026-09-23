#!/usr/bin/env bash
# Re-point every tiles.json under a built tree to a new public base URL, without rebuilding.
# TileJSON needs absolute tile URLs (MapLibre does not resolve them against the TileJSON URL).
# The publish step (P1-F02-T08) runs this with TILES_PUBLIC_BASE_URL before deploying; the client
# dev server (P1-F02-T11) can run it on a copy of the fixture.
#
# usage: set-public-url.sh <root-dir> <base-url-without-trailing-slash>
#   e.g. set-public-url.sh tools/tiles/out/publish "$TILES_PUBLIC_BASE_URL"
source "$(dirname "$0")/lib.sh"
[[ $# -eq 2 ]] || die "usage: set-public-url.sh <root-dir> <base-url>"
root="$1"; base="${2%/}"
[[ "$base" =~ ^https?://[^/]+ ]] || die "base URL must start with http:// or https:// (got '$base')"
n=0
while IFS= read -r -d '' tj; do
  id="$(basename "$(dirname "$tj")")"
  tmp="$tj.tmp"
  jq --arg u "$base/tiles/$id/{z}/{x}/{y}.mvt" '.tiles = [$u]' "$tj" >"$tmp" && mv "$tmp" "$tj"
  log "$tj -> $(jq -r '.tiles[0]' "$tj")"
  n=$((n + 1))
done < <(find "$root/tiles" -mindepth 2 -maxdepth 2 -name tiles.json -print0)
(( n > 0 )) || die "no tiles/<tileset_id>/tiles.json under $root"
