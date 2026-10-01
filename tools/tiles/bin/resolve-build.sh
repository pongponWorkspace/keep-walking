#!/usr/bin/env bash
# Pick the Protomaps daily build to extract from (P2-X58, ADR 0004).
#
#   resolve-build.sh [--index FILE|URL] [--policy P] [--pin KEY] [--expected VERSION]
#                    [--url-template T] [--no-probe] [--no-cache]
#
# Protomaps keeps every daily build for one week plus the latest build of each patch version
# (docs.protomaps.com/basemaps/downloads). A fixed pin therefore 404s after about 7 days, but
# "the newest build whose metadata version == schema.expectedMetadataVersion" always exists:
# while that version is current it is the latest daily, after a version bump it is the build
# Protomaps keeps for that version.
#
# Policies (config schema.buildSelection, overridable with --policy):
#   pinned                     only schema.buildKey; fail if it is gone or has another version
#   pinned-or-latest-matching  schema.buildKey while it is listed with the expected version,
#                              else the newest listed build with the expected version (default)
#   latest-matching            the newest listed build with the expected version
# env TILES_BUILD_KEY=<key> forces policy "pinned" with that key (reproduce an earlier run from
# manifest.json build_key). A build with another metadata version is never chosen; build.sh also
# re-checks the version inside the extracted archive.
#
# Each candidate is probed with a 127-byte range request (needs 206) unless --no-probe, because
# builds.json can list a build that is being deleted. At most schema.probeCandidates are probed.
# Offline (index unreachable): reuse out/resolved-build.json from the last online run, else the pin.
#
# stdout: one JSON object {key, source_url, version, uploaded, size, b3sum, pinned, policy,
#         resolution, index_url, newer_versions}. exit 0 ok, 1 no usable build.
source "$(dirname "$0")/lib.sh"

INDEX="$(cfg .schema.buildsIndexUrl)"
POLICY="$(cfg .schema.buildSelection)"
PIN="$(cfg .schema.buildKey)"
EXPECTED="$(cfg .schema.expectedMetadataVersion)"
TEMPLATE="$(cfg .schema.sourceUrlTemplate)"
MAX_PROBE="$(cfg .schema.probeCandidates)"
PROBE=1; CACHE=1
CACHE_FILE="${TILES_RESOLVED_CACHE:-$OUT/resolved-build.json}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --index) INDEX="$2"; shift 2 ;;
    --policy) POLICY="$2"; shift 2 ;;
    --pin) PIN="$2"; shift 2 ;;
    --expected) EXPECTED="$2"; shift 2 ;;
    --url-template) TEMPLATE="$2"; shift 2 ;;
    --no-probe) PROBE=0; shift ;;
    --no-cache) CACHE=0; shift ;;
    -h|--help) sed -n '2,28p' "$0"; exit 0 ;;
    *) die "unknown argument $1" ;;
  esac
done
if [[ -n "${TILES_BUILD_KEY:-}" ]]; then PIN="$TILES_BUILD_KEY"; POLICY=pinned; fi
case "$POLICY" in pinned|pinned-or-latest-matching|latest-matching) ;; *) die "unknown build policy $POLICY" ;; esac

url_for() { printf '%s' "${TEMPLATE//\{build\}/$1}"; }

