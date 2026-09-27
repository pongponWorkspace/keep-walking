#!/usr/bin/env bash
# Test harness for infra/scripts/check-bbox.sh / tools/tiles/bin/verify-bbox.py (P1-X39,
# P2-F04-T23). Runnable directly, no network, no credential:
#   bash infra/scripts/test/test-bbox-guard.sh
#
# Wired into CI (P2-F06-T16): `.github/workflows/ci.yml` job `map-bbox-guard` runs this file
# directly (same pattern as test-lint-headers.sh / test-billing-guard.sh), so the CI job doubles
# as a regression test of the detector itself, not merely a single pass/fail invocation.
#
# This does not replace tools/tiles/test/run.sh's own `verify-bbox.py` check (run through
# tools/tiles/test/tiles.test.ts's vitest bridge inside `pnpm test`, which can `it.skipIf` when
# bash/jq/curl/python3 are missing unless TILES_TEST_REQUIRED=1 is set). This job calls the
# Python script directly with no such skip path, so CI always verifies bbox-vs-province even if
# that bridge is ever skipped.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$HERE/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/../.." && pwd)"

fail_count=0
case_count=0

# assert_exit <expected_rc> <description> -- <cmd...>
assert_exit() {
  local expected="$1" desc="$2"
  shift 2
  case_count=$((case_count + 1))
  local out rc
  set +e
  out="$("$@" 2>&1)"
  rc=$?
  set -e
  if [[ "$rc" -eq "$expected" ]]; then
    printf 'ok   %s (exit %s)\n' "$desc" "$rc"
  else
    printf 'FAIL %s (expected exit %s, got %s)\n' "$desc" "$expected" "$rc"
    printf '%s\n' "$out" | sed 's/^/       | /'
    fail_count=$((fail_count + 1))
  fi
}

# assert_contains <needle> <description> -- <cmd...>
assert_contains() {
  local needle="$1" desc="$2"
  shift 2
  case_count=$((case_count + 1))
  local out
  set +e
  out="$("$@" 2>&1)"
  set -e
  if printf '%s' "$out" | grep -qF -- "$needle"; then
    printf 'ok   %s\n' "$desc"
  else
    printf 'FAIL %s (output did not contain %q)\n' "$desc" "$needle"
    printf '%s\n' "$out" | sed 's/^/       | /'
    fail_count=$((fail_count + 1))
  fi
}

echo "== regression: the committed bbox covers every playable province + the mask hole (P2-F04-T23) =="
assert_exit 0 "check-bbox.sh passes on the real repo config + data/map/*.geojson" \
  "$SCRIPTS_DIR/check-bbox.sh"
assert_contains "PASS all provinces and the mask hole inside bbox" \
  "check-bbox.sh reports RESULT: PASS" \
  "$SCRIPTS_DIR/check-bbox.sh"

echo "== the detector catches a bbox that cuts a province (synthetic: south edge raised to 13.5) =="
TMP_CFG="$(mktemp)"
trap 'rm -f "$TMP_CFG"' EXIT
jq '.area.bbox[1] = 13.5' "$REPO_ROOT/tools/tiles/config.json" >"$TMP_CFG"
assert_exit 1 "check-bbox.sh fails when area.bbox cuts a province (south edge 13.5)" \
  "$SCRIPTS_DIR/check-bbox.sh" --config "$TMP_CFG"
assert_contains "FAIL" "check-bbox.sh reports FAIL in output" \
  "$SCRIPTS_DIR/check-bbox.sh" --config "$TMP_CFG"

echo
echo "$case_count case(s), $fail_count failed"
if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
echo "test-bbox-guard: PASS"
