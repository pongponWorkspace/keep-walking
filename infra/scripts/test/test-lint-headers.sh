#!/usr/bin/env bash
# Test harness for infra/scripts/lint-headers.sh / lint-headers.py (P1-X41). Runnable directly,
# no network, no credential, no Cloudflare account:
#   bash infra/scripts/test/test-lint-headers.sh
#
# Not yet wired into `pnpm test` -- vitest.config.ts's `include` globs do not cover infra/, and
# this task's `writes` does not include vitest.config.ts or .github/workflows/*.yml. See this
# task's REPORT for the exact one-line change (a new `include` glob, same pattern as
# tools/coverage's pytest-bridge.test.ts) a follow-up task should make.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$HERE/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/../.." && pwd)"
FIXTURES="$HERE/fixture-headers"

fail_count=0
case_count=0

# assert_exit <expected_rc> <description> -- <cmd...>
# Runs the command with stdout/stderr captured (silent on pass, printed on fail).
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
# Runs the command, asserts its combined output contains a substring, regardless of exit code.
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

echo "== the detector catches the real bug (synthetic fixture, no detach) =="
assert_exit 1 "bad-overlap/_headers fails" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$FIXTURES/bad-overlap/_headers"
assert_contains "FAIL" "bad-overlap/_headers reports FAIL in output" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$FIXTURES/bad-overlap/_headers"
assert_contains "Access-Control-Allow-Origin" "bad-overlap/_headers names the duplicated header" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$FIXTURES/bad-overlap/_headers"

echo "== the '!' detach fix passes (synthetic fixture) =="
assert_exit 0 "good-detach/_headers passes" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$FIXTURES/good-detach/_headers"

echo "== a malformed rule is a parse error, not a silent pass =="
assert_exit 1 "malformed/_headers fails to parse" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$FIXTURES/malformed/_headers"
assert_contains "PARSE ERROR" "malformed/_headers reports a parse error" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$FIXTURES/malformed/_headers"

echo "== regression: the real, currently-committed _headers files stay fixed =="
assert_exit 0 "infra/pages/keep-walking-map/_headers passes" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$REPO_ROOT/infra/pages/keep-walking-map/_headers"
assert_exit 0 "infra/pages/keep-walking-preview/_headers passes" \
  python3 "$SCRIPTS_DIR/lint-headers.py" "$REPO_ROOT/infra/pages/keep-walking-preview/_headers"
assert_exit 0 "lint-headers.sh with no args checks every project (infra/config/pages.json)" \
  "$SCRIPTS_DIR/lint-headers.sh"

echo
echo "$case_count case(s), $fail_count failed"
if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
echo "test-lint-headers: PASS"
