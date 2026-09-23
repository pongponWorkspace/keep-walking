#!/usr/bin/env bash
# Stage the temporary GitHub Pages fallback (tech note F02 section 7.3 step 3, D-008): a single
# PMTiles archive + glyphs + sprites, published only because Cloudflare Pages cannot yet answer
# HTTP range requests with `206` (section 7.2). GitHub Pages ToS forbids commercial use, so this
# is a spike-only stopgap, never the default path (infra/config/pages.json
# githubPagesFallback.enabledByDefault = false).
#
# This script does NOT deploy anything itself: the workflow uploads the staged directory with
# actions/upload-pages-artifact + actions/deploy-pages (GITHUB_TOKEN only, no extra secret,
# board section 1 "ทางสำรอง GitHub Pages ผ่าน Actions ไม่ต้องมี secret เพิ่ม").
#
# usage: prepare-ghpages-fallback.sh <ghpages_publish_dir>
source "$(dirname "$0")/lib.sh"

dir="${1:-}"
[[ -n "$dir" && -d "$dir" ]] || die "usage: prepare-ghpages-fallback.sh <ghpages_publish_dir>"

manifest="$dir/manifest.json"
[[ -f "$manifest" ]] || die "$manifest missing -- run tools/tiles/bin/build.sh first"
layout="$(jq -er '.layout' "$manifest")"
[[ "$layout" == "github-pages-pmtiles" ]] \
  || die "manifest layout is '$layout', not 'github-pages-pmtiles' -- use publish-tiles.sh instead"
tileset_id="$(jq -er '.tileset_id' "$manifest")"

max_bytes="$(cfg .githubPagesFallback.maxSiteBytes)"
total_bytes="$(find "$dir" -type f -exec sh -c 'wc -c "$1"' _ {} \; | awk '{s+=$1} END{print s+0}')"
log "staged site size: $total_bytes bytes / cap $max_bytes bytes (GitHub Pages soft cap, tech note 7.1)"
(( total_bytes <= max_bytes )) || die "staged site is $total_bytes bytes, over the $max_bytes byte GitHub Pages cap -- stop, report PARTIAL to HUMAN (tech note 7.3 step 4)"

cat >"$dir/index.html" <<HTML
<!doctype html>
<!-- Owner: devops-engineer (P1-F02-T08). Temporary GitHub Pages fallback (tech note 7.3 step 3). -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>keep-walking map (GitHub Pages fallback)</title>
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <p>Temporary fallback tile host. PMTiles archive: <code>pmtiles/${tileset_id}.pmtiles</code>.
    See manifest.json for the full build record.</p>
  </body>
</html>
HTML

log "staged $dir for actions/upload-pages-artifact (tileset $tileset_id)"
