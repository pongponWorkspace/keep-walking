#!/usr/bin/env bash
# Static billing guard (D-085, P2-F04-T08). Wired into `.github/workflows/ci.yml` job
# `billing-guard`.
#
# Why static, why no token: D-085 -- a card is on file on Cloudflare but the account stays on the
# Free plan, and the one API token this repo's automation ever reads (GitHub Actions secret
# CLOUDFLARE_API_TOKEN, created by HUMAN P1-F02-T17) is scoped to Account > Cloudflare Pages >
# Edit only. No agent, script, or workflow in this repo may hold or read that token to ask
# Cloudflare "what can this token actually do" -- CLAUDE.md "You never hold credentials". So this
# check never calls any API and never reads a secret: it greps the actual executable surface of
# this repo's own automation (workflow YAML, the deploy shell scripts, and the JSON config
# Cloudflare/GitHub read) for the billable products D-085 lists, and fails loudly if it finds one.
# A HUMAN verifies the real token scope and the Cloudflare/GitHub billing pages by hand --
# infra/runbooks/billing-guard.md, used once in P2-C07.
#
# Forbidden (D-085): Workers Paid / any Workers deploy other than Cloudflare Pages, R2, Cloudflare
# Images, Cloudflare Stream, Argo Smart Routing, Load Balancing, Logpush, GitHub Actions self-hosted
# or "larger" runners (billed even on a public repo), GitHub Packages, Codespaces. This repo's own
# automation only ever uses: Cloudflare Pages Free (`wrangler pages ...`, D-008, unmetered static
# hosting) and GitHub-hosted standard runners (unlimited-minutes free for a PUBLIC repo, D-002).
#
# Scope on purpose: only `.github/workflows/*.yml`, `infra/scripts/*.sh` (excluding
# `infra/scripts/test/`, which legitimately has to quote these same words in its own negative-test
# fixture -- see `infra/scripts/test/test-billing-guard.sh`), and `infra/config/*.json` are
# scanned: the only places this repo's automation could actually invoke a Cloudflare/GitHub API or
# provision CI compute. Markdown runbooks are prose, not automation, and one of them
# (`infra/runbooks/preview-setup.md` section 7) already documents a real, HUMAN-gated future
# extension onto R2 -- scanning prose would either false-positive on that clearly-labeled,
# not-yet-approved plan or force writing around it, defeating the point of a runbook that explains
# the extension path honestly.
#
# usage: infra/scripts/check-billing-guard.sh [<file>...]
#   no arguments: scans this repo's real .github/workflows/, infra/scripts/, infra/config/.
#   arguments: scan exactly these files instead (test hook, see infra/scripts/test/).
#
# Runs fully offline, reads no environment variable, makes no network or API call.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
SELF_BASENAME="$(basename "${BASH_SOURCE[0]}")"

collect_default_targets() {
  # bash 3.2 (macOS stock) has no mapfile/associative arrays -- same constraint as
  # infra/scripts/lint-headers.sh, so this uses the identical while-read-process-substitution
  # idiom instead.
  find "$REPO_ROOT/.github/workflows" -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) 2>/dev/null
  find "$REPO_ROOT/infra/scripts" -maxdepth 1 -type f -name '*.sh' 2>/dev/null
  find "$REPO_ROOT/infra/config" -maxdepth 1 -type f -name '*.json' 2>/dev/null
}

TARGET_FILES=()
if [[ $# -gt 0 ]]; then
  TARGET_FILES=("$@")
else
  while IFS= read -r f; do
    [[ "$(basename "$f")" == "$SELF_BASENAME" ]] && continue
    TARGET_FILES+=("$f")
  done < <(collect_default_targets | sort)
fi

# label / regex pairs, parallel arrays (bash 3.2 has no associative arrays). Each regex is
# extended (grep -E), case-insensitive (grep -i). Keep each one specific enough that this script's
# own comments above (which name every forbidden product in prose) do not match -- this file
# excludes itself from TARGET_FILES for exactly that reason, so the check below is defence in
# depth, not the only protection.
LABELS=(
  "Workers deploy / Workers Paid (only 'wrangler pages ...' is allowed, D-085/D-008)"
  "R2"
  "Cloudflare Images"
  "Cloudflare Stream"
  "Argo Smart Routing"
  "Load Balancing"
  "Logpush"
  "GitHub Packages / npm publish"
  "GitHub Codespaces"
  "self-hosted or non-standard (larger) GitHub Actions runner"
)
PATTERNS=(
  'wrangler[[:space:]]+(deploy|secret|kv|kv:namespace|d1|queues|pipelines|dispatch-namespace|r2)\b'
  '\bR2\b|r2\.dev|r2_bucket|R2Bucket|"r2"'
  'images\.cloudflare|/images/v1|wrangler[[:space:]]+images'
  'stream\.cloudflare|wrangler[[:space:]]+stream'
  '\bargo\b'
  'load[_-]?balanc(er|ing)'
  'logpush'
  'github\.pkg\.github\.com|npm.pkg.github.com|npm[[:space:]]+publish'
  'codespace'
  'runs-on:[[:space:]]*["'"'"']?(self-hosted|[a-z0-9.-]+-(2|4|8|16|32|64)-core[a-z0-9-]*)'
)

fail=0
n_files=0
n_checks=0

for f in "${TARGET_FILES[@]+"${TARGET_FILES[@]}"}"; do
  [[ -f "$f" ]] || { echo "check-billing-guard: ERROR: $f not found" >&2; exit 2; }
  n_files=$((n_files + 1))
  rel="${f#"$REPO_ROOT"/}"
  i=0
  while [[ $i -lt ${#LABELS[@]} ]]; do
    label="${LABELS[$i]}"
    pattern="${PATTERNS[$i]}"
    n_checks=$((n_checks + 1))
    hit="$(grep -inE -- "$pattern" "$f" || true)"
    if [[ -n "$hit" ]]; then
      fail=1
      echo "FAIL $rel -- matches forbidden pattern '$label':"
      printf '%s\n' "$hit" | sed 's/^/       | /'
    fi
    i=$((i + 1))
  done
done

echo "check-billing-guard: scanned $n_files file(s), $n_checks check(s)"
if [[ "$fail" -ne 0 ]]; then
  echo "check-billing-guard: FAIL -- see FAIL lines above. D-085: no agent or workflow may enable" >&2
  echo "a billable Cloudflare product or non-free-tier GitHub Actions/Packages usage. If this is a" >&2
  echo "genuine, HUMAN-approved change (a new cost decision), it belongs in the decision log first," >&2
  echo "not silently past this guard." >&2
  exit 1
fi
echo "check-billing-guard: PASS -- no billable-service pattern found in $n_files scanned file(s)."
