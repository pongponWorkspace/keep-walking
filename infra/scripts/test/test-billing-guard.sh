#!/usr/bin/env bash
# Test harness for infra/scripts/check-billing-guard.sh (D-085, P2-F04-T08). Runnable directly, no
# network, no credential, no Cloudflare/GitHub account:
#   bash infra/scripts/test/test-billing-guard.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$HERE/.." && pwd)"
FIXTURES="$HERE/fixture-billing"

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

echo "== the detector catches a synthetic D-085 violation (workflow: self-hosted runner + wrangler r2) =="
assert_exit 1 "bad-workflow.yml fails" \
  "$SCRIPTS_DIR/check-billing-guard.sh" "$FIXTURES/bad-workflow.yml"
assert_contains "self-hosted or non-standard" "bad-workflow.yml names the runner violation" \
  "$SCRIPTS_DIR/check-billing-guard.sh" "$FIXTURES/bad-workflow.yml"
assert_contains "Workers deploy" "bad-workflow.yml names the wrangler r2 violation" \
  "$SCRIPTS_DIR/check-billing-guard.sh" "$FIXTURES/bad-workflow.yml"

echo "== the detector catches a synthetic D-085 violation (script: wrangler deploy + Images API) =="
assert_exit 1 "bad-script.sh fails" \
  "$SCRIPTS_DIR/check-billing-guard.sh" "$FIXTURES/bad-script.sh"
assert_contains "Cloudflare Images" "bad-script.sh names the Images violation" \
  "$SCRIPTS_DIR/check-billing-guard.sh" "$FIXTURES/bad-script.sh"

echo "== a Cloudflare-Pages-Free-only script passes (synthetic fixture) =="
assert_exit 0 "good-script.sh passes" \
  "$SCRIPTS_DIR/check-billing-guard.sh" "$FIXTURES/good-script.sh"

echo "== regression: this repo's real workflows, infra/scripts/*.sh and infra/config/*.json stay clean =="
assert_exit 0 "check-billing-guard.sh with no args scans the real repo tree" \
  "$SCRIPTS_DIR/check-billing-guard.sh"

echo
echo "$case_count case(s), $fail_count failed"
if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
echo "test-billing-guard: PASS"
