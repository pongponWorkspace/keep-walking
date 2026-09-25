#!/usr/bin/env bash
# One-command build of the Bangkok + vicinity map deploy set (P1-F02-T06, D-031, D-032).
#
#   tools/tiles/bin/build.sh [--maxzoom N] [--region-mode bbox|provinces] [--public-url URL]
#                            [--allow-over-target] [--no-fallback] [--force]
#
# Steps: pinned tools + assets -> verify bbox against province boundaries -> pmtiles extract
# -> unpack to XYZ + tiles.json -> glyphs, font-faces, sprites -> manifest.json -> budget check
# -> size report. Fallback order (tech note 7.3): XYZ at area.maxzoom -> XYZ at
# area.fallbackMaxzoom -> GitHub Pages PMTiles set (exit 3) -> stop for HUMAN (exit 4).
# Never uploads anything and never reads credentials. Output: tools/tiles/out/ (git-ignored).
#
# exit codes: 0 Pages XYZ set ready · 3 only the GitHub Pages fallback set is within limits
#             4 nothing fits, HUMAN decision needed · 1 error
source "$(dirname "$0")/lib.sh"
source "$(dirname "$0")/assemble-lib.sh"
need python3

MAXZOOM="$(cfg .area.maxzoom)"
FALLBACK_Z="$(cfg .area.fallbackMaxzoom)"
REGION_MODE="$(cfg .area.regionMode)"
PUBLIC_URL="${TILES_PUBLIC_BASE_URL:-http://$(cfg .localServe.host):$(cfg .localServe.port)/out/publish}"
ALLOW_OVER=0; FALLBACK=1; FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --maxzoom) MAXZOOM="$2"; shift 2 ;;
    --region-mode) REGION_MODE="$2"; shift 2 ;;
    --public-url) PUBLIC_URL="${2%/}"; shift 2 ;;
    --allow-over-target) ALLOW_OVER=1; shift ;;
    --no-fallback) FALLBACK=0; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) die "unknown argument $1" ;;
  esac
done
[[ "$REGION_MODE" == bbox || "$REGION_MODE" == provinces ]] || die "--region-mode must be bbox or provinces"

T0="$(date +%s)"
BBOX="$(bbox_csv .area.bbox)"
MINZOOM="$(cfg .area.minzoom)"
SOURCE_URL="$(cfg .schema.sourceUrl)"
mkdir -p "$OUT/pmtiles"

# ---------- 1. pinned tools and assets ----------
"$TILES_DIR/bin/fetch-tools.sh"
"$TILES_DIR/bin/fetch-assets.sh"
ASSETS="$DOWNLOADS/assets"

# ---------- 2. bbox against the 6 province boundaries (optional, git-ignored input) ----------
# tools/coverage/out/boundaries.geojson is the full coverage-survey pipeline's output: it needs
# the 327 MB OSM extract (tools/coverage/params.json#pipeline.sources D1) and is .gitignored
# (`out/` in .gitignore), so it only exists on a machine where someone has already run
# `python -m pipeline` in tools/coverage/. A clean checkout (CI, a fresh clone) never has it.
# This is a config sanity check on the committed area.bbox value, not a build input, so when the
# file is absent this step is SKIPPED with a warning -- same rule tools/tiles/test/run.sh already
# uses for the same file (see its "bbox vs provinces" check). If area.bbox is ever edited, run
# tools/coverage locally first and re-run this script to get the strict check.
REGION_FILE="$OUT/region-provinces.geojson"
BOUNDARIES_FILE="$REPO_ROOT/$(cfg .area.boundariesGeojson)"
if [[ -f "$BOUNDARIES_FILE" ]]; then
  python3 "$TILES_DIR/bin/verify-bbox.py" --config "$CONFIG" --region-out "$REGION_FILE" >"$OUT/verify-bbox.txt" \
    || { cat "$OUT/verify-bbox.txt" >&2; die "bbox does not cover every playable province (edit area.bbox in config.json)"; }
  cat "$OUT/verify-bbox.txt" >&2
elif [[ "$REGION_MODE" == provinces ]]; then
  die "$BOUNDARIES_FILE missing and --region-mode provinces needs it (run tools/coverage locally first, or use --region-mode bbox)"
else
  log "skip: bbox-vs-province check ($BOUNDARIES_FILE not present -- git-ignored coverage-pipeline output, not a build input). area.bbox from config.json is used as committed."
fi

