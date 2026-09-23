#!/usr/bin/env bash
# Unpack a PMTiles archive into a static XYZ directory: <outdir>/{z}/{x}/{y}.mvt
# (tech note 9, "shell" route). Tiles are stored UNcompressed: Cloudflare compresses
# application/x-protobuf on the fly and Pages cannot reliably serve pre-gzipped files.
# Tiles absent from the archive get no file (MapLibre treats 404 as an empty tile).
#
# usage: unpack-xyz.sh <archive.pmtiles> <outdir> <minlon,minlat,maxlon,maxlat> <minzoom> <maxzoom>
# env:   TILES_JOBS  parallel workers (default: CPU count)
source "$(dirname "$0")/lib.sh"
need awk; need gzip; need xargs

[[ $# -eq 5 ]] || die "usage: unpack-xyz.sh <archive> <outdir> <bbox> <minzoom> <maxzoom>"
archive="$1"; outdir="$2"; bbox="$3"; minz="$4"; maxz="$5"
[[ -f "$archive" ]] || die "archive not found: $archive"
[[ -x "$PMTILES_BIN" ]] || die "pmtiles binary missing, run bin/fetch-tools.sh"
jobs="${TILES_JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)}"

# Enumerate every z/x/y whose tile intersects the bbox (Web Mercator, same rule as
# `pmtiles extract --bbox`: inclusive ranges from the corner tiles).
list="$(mktemp)"; trap 'rm -f "$list"' EXIT
awk -v bbox="$bbox" -v minz="$minz" -v maxz="$maxz" 'BEGIN {
  split(bbox, b, ","); pi = atan2(0, -1)
  for (z = minz; z <= maxz; z++) {
    n = 2 ^ z
    x0 = int((b[1] + 180) / 360 * n); x1 = int((b[3] + 180) / 360 * n)
    y0 = merc(b[4], n); y1 = merc(b[2], n)
    if (x1 > n - 1) x1 = n - 1; if (y1 > n - 1) y1 = n - 1
    for (x = x0; x <= x1; x++) for (y = y0; y <= y1; y++) print z, x, y
  }
}
function merc(lat, n,   r) { r = lat * pi / 180
  return int((1 - log(sin(r) / cos(r) + 1 / cos(r)) / pi) / 2 * n) }' >"$list"
total="$(wc -l <"$list" | tr -d ' ')"
log "unpacking $total candidate tiles z$minz-z$maxz from $(basename "$archive") with $jobs workers"

rm -rf "$outdir"; mkdir -p "$outdir"
export PMTILES_BIN archive outdir
# One worker call per tile: fetch, drop empty, gunzip when the payload starts with 1f 8b.
xargs -P "$jobs" -n 3 sh -c '
  z=$1; x=$2; y=$3; d="$outdir/$z/$x"; f="$d/$y.mvt"
  mkdir -p "$d"
  if ! "$PMTILES_BIN" tile -q "$archive" "$z" "$x" "$y" >"$f.tmp" 2>/dev/null || [ ! -s "$f.tmp" ]; then
    rm -f "$f.tmp"; exit 0
  fi
  if [ "$(head -c 2 "$f.tmp" | od -An -tx1 | tr -d " \n")" = "1f8b" ]; then
    gzip -dc "$f.tmp" >"$f" && rm -f "$f.tmp"
  else
    mv "$f.tmp" "$f"
  fi
' sh <"$list"

find "$outdir" -type d -empty -delete
written="$(find "$outdir" -type f -name '*.mvt' | wc -l | tr -d ' ')"
[[ -z "$(find "$outdir" -name '*.tmp' -print -quit)" ]] || die "leftover .tmp files in $outdir"
log "wrote $written tile files ($((total - written)) candidates absent from archive)"
printf '%s\n' "$written"
