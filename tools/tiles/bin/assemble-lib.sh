#!/usr/bin/env bash
# Assembly helpers shared by build.sh and build-fixture.sh. Source after lib.sh.

# write_tilejson <archive> <out.json> <base_url> <tileset_id> <bbox_csv> <minzoom> <maxzoom>
# TileJSON 3.0 with ABSOLUTE tile URLs: MapLibre 6.10 load_tilejson.ts uses tiles[] as-is
# (no resolution against the TileJSON URL). Use set-public-url.sh to re-point a built tree.
write_tilejson() {
  local archive="$1" out="$2" base="$3" id="$4" bbox="$5" minz="$6" maxz="$7" meta
  meta="$("$PMTILES_BIN" show --metadata "$archive")" || die "cannot read metadata of $archive"
  jq -n --argjson meta "$meta" --arg base "$base" --arg id "$id" --arg bbox "$bbox" \
      --argjson minz "$minz" --argjson maxz "$maxz" --arg attribution "$(cfg .attribution)" '
    ($bbox | split(",") | map(tonumber)) as $b |
    {
      tilejson: "3.0.0",
      name: ($meta.name // "Protomaps Basemap"),
      description: ($meta.description // ""),
      version: ($meta.version // ""),
      attribution: $attribution,
      scheme: "xyz",
      tiles: [($base + "/tiles/" + $id + "/{z}/{x}/{y}.mvt")],
      minzoom: $minz,
      maxzoom: $maxz,
      bounds: $b,
      center: [(($b[0] + $b[2]) / 2), (($b[1] + $b[3]) / 2), ([$maxz, 11] | min)],
      vector_layers: ($meta.vector_layers // [])
    }' >"$out"
}

# count_files <dir> [find-args...]
count_files() { local d="$1"; shift; find "$d" -type f "$@" | wc -l | tr -d ' '; }
sum_bytes()   { local d="$1"; shift; find "$d" -type f "$@" -exec cat {} + 2>/dev/null | wc -c | tr -d ' '; }

# largest_file <dir> -> "<bytes>\t<relative path>"
largest_file() {
  (cd "$1" && find . -type f -exec wc -c {} + | grep -v ' total$' | sort -n | tail -1 \
    | awk '{b=$1; $1=""; sub(/^ \.\//, ""); printf "%s\t%s\n", b, $0}')
}

# per_zoom_table <xyzdir> -> JSON array [{z, files, bytes, maxTileBytes}]
per_zoom_table() {
  local d="$1" z rows=()
  for z in $(find "$d" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort -n); do
    [[ -d "$d/$z" ]] || continue
    local files bytes max
    files="$(count_files "$d/$z")"
    bytes="$(sum_bytes "$d/$z")"
    max="$(find "$d/$z" -type f -exec wc -c {} + | grep -v ' total$' | sort -n | tail -1 | awk '{print $1}')"
    rows+=("{\"z\":$z,\"files\":$files,\"bytes\":$bytes,\"maxTileBytes\":${max:-0}}")
  done
  local IFS=,; printf '[%s]' "${rows[*]}"
}

# check_budget <publish_dir> <tile_dir> : exit codes 0 ok, 10 over target, 20 over hard cap
check_budget() {
  local pub="$1" tiles="$2" nt nall big bigpath
  nt="$(count_files "$tiles" -name '*.mvt')"
  nall=$(( $(count_files "$pub") + $(cfg .budget.reservedDeployFiles) ))
  IFS=$'\t' read -r big bigpath < <(largest_file "$pub")
  local capF capB tgtF tgtT
  capF="$(cfg .budget.pagesMaxFilesPerDeploy)"; capB="$(cfg .budget.pagesMaxFileBytes)"
  tgtF="$(cfg .budget.targetMaxFilesPerDeploy)"; tgtT="$(cfg .budget.targetMaxTileFiles)"
  log "budget: tiles $nt / target $tgtT · deploy files $nall (incl. reserved) / target $tgtF / cap $capF · largest $big B ($bigpath) / cap $capB B"
  if (( nall > capF )); then log "FAIL: deploy has $nall files, Cloudflare Pages cap is $capF"; return 20; fi
  if (( big > capB )); then log "FAIL: $bigpath is $big bytes, Pages per-file cap is $capB"; return 20; fi
  if (( nt > tgtT )); then log "OVER TARGET: $nt tile files > $tgtT"; return 10; fi
  if (( nall > tgtF )); then log "OVER TARGET: $nall deploy files > $tgtF"; return 10; fi
  return 0
}

# write_manifest <root> <archive> <maxzoom> <tileset_id> <layout>
# Uses globals set by the caller: SOURCE_URL BBOX REGION_MODE MINZOOM.
# shellcheck disable=SC2153
write_manifest() {
  local root="$1" archive="$2" z="$3" id="$4" layout="$5" meta tdir
  meta="$("$PMTILES_BIN" show --metadata "$archive")"
  tdir="$root/tiles/$id"
  echo '{}' >"$root/manifest.json"   # placeholder so the file counts include itself
  local nt=0 bt=0 zt='[]'
  if [[ -d "$tdir" ]]; then nt="$(count_files "$tdir" -name '*.mvt')"; bt="$(sum_bytes "$tdir" -name '*.mvt')"; zt="$(per_zoom_table "$tdir")"; fi
  local big bigpath; IFS=$'\t' read -r big bigpath < <(largest_file "$root")
  jq -n --argjson meta "$meta" --argjson zt "$zt" \
    --arg id "$id" --arg layout "$layout" --arg build "$(build_key)" --arg src "$SOURCE_URL" \
    --arg bbox "$BBOX" --arg mode "$REGION_MODE" --argjson minz "$MINZOOM" --argjson maxz "$z" \
    --argjson over "$(cfg .area.overzoomTo)" --arg pm "$PMTILES_VERSION" \
    --argjson nt "$nt" --argjson bt "$bt" \
    --argjson ng "$(count_files "$root/glyphs" -name '*.pbf')" --argjson nf "$(count_files "$root/glyphs/_faces" -name '*.ttf')" \
    --argjson ns "$(count_files "$root/sprites")" --argjson nall "$(count_files "$root")" \
    --argjson ball "$(sum_bytes "$root")" --argjson big "$big" --arg bigpath "$bigpath" \
    --argjson pmb "$(fsize "$archive")" --argjson reserved "$(cfg .budget.reservedDeployFiles)" \
    --arg assets "$(cfg .assets.basemapsAssets.commit)" --arg font "$(cfg .assets.notoSansThai.release)" \
    --arg attribution "$(cfg .attribution)" --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
    {
      tileset_id: $id, layout: $layout,
      schema: { name: "protomaps-basemap", major: 4, metadataVersion: $meta.version },
      build_key: $build, source_url: $src,
      osm_replication_time: ($meta["planetiler:osm:osmosisreplicationtime"] // null),
      bbox: ($bbox | split(",") | map(tonumber)), region_mode: $mode,
      minzoom: $minz, maxzoom: $maxz, overzoom_to: $over,
      files: { tiles: $nt, glyph_pbf: $ng, font_faces: $nf, sprite_files: $ns, total: $nall,
               reserved_for_publish_step: $reserved, total_with_reserved: ($nall + $reserved) },
      bytes: { tiles: $bt, total: $ball, largest_file: { path: $bigpath, bytes: $big }, pmtiles_archive: $pmb },
      per_zoom: $zt,
      pins: { pmtiles_cli: $pm, basemaps_assets_commit: $assets, noto_sans_thai: $font },
      attribution: $attribution, generated_at: $date
    }' >"$root/manifest.json"
}
