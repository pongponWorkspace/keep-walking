#!/usr/bin/env bash
# Cloudflare Pages `_headers` overlap check (P1-X41). Thin wrapper around lint-headers.py so this
# entry point matches the `.sh` convention every other script in this directory uses; the parsing
# and matching logic lives in Python (stdlib only, no pip install) because it needs proper
# associative-array-shaped state and backtracking regex matching that portable bash (this repo
# also runs on macOS's stock bash 3.2, no associative arrays) cannot express cleanly. `python3` is
# already a required tool in this repo's CI and local setup (docs/tech/environments.md section 5,
# `tools/coverage/.venv`), so this adds no new dependency.
#
# usage: lint-headers.sh [<headers-file>...]
#   no arguments: checks both known Pages projects' _headers files (infra/config/pages.json).
#
# Runs fully offline, no credential, safe in CI or a local machine with no Cloudflare account.
source "$(dirname "$0")/lib.sh"

need python3

if [[ $# -gt 0 ]]; then
  files=("$@")
else
  # Default: every Pages project's headersDir from infra/config/pages.json (currently 2).
  # `while read` + process substitution instead of `mapfile` (bash 4+ only): this repo's own
  # scripts must also run on macOS's stock bash 3.2 (see infra/scripts/test/test-lint-headers.sh).
  files=()
  while IFS= read -r dir; do
    files+=("$REPO_ROOT/$dir/_headers")
  done < <(jq -er '.projects[].headersDir' "$PAGES_CONFIG")
fi

log "checking: ${files[*]}"
python3 "$INFRA_DIR/scripts/lint-headers.py" "${files[@]}"
