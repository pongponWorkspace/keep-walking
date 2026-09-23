#!/usr/bin/env bash
# Offline tests for tools/tiles (P1-F02-T06). Uses only the committed fixture and config;
# never downloads tiles (TL-S11). The pinned pmtiles binary is fetched (checksum-verified,
# ~16 MB) only if tools/tiles/downloads/ does not have it yet.
# usage: tools/tiles/test/run.sh        exit 0 = all pass
source "$(dirname "$0")/../bin/lib.sh"
source "$(dirname "$0")/../bin/assemble-lib.sh"
need python3

PASS=0; FAIL=0; SKIP=0
ok()   { PASS=$((PASS + 1)); printf 'PASS  %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf 'FAIL  %s  -- %s\n' "$1" "$2"; }
skip() { SKIP=$((SKIP + 1)); printf 'SKIP  %s  -- %s\n' "$1" "$2"; }
check() { local name="$1"; shift; if "$@" >/dev/null 2>&1; then ok "$name"; else bad "$name" "$*"; fi; }

TMP="$(mktemp -d)"; SERVER_PID=""
cleanup() { if [[ -n "$SERVER_PID" ]]; then kill "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID" 2>/dev/null || true; fi; rm -rf "$TMP"; }
trap cleanup EXIT

[[ -x "$PMTILES_BIN" ]] || "$TILES_DIR/bin/fetch-tools.sh" >/dev/null 2>&1 || true

FIX="$TILES_DIR/fixtures/$(cfg .fixture.name)"
ID="$(tileset_id "$(cfg .fixture.maxzoom)")-$(cfg .fixture.name)"
ARCH="$FIX/pmtiles/$ID.pmtiles"
TJ="$FIX/tiles/$ID/tiles.json"

# ---- config ----
check "config.json is valid JSON" jq -e . "$CONFIG"
check "area bbox has 4 numbers, min < max" jq -e '.area.bbox | length == 4 and .[0] < .[2] and .[1] < .[3]' "$CONFIG"
check "targets are below Pages caps" jq -e '.budget | .targetMaxTileFiles < .targetMaxFilesPerDeploy and .targetMaxFilesPerDeploy < .pagesMaxFilesPerDeploy' "$CONFIG"
check "tileset_id follows tech note 6.3" test "$(tileset_id 15)" = "pm4-$(cfg .schema.buildKey)-z15"

# ---- fixture files and limits ----
check "fixture PMTiles exists" test -f "$ARCH"
check "fixture PMTiles <= fixture.maxTotalBytes" test "$(fsize "$ARCH")" -le "$(cfg .fixture.maxTotalBytes)"
check "fixture tree <= fixture.maxDirBytes" test "$(sum_bytes "$FIX")" -le "$(cfg .fixture.maxDirBytes)"
IFS=$'\t' read -r big _ < <(largest_file "$FIX")
check "every fixture file <= CI guard" test "$big" -le "$(cfg .budget.ciMaxCommittedFileBytes)"
nt="$(count_files "$FIX/tiles/$ID" -name '*.mvt')"
check "manifest tile count matches files ($nt)" jq -e --argjson n "$nt" '.files.tiles == $n' "$FIX/manifest.json"
check "manifest total file count matches" jq -e --argjson n "$(count_files "$FIX")" '.files.total == $n' "$FIX/manifest.json"
gz="$(find "$FIX/tiles" -name '*.mvt' -exec sh -c 'head -c 2 "$1" | od -An -tx1 | tr -d " \n"; echo' sh {} \; | grep -c '^1f8b' || true)"
check "no fixture tile is gzip-compressed" test "$gz" -eq 0
nomvt="$(find "$FIX/tiles" -name '*.mvt' -exec sh -c 'head -c 1 "$1" | od -An -tx1 | tr -d " \n"; echo' sh {} \; | grep -vc '^1a' || true)"
check "every fixture tile starts with MVT layer tag 0x1a" test "$nomvt" -eq 0

# ---- TileJSON ----
check "tiles.json is TileJSON 3.0.0" jq -e '.tilejson == "3.0.0" and .scheme == "xyz"' "$TJ"
check "tiles.json tile URL is absolute and matches tileset" jq -e --arg id "$ID" '.tiles[0] | test("^https?://") and contains("/tiles/" + $id + "/{z}/{x}/{y}.mvt")' "$TJ"
check "tiles.json attribution has OSM + Protomaps" jq -e '.attribution | contains("openstreetmap.org/copyright") and contains("Protomaps")' "$TJ"
check "tiles.json lists the 9 Protomaps v4 layers" jq -e '[.vector_layers[].id] | sort == ["boundaries","buildings","earth","landcover","landuse","places","pois","roads","water"]' "$TJ"
check "tiles.json bounds = fixture bbox" jq -e --slurpfile c "$CONFIG" '.bounds == $c[0].fixture.bbox' "$TJ"

# ---- fonts and licenses (D-032) ----
while IFS=$'\t' read -r name sum; do
  check "font-face $name sha256 matches config" test "$(sha256_of "$FIX/glyphs/_faces/$name")" = "$sum"
done < <(jq -r '.assets.notoSansThai.faces | to_entries[] | [.key, .value.sha256] | @tsv' "$CONFIG")
check "OFL license next to Noto Sans Thai" grep -q "SIL Open Font License" "$FIX/glyphs/_faces/OFL-NotoSansThai.txt"
check "OFL license next to glyph PBFs" grep -q "SIL Open Font License" "$FIX/glyphs/OFL-NotoSans.txt"
check "sprite license present" grep -q "MIT License" "$FIX/sprites/LICENSE-sprites.txt"
check "sprite v4/light json+png (1x, 2x) present" test -s "$FIX/sprites/v4/light.json" -a -s "$FIX/sprites/v4/light.png" -a -s "$FIX/sprites/v4/light@2x.json" -a -s "$FIX/sprites/v4/light@2x.png"

# ---- pmtiles CLI: archive integrity, unpack equivalence ----
if [[ -x "$PMTILES_BIN" ]]; then
  check "pmtiles verify fixture" "$PMTILES_BIN" verify "$ARCH"
  check "fixture schema version is pinned" test "$("$PMTILES_BIN" show --metadata "$ARCH" | jq -r .version)" = "$(cfg .schema.expectedMetadataVersion)"
  "$TILES_DIR/bin/unpack-xyz.sh" "$ARCH" "$TMP/xyz" "$(bbox_csv .fixture.bbox)" "$(cfg .fixture.minzoom)" "$(cfg .fixture.maxzoom)" >/dev/null 2>&1
  if diff -rq -x tiles.json "$TMP/xyz" "$FIX/tiles/$ID" >/dev/null; then ok "unpack-xyz reproduces committed XYZ byte for byte"; else bad "unpack-xyz reproduces committed XYZ" "diff -r"; fi
  # candidate enumeration must match pmtiles' own bbox rule
  want="$("$PMTILES_BIN" extract "$ARCH" /dev/null --bbox="$(bbox_csv .fixture.bbox)" --dry-run 2>&1 | sed -nE 's/.*Region tiles ([0-9]+),.*/\1/p')"
  check "tile enumeration ($nt) equals pmtiles region tiles ($want)" test "$nt" = "$want"
  # set-public-url rewrites tiles.json only
  cp -R "$FIX" "$TMP/fixcopy"
  "$TILES_DIR/bin/set-public-url.sh" "$TMP/fixcopy" "https://map.example.test/" >/dev/null 2>&1
  check "set-public-url.sh rewrites tile URL" jq -e --arg id "$ID" '.tiles == ["https://map.example.test/tiles/" + $id + "/{z}/{x}/{y}.mvt"]' "$TMP/fixcopy/tiles/$ID/tiles.json"
  check "set-public-url.sh rejects non-URL" bash -c "! '$TILES_DIR/bin/set-public-url.sh' '$TMP/fixcopy' notaurl"
else
  skip "pmtiles CLI checks" "binary unavailable (run bin/fetch-tools.sh)"
fi

# ---- budget check: 0 ok, 10 over target, 20 over hard cap (synthetic trees, tiny limits) ----
mk_tree() { rm -rf "$1"; mkdir -p "$1/tiles/t/0/0"; local i; for ((i = 0; i < $2; i++)); do printf 'x' >"$1/tiles/t/0/0/$i.mvt"; done; }
jq '.budget.pagesMaxFilesPerDeploy = 20 | .budget.targetMaxFilesPerDeploy = 12 | .budget.targetMaxTileFiles = 8
    | .budget.reservedDeployFiles = 2 | .budget.pagesMaxFileBytes = 100' "$CONFIG" >"$TMP/cfg.json"
budget_rc() { ( CONFIG="$TMP/cfg.json"; set +e; check_budget "$1" "$1/tiles/t" 2>/dev/null; echo $? ); }
mk_tree "$TMP/b1" 8;  check "budget: 8 tiles + 2 reserved -> ok (0)" test "$(budget_rc "$TMP/b1")" = 0
mk_tree "$TMP/b2" 9;  check "budget: 9 tiles > tile target -> 10" test "$(budget_rc "$TMP/b2")" = 10
mk_tree "$TMP/b3" 19; check "budget: 19 + 2 reserved > Pages cap -> 20" test "$(budget_rc "$TMP/b3")" = 20
mk_tree "$TMP/b4" 1; head -c 101 /dev/zero >"$TMP/b4/big.bin"
check "budget: file over per-file cap -> 20" test "$(budget_rc "$TMP/b4")" = 20

# ---- local server: Range -> 206 (pmtiles:// needs it), XYZ -> 200 + headers ----
port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
python3 "$TILES_DIR/bin/serve.py" --root "$TILES_DIR" --port "$port" >/dev/null 2>&1 & SERVER_PID=$!
for _ in $(seq 1 50); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 0.1; done
base="http://127.0.0.1:$port/fixtures/$(cfg .fixture.name)"
hdr="$(curl -sS -o /dev/null -D - -H 'Range: bytes=0-99' "$base/pmtiles/$ID.pmtiles" | tr -d '\r')"
check "serve.py: Range on .pmtiles -> 206" grep -q '^HTTP/1.[01] 206' <<<"$hdr"
check "serve.py: Content-Range bytes 0-99/<size>" grep -qi "^content-range: bytes 0-99/$(fsize "$ARCH")" <<<"$hdr"
tile="$(cd "$FIX/tiles/$ID" && find . -name '*.mvt' | head -1 | sed 's#^\./##')"
hdr="$(curl -sS -o /dev/null -D - "$base/tiles/$ID/$tile" | tr -d '\r')"
check "serve.py: XYZ tile -> 200 application/x-protobuf" grep -qi '^content-type: application/x-protobuf' <<<"$hdr"
check "serve.py: CORS + Timing-Allow-Origin" bash -c "grep -qi '^access-control-allow-origin: \*' <<<'$hdr' && grep -qi '^timing-allow-origin: \*' <<<'$hdr'"
check "serve.py: missing tile -> 404" test "$(curl -s -o /dev/null -w '%{http_code}' "$base/tiles/$ID/15/1/1.mvt")" = 404

# ---- bbox vs province boundaries (needs the coverage pipeline output, git-ignored) ----
if [[ -f "$REPO_ROOT/$(cfg .area.boundariesGeojson)" ]]; then
  check "bbox covers all 6 provinces (verify-bbox.py)" python3 "$TILES_DIR/bin/verify-bbox.py"
else
  skip "bbox vs provinces" "$(cfg .area.boundariesGeojson) not present (run tools/coverage first)"
fi

printf '\n%d passed, %d failed, %d skipped\n' "$PASS" "$FAIL" "$SKIP"
(( FAIL == 0 ))
