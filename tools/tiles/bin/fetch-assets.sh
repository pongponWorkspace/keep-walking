#!/usr/bin/env bash
# Download pinned glyph PBFs + sprites (protomaps/basemaps-assets) and the Noto Sans Thai
# font-faces (notofonts/thai, OFL-1.1) into tools/tiles/downloads/assets/ and verify checksums.
# Output layout matches tech note 6.3 so build.sh can copy it into publish/ as is:
#   downloads/assets/glyphs/<fontstack>/<range>.pbf
#   downloads/assets/glyphs/_faces/NotoSansThai-*.ttf (+ OFL-NotoSansThai.txt)
#   downloads/assets/sprites/v4/light{,@2x}.{json,png}
source "$(dirname "$0")/lib.sh"
need unzip; need tar

ASSETS="$DOWNLOADS/assets"
mkdir -p "$DOWNLOADS"

# fetch <url> <dest> : download once, keep the file for offline re-runs
fetch() {
  [[ -f "$2" ]] && return 0
  log "downloading $1"
  curl -fsSL --retry 3 -o "$2.part" "$1" || die "download failed: $1 (fallback: HUMAN task P1-F02-T25)"
  mv "$2.part" "$2"
}

# ---------- basemaps-assets: glyph PBFs and sprites ----------
commit="$(cfg .assets.basemapsAssets.commit)"
tarball="$DOWNLOADS/basemaps-assets-${commit:0:7}.tar.gz"
fetch "https://codeload.github.com/protomaps/basemaps-assets/tar.gz/$commit" "$tarball"

stage="$DOWNLOADS/.stage-assets"
rm -rf "$stage" "$ASSETS"; mkdir -p "$stage" "$ASSETS/glyphs" "$ASSETS/sprites"
tar -xzf "$tarball" -C "$stage"
src="$stage/basemaps-assets-$commit"
[[ -d "$src" ]] || die "unexpected tarball layout in $tarball"

while IFS= read -r stack; do
  [[ -d "$src/fonts/$stack" ]] || die "fontstack '$stack' not found in basemaps-assets@$commit"
  cp -R "$src/fonts/$stack" "$ASSETS/glyphs/$stack"
done < <(jq -r '.assets.basemapsAssets.fontstacks[]' "$CONFIG")
cp "$src/fonts/OFL.txt" "$ASSETS/glyphs/OFL-NotoSans.txt"

sv="$(cfg .assets.basemapsAssets.spriteVersion)"
mkdir -p "$ASSETS/sprites/$sv"
while IFS= read -r sprite; do
  for f in "$sprite.json" "$sprite.png" "$sprite@2x.json" "$sprite@2x.png"; do
    [[ -f "$src/sprites/$sv/$f" ]] || die "sprite file $sv/$f missing in basemaps-assets@$commit"
    cp "$src/sprites/$sv/$f" "$ASSETS/sprites/$sv/$f"
  done
done < <(jq -r '.assets.basemapsAssets.sprites[]' "$CONFIG")
cp "$TILES_DIR/licenses/sprites-tangrams-MIT.txt" "$ASSETS/sprites/LICENSE-sprites.txt"
rm -rf "$stage"

# Tree hash over the copied files (stable even if GitHub regenerates the tarball).
tree_hash() {
  (cd "$ASSETS" && find glyphs sprites -type f ! -path 'glyphs/_faces/*' -print0 | LC_ALL=C sort -z \
    | while IFS= read -r -d '' f; do printf '%s  %s\n' "$(sha256_of "$f")" "$f"; done) \
    | { if command -v sha256sum >/dev/null; then sha256sum; else shasum -a 256; fi; } | awk '{print $1}'
}
want="$(cfg .assets.basemapsAssets.treeSha256)"
got="$(tree_hash)"
if [[ "$got" != "$want" ]]; then
  die "basemaps-assets tree hash mismatch: expected $want, got $got (update config only after reviewing the diff)"
fi
log "basemaps-assets@${commit:0:7} tree sha256 ok ($(find "$ASSETS/glyphs" -name '*.pbf' | wc -l | tr -d ' ') glyph PBFs)"

# ---------- Noto Sans Thai font-faces (D-032) ----------
zip="$DOWNLOADS/$(cfg .assets.notoSansThai.release).zip"
fetch "$(cfg .assets.notoSansThai.url)" "$zip"
verify_sha256 "$zip" "$(cfg .assets.notoSansThai.zipSha256)"
faces="$ASSETS/glyphs/_faces"; mkdir -p "$faces"
while IFS=$'\t' read -r name zpath sum; do
  unzip -p "$zip" "$zpath" >"$faces/$name"
  verify_sha256 "$faces/$name" "$sum"
done < <(jq -r '.assets.notoSansThai.faces | to_entries[] | [.key, .value.zipPath, .value.sha256] | @tsv' "$CONFIG")
unzip -p "$zip" "$(cfg .assets.notoSansThai.licenseZipPath)" >"$faces/OFL-NotoSansThai.txt"
verify_sha256 "$faces/OFL-NotoSansThai.txt" "$(cfg .assets.notoSansThai.licenseSha256)"
log "Noto Sans Thai $(cfg .assets.notoSansThai.release) faces ok: $(find "$faces" -type f -exec basename {} \; | sort | tr '\n' ' ')"
