#!/usr/bin/env bash
# Print the size report for a built deploy set from out/size-report.json (written by build.sh).
# usage: size-report.sh [path/to/size-report.json]
source "$(dirname "$0")/lib.sh"
R="${1:-$OUT/size-report.json}"
[[ -f "$R" ]] || die "no size report at $R (run bin/build.sh first)"

jq -r --slurpfile c "$CONFIG" '
  def mib: (. / 1048576 * 100 | round / 100 | tostring) + " MiB";
  def pct(a; b): ((a / b * 1000 | round) / 10 | tostring) + "%";
  $c[0].budget as $b |
  "SIZE REPORT  \(.tileset_id)  (layout \(.layout), generated \(.generated_at), build \(.build_seconds // "?") s)",
  "schema       Protomaps Basemap v\(.schema.major) metadata \(.schema.metadataVersion) · build \(.build_key) · OSM replication \(.osm_replication_time)",
  "area         bbox \(.bbox | map(tostring) | join(",")) · region_mode \(.region_mode) · z\(.minzoom)-\(.maxzoom) · client overzoom to z\(.overzoom_to)",
  "",
  "zoom  files   bytes (uncompressed MVT)   largest tile",
  (.per_zoom[] | "z\(.z | tostring | .[0:2])\(" " * (4 - (.z | tostring | length)))\(.files | tostring)\(" " * (8 - (.files | tostring | length)))\(.bytes | tostring)\(" " * (27 - (.bytes | tostring | length)))\(.maxTileBytes)"),
  "",
  "files        tiles \(.files.tiles) · glyph PBF \(.files.glyph_pbf) · font-faces \(.files.font_faces) · sprite \(.files.sprite_files) · total \(.files.total) (+\(.files.reserved_for_publish_step) reserved) = \(.files.total_with_reserved)",
  "vs Pages     tiles \(.files.tiles) / target \($b.targetMaxTileFiles) (\(pct(.files.tiles; $b.targetMaxTileFiles))) · deploy \(.files.total_with_reserved) / target \($b.targetMaxFilesPerDeploy) (\(pct(.files.total_with_reserved; $b.targetMaxFilesPerDeploy))) / cap \($b.pagesMaxFilesPerDeploy) (\(pct(.files.total_with_reserved; $b.pagesMaxFilesPerDeploy)))",
  "bytes        tiles \(.bytes.tiles | mib) · deploy total \(.bytes.total | mib) · largest file \(.bytes.largest_file.bytes) B (\(.bytes.largest_file.path)) vs per-file cap \($b.pagesMaxFileBytes | mib)",
  "R2 layout    1 PMTiles file, \(.bytes.pmtiles_archive | mib) gzip-compressed tiles (no per-file cap on R2, needs 206 + payment method, D-001) + same glyph/sprite set",
  "GH Pages     PMTiles \(.bytes.pmtiles_archive | mib) vs site cap \($b.githubPagesMaxSiteBytes / 1e9) GB and repo file cap \($b.githubRepoMaxFileBytes | mib)",
  "RESULT       " + (if .files.total_with_reserved <= $b.targetMaxFilesPerDeploy and .files.tiles <= $b.targetMaxTileFiles and .bytes.largest_file.bytes <= $b.pagesMaxFileBytes
                     then "PASS Cloudflare Pages Free budget" else "OVER BUDGET" end)
' "$R"