# ---------- 3. extract (network only for the first archive; lower zooms come from it) ----------
# extract_archive <maxzoom> -> prints archive path
extract_archive() {
  local z="$1" id path src args=()
  id="$(tileset_id "$z")"; [[ "$REGION_MODE" == provinces ]] && id="$id-prov"
  path="$OUT/pmtiles/$id.pmtiles"
  if [[ -f "$path" && $FORCE -eq 0 ]]; then log "reusing $path"; printf '%s' "$path"; return; fi
  src="$SOURCE_URL"
  # Offline-friendly: derive a lower maxzoom from an existing higher-zoom local archive.
  for cand in "$OUT"/pmtiles/"$(tileset_id "$MAXZOOM" | sed 's/-z[0-9]*$//')"-z*.pmtiles; do
    [[ -f "$cand" && "$cand" != "$path" ]] || continue
    [[ "$REGION_MODE" == provinces || "$cand" != *-prov.pmtiles ]] || continue
    local cz; cz="$(basename "$cand" .pmtiles | sed -E 's/.*-z([0-9]+).*/\1/')"
    (( cz >= z )) && { src="$cand"; break; }
  done
  if [[ "$REGION_MODE" == provinces ]]; then args+=(--region="$REGION_FILE"); else args+=(--bbox="$BBOX"); fi
  log "pmtiles extract $src -> $path ${args[*]} --minzoom=$MINZOOM --maxzoom=$z"
  "$PMTILES_BIN" extract "$src" "$path.part" "${args[@]}" --minzoom="$MINZOOM" --maxzoom="$z" >&2 \
    || die "pmtiles extract failed (fallback: planetiler with the Protomaps profile, or HUMAN P1-F02-T25)"
  mv "$path.part" "$path"
  "$PMTILES_BIN" verify "$path" >&2 || die "pmtiles verify failed for $path"
  local ver; ver="$("$PMTILES_BIN" show --metadata "$path" | jq -r .version)"
  [[ "$ver" == "$(cfg .schema.expectedMetadataVersion)" ]] \
    || die "schema version $ver != pinned $(cfg .schema.expectedMetadataVersion) (tech note 5.1)"
  printf '%s' "$path"
}

# ---------- 4. assemble the Pages deploy set (tech note 6.3) ----------
# assemble_publish <archive> <maxzoom> <tileset_id>
assemble_publish() {
  local archive="$1" z="$2" id="$3"
  rm -rf "$PUBLISH"; mkdir -p "$PUBLISH/tiles/$id"
  TILES_JOBS="${TILES_JOBS:-}" "$TILES_DIR/bin/unpack-xyz.sh" "$archive" "$PUBLISH/tiles/$id" "$BBOX" "$MINZOOM" "$z" >/dev/null
  write_tilejson "$archive" "$PUBLISH/tiles/$id/tiles.json" "$PUBLIC_URL" "$id" "$BBOX" "$MINZOOM" "$z"
  cp -R "$ASSETS/glyphs" "$PUBLISH/glyphs"
  cp -R "$ASSETS/sprites" "$PUBLISH/sprites"
  write_manifest "$PUBLISH" "$archive" "$z" "$id" "cloudflare-pages-xyz"
}

# ---------- 5. fallback loop: z=maxzoom -> z=fallback -> GitHub Pages -> HUMAN ----------
z="$MAXZOOM"; result=""
rm -rf "$OUT/publish-over-budget" "$OUT/publish-ghpages" "$OUT/publish-ghpages-over-budget"   # stale sets from earlier runs
while :; do
  archive="$(extract_archive "$z")"
  id="$(basename "$archive" .pmtiles)"
  assemble_publish "$archive" "$z" "$id"
  set +e; check_budget "$PUBLISH" "$PUBLISH/tiles/$id"; rc=$?; set -e
  if (( rc == 0 )) || { (( rc == 10 )) && (( ALLOW_OVER )); }; then result="pages-xyz"; break; fi
  if (( FALLBACK )) && (( z > FALLBACK_Z )); then
    log "fallback step 2: maxzoom $z -> $FALLBACK_Z (client overzooms to $(cfg .area.overzoomTo))"
    z="$FALLBACK_Z"; continue
  fi
  result="over-budget"; break
done

if [[ "$result" == over-budget ]]; then
  rm -rf "$OUT/publish-over-budget"; mv "$PUBLISH" "$OUT/publish-over-budget"   # never leave a deployable over-budget set
  # GitHub Pages serves 206, so no file-count limit applies: use the full-zoom archive.
  archive="$(extract_archive "$MAXZOOM")"; id="$(basename "$archive" .pmtiles)"; z="$MAXZOOM"
  gh="$OUT/publish-ghpages"; rm -rf "$gh"; mkdir -p "$gh/pmtiles"
  cp "$archive" "$gh/pmtiles/"; cp -R "$ASSETS/glyphs" "$gh/glyphs"; cp -R "$ASSETS/sprites" "$gh/sprites"
  write_manifest "$gh" "$archive" "$z" "$id" "github-pages-pmtiles"
  size="$(sum_bytes "$gh")"; pm="$(fsize "$archive")"
  if (( size <= $(cfg .budget.githubPagesMaxSiteBytes) )) && (( pm <= $(cfg .budget.githubRepoMaxFileBytes) )); then
    log "fallback step 3: Pages budget not met; GitHub Pages PMTiles set ready in $gh ($size bytes). Temporary only (ToS, D-008)."
    exit 3
  fi
  rm -rf "$OUT/publish-ghpages-over-budget"; mv "$gh" "$OUT/publish-ghpages-over-budget"
  log "fallback step 4: no free host limit fits ($size bytes). Stop and ask HUMAN; do not switch to a paid host."
  exit 4
fi

# ---------- 6. size report ----------
T1="$(date +%s)"
jq --argjson secs "$((T1 - T0))" '. + {build_seconds: $secs}' "$PUBLISH/manifest.json" >"$OUT/size-report.json"
"$TILES_DIR/bin/size-report.sh" "$OUT/size-report.json" | tee "$OUT/size-report.txt"
log "done in $((T1 - T0)) s: $PUBLISH (tiles.json -> $PUBLIC_URL/tiles/$id/tiles.json)"
