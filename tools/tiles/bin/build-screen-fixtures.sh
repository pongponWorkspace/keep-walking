#!/usr/bin/env bash
# Build the small committed screen fixtures (P2-F04-T23): one per map-style 10.1 screen that the
# Lumphini fixture does not cover (S2 soi, S5 river, S6 coast at z10 and z13). Config:
# config.json#screenFixtures. Layout per fixture (same as the Lumphini fixture, minus glyphs and
# sprites, which the viewer takes from fixtures/lumpini/):
#   fixtures/screens/<name>/pmtiles/<id>.pmtiles           PMTiles source  (pmtiles://...)
#   fixtures/screens/<name>/tiles/<id>/tiles.json + z/x/y  XYZ source      (TileJSON URL)
#   fixtures/screens/<name>/manifest.json                  screen, center, zoom, bbox, bytes
# Source: the local full archive from build.sh when present (offline), else the pinned remote
# build via HTTP range reads (about 1 MB transferred in total; no full download).
# usage: build-screen-fixtures.sh [--public-url URL] [--only NAME]
#   URL: base written into tiles.json, default "<fixture.publicUrl minus /lumpini>/screens"
source "$(dirname "$0")/lib.sh"
source "$(dirname "$0")/assemble-lib.sh"

DIR_NAME="$(cfg .screenFixtures.dir)"
PUBLIC_BASE="$(cfg .fixture.publicUrl | sed 's#/[^/]*$##')/$DIR_NAME"
ONLY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --public-url) PUBLIC_BASE="${2%/}"; shift 2 ;;
    --only) ONLY="$2"; shift 2 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) die "unknown argument $1" ;;
  esac
done

"$TILES_DIR/bin/fetch-tools.sh"
SOURCE_URL="$(cfg .schema.sourceUrl)"
src="$SOURCE_URL"
local_full="$OUT/pmtiles/$(tileset_id "$(cfg .area.maxzoom)").pmtiles"
[[ -f "$local_full" ]] && src="$local_full"
ROOT="$TILES_DIR/fixtures/$DIR_NAME"
EACH_MAX="$(cfg .screenFixtures.maxTotalBytesEach)"
CI_MAX="$(cfg .budget.ciMaxCommittedFileBytes)"
AREA="$(cfg '.area.bbox | map(tostring) | join(",")')"

n="$(jq '.screenFixtures.items | length' "$CONFIG")"
for ((i = 0; i < n; i++)); do
  it=".screenFixtures.items[$i]"
  name="$(cfg "$it.name")"
  [[ -z "$ONLY" || "$ONLY" == "$name" ]] || continue
  bbox="$(bbox_csv "$it.bbox")"; minz="$(cfg "$it.minzoom")"; maxz="$(cfg "$it.maxzoom")"
  # the bbox must stay inside area.bbox (production coverage), see config _comment
  jq -e --argjson i "$i" '.area.bbox as $a | .screenFixtures.items[$i].bbox as $b
      | $b[0] >= $a[0] and $b[1] >= $a[1] and $b[2] <= $a[2] and $b[3] <= $a[3]
        and $b[0] < $b[2] and $b[1] < $b[3]' "$CONFIG" >/dev/null \
    || die "$name: bbox $bbox is not inside area.bbox $AREA"
  id="$(tileset_id "$maxz")-$name"
  fix="$ROOT/$name"
  rm -rf "$fix"; mkdir -p "$fix/pmtiles" "$fix/tiles/$id"
  archive="$fix/pmtiles/$id.pmtiles"
  log "pmtiles extract $src -> $archive --bbox=$bbox z$minz-$maxz"
  "$PMTILES_BIN" extract "$src" "$archive" --bbox="$bbox" --minzoom="$minz" --maxzoom="$maxz" -q \
    || die "$name: extract failed"
  "$PMTILES_BIN" verify "$archive" >&2
  ver="$("$PMTILES_BIN" show --metadata "$archive" | jq -r .version)"
  [[ "$ver" == "$(cfg .schema.expectedMetadataVersion)" ]] || die "$name: schema $ver not pinned"
  "$TILES_DIR/bin/unpack-xyz.sh" "$archive" "$fix/tiles/$id" "$bbox" "$minz" "$maxz" >/dev/null
  write_tilejson "$archive" "$fix/tiles/$id/tiles.json" "$PUBLIC_BASE/$name" "$id" "$bbox" "$minz" "$maxz"
  jq -n --argjson item "$(jq -c "$it" "$CONFIG")" --arg id "$id" --arg src "$SOURCE_URL" \
      --arg build "$(build_key)" --arg ver "$ver" --arg attribution "$(cfg .attribution)" \
      --argjson pmb "$(fsize "$archive")" --argjson nt "$(count_files "$fix/tiles/$id" -name '*.mvt')" \
      --argjson bt "$(sum_bytes "$fix/tiles/$id" -name '*.mvt')" --arg glyphs "fixtures/$(cfg .fixture.name)" '
    { tileset_id: $id, layout: "screen-fixture", screen: $item.screen, center: $item.center,
      zoom: $item.zoom, bbox: $item.bbox, minzoom: $item.minzoom, maxzoom: $item.maxzoom,
      schema: { name: "protomaps-basemap", major: 4, metadataVersion: $ver },
      build_key: $build, source_url: $src,
      files: { tiles: $nt }, bytes: { tiles: $bt, pmtiles_archive: $pmb },
      glyphs_and_sprites_from: $glyphs, attribution: $attribution }' >"$fix/manifest.json"
  PRETTIER="$REPO_ROOT/node_modules/.bin/prettier"
  [[ -x "$PRETTIER" ]] && "$PRETTIER" --log-level warn --write "$fix/manifest.json" "$fix/tiles/$id/tiles.json"
  all="$(sum_bytes "$fix")"; IFS=$'\t' read -r big bigpath < <(largest_file "$fix")
  log "$name: $(count_files "$fix/tiles/$id" -name '*.mvt') tiles · tree $all B (max $EACH_MAX) · largest $big B $bigpath"
  (( all <= EACH_MAX )) || die "$name: fixture tree over screenFixtures.maxTotalBytesEach"
  (( big <= CI_MAX )) || die "$name: $bigpath over the CI guard"
done
total="$(sum_bytes "$ROOT")"
(( total <= $(cfg .screenFixtures.maxDirBytes) )) || die "fixtures/$DIR_NAME is $total B > screenFixtures.maxDirBytes"
log "screen fixtures ok: $ROOT ($total B)"
