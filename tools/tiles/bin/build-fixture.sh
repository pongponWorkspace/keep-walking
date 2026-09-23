#!/usr/bin/env bash
# Build the small committed fixture (Lumphini Park) in tools/tiles/fixtures/<name>/ for CI, QA,
# e2e and the client (TL-S08, TL-S11). Same layout as the deploy set (tech note 6.3):
#   fixtures/lumpini/pmtiles/<id>.pmtiles           PMTiles source  (pmtiles://...)
#   fixtures/lumpini/tiles/<id>/tiles.json + z/x/y  XYZ source      (TileJSON URL)
#   fixtures/lumpini/glyphs/...  sprites/...  manifest.json
# Source: the local full archive from build.sh when present (offline), else the pinned remote build.
# usage: build-fixture.sh [--public-url URL]   (URL written into tiles.json; default config fixture.publicUrl)
source "$(dirname "$0")/lib.sh"
source "$(dirname "$0")/assemble-lib.sh"

NAME="$(cfg .fixture.name)"
PUBLIC_URL="$(cfg .fixture.publicUrl)"
[[ "${1:-}" == --public-url ]] && PUBLIC_URL="${2%/}"
FIX="$TILES_DIR/fixtures/$NAME"
BBOX="$(bbox_csv .fixture.bbox)"; MINZOOM="$(cfg .fixture.minzoom)"; MAXZ="$(cfg .fixture.maxzoom)"
# shellcheck disable=SC2034  # read by write_manifest (assemble-lib.sh)
REGION_MODE="bbox"
ID="$(tileset_id "$MAXZ")-$NAME"

"$TILES_DIR/bin/fetch-tools.sh"
"$TILES_DIR/bin/fetch-assets.sh"
ASSETS="$DOWNLOADS/assets"

SOURCE_URL="$(cfg .schema.sourceUrl)"
src="$SOURCE_URL"
local_full="$OUT/pmtiles/$(tileset_id "$(cfg .area.maxzoom)").pmtiles"
[[ -f "$local_full" ]] && src="$local_full"

rm -rf "$FIX"; mkdir -p "$FIX/pmtiles" "$FIX/tiles/$ID"
archive="$FIX/pmtiles/$ID.pmtiles"
log "pmtiles extract $src -> $archive --bbox=$BBOX z$MINZOOM-$MAXZ"
"$PMTILES_BIN" extract "$src" "$archive" --bbox="$BBOX" --minzoom="$MINZOOM" --maxzoom="$MAXZ" -q \
  || die "fixture extract failed"
"$PMTILES_BIN" verify "$archive" >&2

"$TILES_DIR/bin/unpack-xyz.sh" "$archive" "$FIX/tiles/$ID" "$BBOX" "$MINZOOM" "$MAXZ" >/dev/null
write_tilejson "$archive" "$FIX/tiles/$ID/tiles.json" "$PUBLIC_URL" "$ID" "$BBOX" "$MINZOOM" "$MAXZ"

# Small glyph subset: only the fontstacks and ranges the fixture views need.
while IFS= read -r stack; do
  mkdir -p "$FIX/glyphs/$stack"
  while IFS= read -r range; do
    cp "$ASSETS/glyphs/$stack/$range.pbf" "$FIX/glyphs/$stack/$range.pbf"
  done < <(jq -r '.fixture.glyphRanges[]' "$CONFIG")
done < <(jq -r '.fixture.fontstacks[]' "$CONFIG")
cp "$ASSETS/glyphs/OFL-NotoSans.txt" "$FIX/glyphs/"
cp -R "$ASSETS/glyphs/_faces" "$FIX/glyphs/_faces"
cp -R "$ASSETS/sprites" "$FIX/sprites"
# The fixture is committed and the root `prettier --check .` covers JSON. Format generated JSON
# with the repo's pinned prettier when installed (semantics unchanged); skip silently otherwise.
PRETTIER="$REPO_ROOT/node_modules/.bin/prettier"
pretty() { [[ -x "$PRETTIER" ]] && "$PRETTIER" --log-level warn --write "$@" || true; }
find "$FIX" -name '*.json' -print0 | while IFS= read -r -d '' f; do pretty "$f"; done
write_manifest "$FIX" "$archive" "$MAXZ" "$ID" "fixture"
pretty "$FIX/manifest.json"

# ---------- limits: fixture targets and the CI committed-file guard ----------
pm="$(fsize "$archive")"; xyz="$(sum_bytes "$FIX/tiles/$ID" -name '*.mvt')"; all="$(sum_bytes "$FIX")"
IFS=$'\t' read -r big bigpath < <(largest_file "$FIX")
log "fixture $ID: pmtiles $pm B (max $(cfg .fixture.maxTotalBytes)) · xyz $xyz B in $(count_files "$FIX/tiles/$ID" -name '*.mvt') tiles (max $(cfg .fixture.maxXyzBytes)) · tree $all B in $(count_files "$FIX") files (max $(cfg .fixture.maxDirBytes)) · largest $big B $bigpath (CI guard $(cfg .budget.ciMaxCommittedFileBytes))"
(( pm <= $(cfg .fixture.maxTotalBytes) )) || die "fixture PMTiles over limit"
(( xyz <= $(cfg .fixture.maxXyzBytes) )) || die "fixture XYZ over limit"
(( all <= $(cfg .fixture.maxDirBytes) )) || die "fixture tree over limit"
(( big <= $(cfg .budget.ciMaxCommittedFileBytes) )) || die "fixture file $bigpath over CI guard"
log "fixture ok: $FIX"
