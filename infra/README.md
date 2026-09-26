# infra/

Owner: devops-engineer. Cloudflare Pages Free preview infrastructure (D-008, D-031). No IaC
provider account is created by any script here -- account/project/token setup is a HUMAN task,
see `infra/runbooks/preview-setup.md`.

| path | what |
| --- | --- |
| `config/pages.json` | Pages project names and file-count/size budget, as data (not secret) |
| `pages/keep-walking-map/` | `_headers` + `404.html` copied into the tile deploy set before publish (tech note F02 section 7.5) |
| `pages/keep-walking-preview/` | `_headers` copied into the client build before publish: `/*` `X-Robots-Tag: noindex` (TL-N07), and the asset-pipeline cache rules (P2-F04-T08, `docs/tech/asset-delivery.md` 6.2) -- `/kw/asset-manifest.json` `Cache-Control: no-cache` (revalidate every load), `/kw/art/*`, `/kw/audio/*`, `/kw/fonts/*` `Cache-Control: public, max-age=31536000, immutable` (URLs carry `?v=<sha256 8>`), `/kw/fonts/*.woff2` / `*.ttf` `Content-Type` only. Overlap-checked by `scripts/lint-headers.sh` |
| `scripts/publish-tiles.sh` | assembles headers/404 into a `tools/tiles/bin/build.sh` output dir, checks the file budget, `wrangler pages deploy`s it |
| `scripts/publish-client.sh` | builds `apps/client` against a published (or about-to-be-published) tile set, `wrangler pages deploy`s it |
| `scripts/prepare-ghpages-fallback.sh` | stages the temporary GitHub Pages PMTiles fallback (tech note section 7.3 step 3) for `actions/deploy-pages` |
| `scripts/check-file-budget.sh` | standalone file-count/size check, reusable anywhere |
| `scripts/local-preview.sh` | serves a built directory locally via `wrangler pages dev`, no credential |
| `scripts/lint-headers.sh` (+ `lint-headers.py`) | `_headers` overlap check (P1-X41): fails when two rules set the same header name for the same path; no arguments = both projects' `_headers` from `config/pages.json`. Python stdlib only, offline |
| `scripts/check-billing-guard.sh` | static billing guard (D-085, P2-F04-T08): greps `.github/workflows/*.yml`, `infra/scripts/*.sh` (not `scripts/test/`) and `infra/config/*.json` for the billable products D-085 forbids (Workers deploys other than Pages, R2, Images, Stream, Argo, Load Balancing, Logpush, self-hosted/larger runners, Packages, Codespaces). No token, no API call, no network; arguments = scan only those files (test hook). The real token scope and billing pages are checked by a HUMAN with `runbooks/billing-guard.md` |
| `scripts/test/` | tiny synthetic fixtures (not real tiles) used to exercise the scripts above before `tools/tiles` output exists; see each fixture's `manifest.json`. `test-lint-headers.sh` + `fixture-headers/` (`good-detach`, `bad-overlap`, `malformed`) and `test-billing-guard.sh` + `fixture-billing/` (`good-script.sh` must pass, `bad-script.sh` / `bad-workflow.yml` must fail; they quote the forbidden words on purpose, which is why the guard skips `scripts/test/`) run in CI jobs `lint-headers` and `billing-guard` (`.github/workflows/ci.yml`) |
| `runbooks/billing-guard.md` | HUMAN check of the real Cloudflare token scope and the Cloudflare/GitHub billing pages (D-085, used once in P2-C07) -- what the static guard above cannot see |
| `runbooks/preview-setup.md` | the only place with full click-by-click / copy-paste steps for HUMAN P1-F02-T17 and P1-F02-T19, curl verification, rollback, and cost |

Related workflow: `.github/workflows/deploy-preview.yml` (`workflow_dispatch` only -- CLAUDE.md
"no production deploys by agents"). Related env vars: `.env.example` (root) and
`docs/tech/environments.md`.
