#!/usr/bin/env bash
# Download the pinned go-pmtiles binary into tools/tiles/downloads/ (ignored by git)
# and verify its sha256 from config.json. No account or credential is used.
source "$(dirname "$0")/lib.sh"

if [[ -x "$PMTILES_BIN" ]]; then
  log "pmtiles $PMTILES_VERSION already present: $PMTILES_BIN"
  exit 0
fi

key="$(platform_key)"
file="$(cfg ".tools.pmtiles.assets[\"$key\"].file")" || die "no pinned pmtiles build for platform $key"
sum="$(cfg ".tools.pmtiles.assets[\"$key\"].sha256")"
url="https://github.com/protomaps/go-pmtiles/releases/download/v$PMTILES_VERSION/$file"

mkdir -p "$DOWNLOADS"
archive="$DOWNLOADS/$file"
if [[ ! -f "$archive" ]]; then
  log "downloading $url"
  curl -fsSL --retry 3 -o "$archive.part" "$url" || die "download failed: $url (fallback: HUMAN task P1-F02-T25)"
  mv "$archive.part" "$archive"
fi
verify_sha256 "$archive" "$sum"
log "sha256 ok: $file"

dest="$(dirname "$PMTILES_BIN")"
rm -rf "$dest"; mkdir -p "$dest"
case "$file" in
  *.zip)    unzip -q -o "$archive" -d "$dest" ;;
  *.tar.gz) tar -xzf "$archive" -C "$dest" ;;
esac
chmod +x "$PMTILES_BIN"
"$PMTILES_BIN" version >&2 || true
log "installed $PMTILES_BIN"