# result <entry-json-or-null> <key> <resolution> <newer-json>
result() {
  jq -cn --argjson e "${1:-null}" --arg key "$2" --arg res "$3" --argjson newer "${4:-[]}" \
      --arg url "$(url_for "$2")" --arg pin "$PIN" --arg policy "$POLICY" --arg index "$INDEX" \
      --arg expected "$EXPECTED" '
    { key: $key, source_url: $url, version: ($e.version // $expected),
      uploaded: ($e.uploaded // null), size: ($e.size // null), b3sum: ($e.b3sum // null),
      pinned: $pin, policy: $policy, resolution: $res, index_url: $index, newer_versions: $newer }'
}

# ---------- 1. read the index (file or URL) ----------
idx="$(mktemp)"; trap 'rm -f "$idx"' EXIT
if [[ -f "$INDEX" ]]; then cp "$INDEX" "$idx"; ok_index=1
elif curl -fsSL --retry 2 --max-time 30 "$INDEX" -o "$idx" 2>/dev/null && jq -e 'type == "array"' "$idx" >/dev/null 2>&1; then ok_index=1
else ok_index=0; fi

if (( ok_index == 0 )); then
  if (( CACHE )) && [[ "$POLICY" != pinned ]] && [[ -f "$CACHE_FILE" ]] \
     && jq -e --arg v "$EXPECTED" '.version == $v' "$CACHE_FILE" >/dev/null 2>&1; then
    log "build index $INDEX unreachable: reusing last resolution $(jq -r .key "$CACHE_FILE") ($CACHE_FILE)"
    jq -c '.resolution = "offline-last-resolved"' "$CACHE_FILE"; exit 0
  fi
  log "build index $INDEX unreachable: using pin $PIN unchecked (build.sh re-checks the archive version)"
  result null "$PIN" "offline-pin"; exit 0
fi

# ---------- 2. candidates in preference order ----------
# entries: {key without .pmtiles, version, uploaded, ...}, newest first
entries="$(jq -c '[.[] | select(.key | test("^[0-9]{8}\\.pmtiles$")) | . + {key: (.key | sub("\\.pmtiles$"; ""))}]
                  | sort_by(.uploaded // "", .key) | reverse' "$idx")"
semver='split(".") | map(tonumber? // 0)'
newer="$(jq -c --arg v "$EXPECTED" "[.[] | select(.version != null and (.version | $semver) > (\$v | $semver)) | .version] | unique" <<<"$entries")"
pin_entry="$(jq -c --arg k "$PIN" 'map(select(.key == $k)) | .[0]' <<<"$entries")"
pin_ok="$(jq -r --arg v "$EXPECTED" 'if . == null then "missing" elif .version == $v then "ok" else "version:" + .version end' <<<"$pin_entry")"
matching="$(jq -c --arg v "$EXPECTED" 'map(select(.version == $v))' <<<"$entries")"

case "$POLICY" in
  pinned)
    [[ "$pin_ok" == ok ]] || die "pinned build $PIN is $pin_ok in $INDEX (expected version $EXPECTED; policy pinned)"
    cands="[$pin_entry]" ;;
  pinned-or-latest-matching)
    [[ "$pin_ok" == ok ]] || log "pin $PIN is $pin_ok in the build index: falling back to the newest build with version $EXPECTED"
    cands="$(jq -c --argjson p "$pin_entry" --arg ok "$pin_ok" --arg pk "$PIN" \
              '(if $ok == "ok" then [$p] else [] end) + map(select(.key != $pk))' <<<"$matching")" ;;
  latest-matching) cands="$matching" ;;
esac
(( $(jq length <<<"$cands") > 0 )) \
  || die "no build with metadata version $EXPECTED in $INDEX (newest listed: $(jq -r "[.[].version | select(. != null)] | unique | sort_by($semver) | .[-5:] | join(\", \")" <<<"$entries")). A schema bump needs review (tech note 5.1): update schema.expectedMetadataVersion and check the style."
[[ "$newer" == "[]" ]] || log "note: newer schema versions exist upstream: $(jq -r 'join(", ")' <<<"$newer") (pinned $EXPECTED; bump only after a style review)"

# ---------- 3. probe and pick ----------
n=0
while IFS= read -r e; do
  key="$(jq -r .key <<<"$e")"
  res=latest-matching; [[ "$key" == "$PIN" ]] && res=pinned
  if (( PROBE )); then
    (( n < MAX_PROBE )) || break
    n=$((n + 1))
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -r 0-126 "$(url_for "$key")" || true)"
    if [[ "$code" != 206 ]]; then log "build $key listed but $(url_for "$key") answered $code: trying the next one"; continue; fi
  fi
  out="$(result "$e" "$key" "$res" "$newer")"
  if (( CACHE )); then mkdir -p "$OUT"; printf '%s\n' "$out" >"$CACHE_FILE"; fi
  log "build $key (version $(jq -r .version <<<"$e"), resolution $res, pin $PIN)"
  printf '%s\n' "$out"; exit 0
done < <(jq -c '.[]' <<<"$cands")
die "none of the first $MAX_PROBE builds with version $EXPECTED answered 206 (network or upstream problem)"
