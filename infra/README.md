# infra/

Owner: devops-engineer. Cloudflare Pages Free preview infrastructure (D-008, D-031). No IaC
provider account is created by any script here -- account/project/token setup is a HUMAN task,
see `infra/runbooks/preview-setup.md`.

| path | what |
| --- | --- |
| `config/pages.json` | Pages project names and file-count/size budget, as data (not secret) |
| `pages/keep-walking-map/` | `_headers` + `404.html` copied into the tile deploy set before publish (tech note F02 section 7.5) |
| `pages/keep-walking-preview/` | `_headers` copied into the client build before publish |
| `scripts/publish-tiles.sh` | assembles headers/404 into a `tools/tiles/bin/build.sh` output dir, checks the file budget, `wrangler pages deploy`s it |
| `scripts/publish-client.sh` | builds `apps/client` against a published (or about-to-be-published) tile set, `wrangler pages deploy`s it |
| `scripts/prepare-ghpages-fallback.sh` | stages the temporary GitHub Pages PMTiles fallback (tech note section 7.3 step 3) for `actions/deploy-pages` |
| `scripts/check-file-budget.sh` | standalone file-count/size check, reusable anywhere |
| `scripts/local-preview.sh` | serves a built directory locally via `wrangler pages dev`, no credential |
| `scripts/test/` | tiny synthetic fixtures (not real tiles) used to exercise the scripts above before `tools/tiles` output exists; see each fixture's `manifest.json` |
| `runbooks/preview-setup.md` | the only place with full click-by-click / copy-paste steps for HUMAN P1-F02-T17 and P1-F02-T19, curl verification, rollback, and cost |

Related workflow: `.github/workflows/deploy-preview.yml` (`workflow_dispatch` only -- CLAUDE.md
"no production deploys by agents"). Related env vars: `.env.example` (root) and
`docs/tech/environments.md`.
