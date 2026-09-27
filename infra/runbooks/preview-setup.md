# Runbook: Cloudflare Pages Free preview (P1-F02-T08)

Owner: devops-engineer. Used by HUMAN P1-F02-T17 (one-time account/project/token setup) and
P1-F02-T19 (publish tiles + deploy preview, repeated every time a new preview is needed).

Everything below is copy-pasteable. Every step that touches money or a credential says so
explicitly. **If any screen asks for a card, a payment method, or a paid-plan upgrade (including
a "free trial" that requires a card), stop immediately, do not fill anything in, and report to
the orchestrator which screen and message you saw (D-001).**

Related documents:

- `docs/tech/F02-map-location-spike.md` section 7 (host decision, budgets, `_headers`) and 14
- `docs/adr/0002-backend-stack.md` (why Cloudflare, free-tier ceiling table)
- `docs/tech/environments.md` (env var list, repo-public rules)
- `docs/tech/asset-delivery.md` section 6 (P2-F04-T08: `/kw/*` cache headers, prebuild ordering)
- `infra/config/pages.json` (project names -- config, not secret)
- `infra/runbooks/billing-guard.md` (D-085: verify token scope + billing notifications, used by
  HUMAN P2-C07 -- separate from this file, do it once the deploy in section 3 is working)

## 1. What gets created

Two Cloudflare Pages Free projects, in the **same** Cloudflare account, no card required (D-008):

| project | contents | who creates it | how |
| --- | --- | --- | --- |
| `keep-walking-preview` | the client SPA (Vite build) | **HUMAN, once** (step 2 below) | dashboard, Direct Upload |
| `keep-walking-map` | tiles (XYZ + `tiles.json`), glyphs, sprites, fonts | **the workflow itself, on first run** | `wrangler pages project create` (same token, same permission) |

You do not need to click "Create project" twice. `infra/scripts/publish-tiles.sh` creates
`keep-walking-map` automatically the first time it deploys, using the one API token from step 3.
If the project already exists it just deploys to it -- safe to re-run.

## 2. HUMAN P1-F02-T17 -- account, one Pages project, API token

Do this once. No deploy happens in this step (that is P1-F02-T19).

1. Sign up at <https://dash.cloudflare.com/sign-up> with the project's email. Verify the email,
   then turn on 2FA (My Profile -> Authentication). **Do not add a payment method anywhere.**
2. Note the Account ID (Account Home, or the right-hand sidebar of any Workers & Pages page).
   Not a severe secret, but still do not commit it -- it goes in the GitHub secret in step 4.
3. Create the client Pages project: Workers & Pages -> Create -> **Pages** tab -> **Upload
   assets** (Direct Upload). Project name: `keep-walking-preview` (must match
   `infra/config/pages.json` -> `projects.client.name`; if that name is taken, pick another and
   tell the orchestrator so this file and `infra/config/pages.json` get updated together). Upload
   a folder containing one empty `index.html` just to create the project -- the real deploy is
   P1-F02-T19. Note the URL `https://keep-walking-preview.pages.dev`.
4. Create the API token: My Profile -> API Tokens -> Create Token -> Create Custom Token.
   - Permissions: **Account -> Cloudflare Pages -> Edit** (this alone covers project creation,
     which is how `keep-walking-map` gets made -- see section 1). Do not add Workers Scripts or
     D1 permissions; this runbook never asks the workflow to touch either.
   - Account Resources: this account only.
   - TTL: optional.
   - Copy the token now -- it is shown once.
5. Store the two values as **GitHub repository secrets** (not in any file): repo -> Settings ->
   Secrets and variables -> Actions -> New repository secret:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`

   Optional, for running the scripts on your own machine: after `P1-F02-T01` has run (so
   `.gitignore` exists), copy the same two names into `/Users/pongpon/Game/.env.local` and run
   `git check-ignore -v .env.local` to confirm it is ignored before putting any real value there.
6. Never paste the token into chat, the board, an issue, or any committed file (repo is public,
   D-002). Tell the orchestrator only: "done", the project name, the `*.pages.dev` URL, and one
   sentence confirming no screen asked for a card and Billing shows no payment method on file.

### 2.1 Optional: enable the GitHub Pages fallback (only if step 4 of section 3 tells you to)

The GitHub Pages fallback (`use_github_pages_fallback: true`) needs the repo's Pages source set
to GitHub Actions, once: repo -> Settings -> Pages -> Build and deployment -> Source: **GitHub
Actions**. This is free for a public repo, no card, and only matters if the tile build ever
exceeds the Cloudflare Pages file-count budget (tech note section 7.3 step 3). Skip this section
entirely until `infra/runbooks/preview-setup.md` section 4 step 4 tells you it is needed.

## 3. HUMAN P1-F02-T19 -- publish tiles and deploy the preview

Start only after: P1-F02-T17 done (secrets exist), P1-F02-T18 done (first push succeeded), and
P1-F02-T15 (tech gate) PASS (TL-S01 -- do not deploy a build that might leak a secret or a
coordinate in a log to a public URL before the tech gate has checked for that).

1. In a terminal at `/Users/pongpon/Game`: `git status` (confirm no `.env.local` or
   `qa/playtest/results/raw/*` is tracked), then `git push` if there is anything new. The workflow
   runs the code that is on GitHub, not your working tree.
2. Confirm the two secrets exist: repo -> Settings -> Secrets and variables -> Actions -- you
   should see `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` listed (values are never shown).
3. Repo -> **Actions** tab -> workflow **"deploy-preview"** -> **Run workflow**.
   - First run: leave `dry_run` = **true**, `use_github_pages_fallback` = **false**. This builds
     the tiles, checks the file-count budget, and builds the client, but calls no Cloudflare API
     and deploys nothing. Open the run's Summary tab and its `tiles` / `check-file-budget` step
     logs: confirm the tile count and total file count are both under target, and that the client
     build finished.
   - If the dry run's Summary shows `tile result: ghpages`: the tile build only fits the GitHub
     Pages fallback. Do section 2.1 once, then re-run with `use_github_pages_fallback` = **true**
     (keep `dry_run` = **true** first to see the plan, since the actual GitHub Pages deploy has no
     dry-run mode of its own).
   - If the dry run's Summary shows `tile result: fail`: nothing fits any free host. **Stop. Do
     not enable a paid host yourself.** Report to the orchestrator with the run URL; the options
     are shrinking the tile area/zoom (a devops/location-engineer task) or a HUMAN decision to
     approve a paid tier (a separate cost decision, not this task).
   - Once the dry run looks right, run again with `dry_run` = **false** (same
     `use_github_pages_fallback` value as the successful dry run).
4. Read the real run's Summary for the two `*.pages.dev` URLs (or the `github.io` URL if the
   fallback was used). Send these to the orchestrator as the preview URL.

## 4. Verify with curl (tech note section 7.2, D-031)

Replace `<MAP_URL>` with the map project URL from the run Summary (normally
`https://keep-walking-map.pages.dev`), and `<TILESET_ID>` with the `tileset_id` field of
`manifest.json` (also printed in the Summary and in the `tiles` step log).

**Main path (Cloudflare Pages XYZ) -- must get `200`, never `206`:**

```sh
# 1. A real tile: 200, correct content-type, CORS, Timing-Allow-Origin.
curl -sS -D - -o /dev/null "<MAP_URL>/tiles/<TILESET_ID>/14/12765/7560.mvt"
# expect: HTTP/2 200, content-type: application/x-protobuf,
#         access-control-allow-origin: *, timing-allow-origin: *

# 2. Same tile, ask for compression -- Cloudflare should compress application/x-protobuf itself.
curl -sS -D - -o /dev/null -H "Accept-Encoding: gzip, br" "<MAP_URL>/tiles/<TILESET_ID>/14/12765/7560.mvt"
# expect: content-encoding: gzip (or br)

# 3. A tile that does not exist in the built set: must be a REAL 404, not index.html with a 200
#    (this is exactly what infra/pages/keep-walking-map/404.html exists to prevent, QA TC-TILE-04).
curl -sS -D - -o /dev/null "<MAP_URL>/tiles/<TILESET_ID>/20/1/1.mvt"
# expect: HTTP/2 404

# 4. TileJSON and manifest are reachable, short-cached, and (P1-X41) get their OWN header
#    values, not the tile rule's: content-type application/json (not application/x-protobuf),
#    and exactly ONE access-control-allow-origin value (not "*, *"). tiles.json lives under
#    /tiles/<id>/, the same prefix the tile rule (/tiles/*) matches -- infra/pages/keep-walking-map/
#    _headers detaches the tile rule's headers before setting tiles.json's own (P1-X41);
#    infra/scripts/lint-headers.sh checks this statically, this curl is the live confirmation.
curl -sS -D - -o /dev/null "<MAP_URL>/tiles/<TILESET_ID>/tiles.json"
# expect: HTTP/2 200, content-type: application/json, cache-control: public, max-age=300,
#         exactly one access-control-allow-origin header with value "*" (grep -c below must
#         print 1, not 2)
curl -sSI "<MAP_URL>/tiles/<TILESET_ID>/tiles.json" | grep -ic '^access-control-allow-origin:'
# expect: 1

curl -sS -D - -o /dev/null "<MAP_URL>/manifest.json"
# expect: HTTP/2 200, cache-control: public, max-age=300

# 5. Range requests get 200 with the WHOLE file, never 206, on Cloudflare Pages (D-031). This is
#    expected, not a bug -- re-run this only when Cloudflare announces 206 support (tech note 7.2
#    step 3), and only then consider moving back to PMTiles on Pages.
curl -sS -o /dev/null -D - -H "Range: bytes=0-99" -H "Accept-Encoding: identity" \
  "<MAP_URL>/tiles/<TILESET_ID>/14/12765/7560.mvt"
# expect today: HTTP/2 200, full content-length, no content-range
```

**Client asset delivery (`/kw/*`, docs/tech/asset-delivery.md section 6, P2-F04-T08) -- these only
return real content once `apps/client`'s own build copies `tools/art/out/client/` into `dist/kw/`
(gameplay-programmer, P2-F05-T10/P2-F06-T09); until then a `/kw/*` request 404s on the deployed
client project, which is expected, not a header-rule bug:**

```sh
# Replace <CLIENT_URL> with the client project URL (normally https://keep-walking-preview.pages.dev)
curl -sS -D - -o /dev/null "<CLIENT_URL>/kw/asset-manifest.json"
# expect: cache-control: no-cache (must revalidate every load, it is the version pointer)

curl -sS -D - -o /dev/null "<CLIENT_URL>/kw/fonts/ui/IBMPlexSansThaiLooped-Medium.woff2"
# expect: content-type: font/woff2, cache-control: public, max-age=31536000, immutable

curl -sS -D - -o /dev/null "<CLIENT_URL>/kw/fonts/map/NotoSansThai-Regular.ttf"
# expect: content-type: font/ttf, cache-control: public, max-age=31536000, immutable

curl -sS -D - -o /dev/null "<CLIENT_URL>/kw/art/avatar/hair/<some-shipped-file>@2x.png"
# expect: cache-control: public, max-age=31536000, immutable (Content-Type is Cloudflare's own
# extension inference for .png -- this repo does not override it)
```

Static overlap check (offline, no deploy needed): `bash infra/scripts/lint-headers.sh` (or
`infra/scripts/test/test-lint-headers.sh`) -- CI runs this on every push in job `lint-headers`.

**Fallback path (GitHub Pages PMTiles) -- only when `use_github_pages_fallback` was used, must
get `206`:**

```sh
curl -sS -o /dev/null -D - -H "Range: bytes=0-99" -H "Accept-Encoding: identity" \
  "https://<owner>.github.io/<repo>/pmtiles/<TILESET_ID>.pmtiles"
# expect: HTTP/2 206, content-range: bytes 0-99/<size>, access-control-allow-origin: *
```

Cache-Control on the GitHub Pages fallback is **fixed by GitHub** at `max-age=600` and cannot be
changed by this repo (`infra/config/pages.json` -> `githubPagesFallback.fixedCacheControl`) --
record this value here, not a made-up one, so anyone interpreting bandwidth/cache numbers from a
field test uses the real figure (TL-S07).

5. Open the preview URL (`keep-walking-preview.pages.dev`) on a real phone: confirm the Bangkok
   map renders, Thai street names are readable, and the debug HUD opens. Send the URL to the
   orchestrator.

## 5. Local preview -- no Cloudflare account needed

Anyone can sanity-check a build before it is ever deployed, entirely offline:

```sh
# Build the tiles locally (needs network once, for the Protomaps extract + font/glyph assets --
# not a credential, just public downloads. Never run in ci.yml, see docs/tech/environments.md 5).
bash tools/tiles/bin/build.sh

# Serve the assembled tile set the same way Cloudflare Pages would (adds _headers/404.html first).
DRY_RUN=1 infra/scripts/publish-tiles.sh tools/tiles/out/publish   # dry-run: just checks + copies
infra/scripts/local-preview.sh tools/tiles/out/publish 8788        # http://127.0.0.1:8788

# Same for the client build, in another terminal.
DRY_RUN=1 infra/scripts/publish-client.sh tools/tiles/out/publish/manifest.json http://127.0.0.1:8788
infra/scripts/local-preview.sh apps/client/dist 8789               # http://127.0.0.1:8789
```

`infra/scripts/local-preview.sh` uses `wrangler pages dev`, a pure local static server -- it never
prompts for a Cloudflare login because there is no `wrangler.toml`/binding involved, only a plain
directory. `DRY_RUN=1` (or simply not having `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` set)
makes every `infra/scripts/*.sh` script skip its `wrangler pages project create`/`deploy` calls.

## 6. Rollback

Cloudflare Pages keeps every previous deployment. To go back:

1. Dashboard -> Workers & Pages -> `keep-walking-map` (or `keep-walking-preview`) -> Deployments.
2. Find the last good deployment -> "..." menu -> **Rollback to this deployment**. This changes
   which deployment the production alias (`*.pages.dev`) points at; it does not delete anything.
3. Equivalent from a terminal with the same token: `pnpm exec wrangler pages deployment list
   --project-name=<name>` to find the deployment ID, there is no separate "rollback" CLI verb in
   this wrangler version -- redeploy the known-good build directory instead
   (`infra/scripts/publish-tiles.sh` / `publish-client.sh` again against the old `tools/tiles/out`
   contents if still on disk, or re-run the workflow at the last-good commit).
4. To remove a project entirely (rare -- e.g. the name from step 3 of section 2 was wrong):
   Dashboard -> project -> Settings -> **Delete project**, or
   `pnpm exec wrangler pages project delete <name>`. This is destructive and needs the same token;
   do not do this to `keep-walking-map` casually since the workflow expects to find it (it will
   just recreate it on the next run, but every past tile deployment's history is gone with it).
5. GitHub Pages fallback: Settings -> Pages -> Build and deployment -> Source: switch back to
   "Deploy from a branch" (or leave as GitHub Actions but simply stop passing
   `use_github_pages_fallback: true`) -- there is no separate rollback UI, the next successful
   `deploy-preview` run overwrites it.

## 7. Extension path: PMTiles on R2 (GDD's long-term design)

Everything above stays free (D-001) as long as tiles fit the Cloudflare Pages Free file-count
budget as an XYZ set. The GDD's actual long-term design is a single PMTiles archive on R2, which
answers real HTTP range requests (`206`) and has no per-file cap -- but R2 requires completing a
billing checkout to enable the subscription even before any usage-based charge accrues (ADR 0002
section 4.1, "R2G"), so it needs a separate HUMAN cost-approval decision (D-001), not something
this task or workflow does on its own.

When approved, in the **same Cloudflare account**:

1. HUMAN enables R2 (accepts the billing checkout) and creates a bucket.
2. `TILES_PUBLIC_BASE_URL` changes from `https://keep-walking-map.pages.dev` to the R2 bucket's
   public URL (custom domain or `r2.dev` subdomain).
3. `infra/scripts/publish-tiles.sh` is replaced by an R2 upload (`wrangler r2 object put` or the
   S3-compatible API) of a single `.pmtiles` file instead of an XYZ directory -- the `_headers`
   rules in `infra/pages/keep-walking-map/_headers` become R2 bucket CORS/cache rules instead.
4. `VITE_TILES_URL` changes from a TileJSON URL to `pmtiles://<r2-public-url>/<tileset_id>.pmtiles`
   -- no client code changes (tech note section 8, `map/source.ts` already handles both forms).
5. `infra/config/pages.json` gains an `r2` section next to `projects.map`; this runbook gets a new
   section 8 at that time.

## 8. Cost at 100 / 1,000 / 5,000 DAU (CLAUDE.md cost-awareness rule)

Everything this task builds is **static asset hosting only** (Cloudflare Pages Free, optionally
GitHub Pages Free) -- no Workers request, no Durable Object, no D1 row is touched by serving a
tile, a glyph, a sprite, or the client bundle. Cloudflare Pages static requests are free and
unmetered on the Free plan regardless of volume (ADR 0002 section 4.2, row "Pages | bandwidth /
request"), so:

| DAU | this infra's cost | why |
| --- | --- | --- |
| 100 | **$0/month** | static requests, no limit on Pages Free |
| 1,000 | **$0/month** | same -- still just static file serving |
| 5,000 (incl. Saturday raid) | **$0/month** for tiles/client | a raid multiplies Worker/DO/D1 traffic (see ADR 0002 section 0/5 for that cost curve, ~5-10 USD/month baseline once Workers Paid is needed), but it does not add a single request to `keep-walking-map`/`keep-walking-preview`: the map/client are loaded once per session, not per movement tick |

The only cost driver this runbook could ever introduce is R2 (section 7): R2 storage/Class A-B
operations are usage-based once enabled, but at PMTiles-archive scale (tens to low hundreds of MB,
read-heavy) the estimated cost is low single-digit USD/month even at 5,000 DAU -- get a real
number from Cloudflare's current R2 pricing page at approval time, not from this file, since
prices drift (ADR 0002 already flags Worker/D1 prices as "informational only, verify before a
cost decision").

## 9. Troubleshooting

| symptom | likely cause | fix |
| --- | --- | --- |
| `wrangler pages project create` fails, not "already exists" | token missing Pages:Edit, or wrong account ID | re-check step 4 of section 2; token scope must be Account -> Cloudflare Pages -> Edit |
| workflow Summary shows `tile result: nohost` (build.sh exit 4) | tile build (even at fallback maxzoom) exceeds every free-tier cap | do not upgrade to a paid host yourself; report to orchestrator (tech note 7.3 step 4) |
| workflow Summary shows `tile result: fail` (build.sh exit 1 or any code other than 0/3/4) | a generic build error -- missing tool, a bad/stale download, or a required input file absent. **Not** a budget verdict; do not read this as D-001 | open the "Build tiles" step log, find the `[tiles] ERROR: ...` line (or a Python traceback) just above the exit; fix that specific cause. See the next row for the one already hit and fixed (P1-X39) |
| "Build tiles" step fails on a clean checkout with `FileNotFoundError: ... tools/coverage/out/boundaries.geojson` (or `build.sh` used to `die "bbox does not cover..."` for the same reason before P1-X39) | `tools/coverage/out/` is git-ignored (the `out/` rule in `.gitignore` matches it): it only exists on a machine where someone ran the full coverage-survey pipeline (`tools/coverage/pipeline`, needs the 327 MB OSM extract) locally. A fresh clone/CI runner never has it | already fixed in `tools/tiles/bin/build.sh` (P1-X39): the bbox-vs-province check now SKIPS with a `[tiles] skip: ...` log line when that file is absent, same rule `tools/tiles/test/run.sh` already used. If you see this exact traceback again, `build.sh` was reverted to the old unconditional call -- restore the `if [[ -f "$BOUNDARIES_FILE" ]]` guard around the `verify-bbox.py` call |
| `check-file-budget.sh` fails with `FAIL: ... exceeds Cloudflare Pages hard cap` | a change increased tile count/size past 20,000 files or 25 MiB/file | lower `area.maxzoom` in `tools/tiles/config.json` (location-engineer), or use the GitHub Pages fallback |
| curl on a real tile gets `200` with `content-length` bigger than the `Range` request | expected on Cloudflare Pages today (D-031) -- this is not the fallback's `.pmtiles` path | confirm you used the XYZ `.mvt` URL, not a `pmtiles://` one, for the main path |
| client shows "tiles not configured" | `VITE_TILES_URL` empty or wrong | check the `publish-client` step log for the exact value it exported, and the manifest's `layout`/`tileset_id` |
| GitHub Pages deploy step fails with a permissions/environment error | repo Pages source is not set to "GitHub Actions" | do section 2.1 once |
| client's map fails to load; browser console shows a CORS error on `.../tiles/<id>/tiles.json` (`Access-Control-Allow-Origin` has multiple values); `curl -sI` on that same URL shows `content-type: application/x-protobuf` and/or `access-control-allow-origin: *, *` | **P1-X41, fixed:** `/tiles/*` and the more specific `/tiles/*/tiles.json` rule in `infra/pages/keep-walking-map/_headers` both match a tiles.json request (`*` is a splat, it matches across `/`); Cloudflare Pages applies every matching rule and concatenates same-named header values instead of letting the more specific rule win | already fixed: the `tiles.json` rule now starts with `! Content-Type` / `! Cache-Control` / `! Access-Control-Allow-Origin` / `! Timing-Allow-Origin` / `! X-Robots-Tag` (Cloudflare's detach directive) before setting its own single value of each. If this regresses, run `infra/scripts/lint-headers.sh` (or `bash infra/scripts/test/test-lint-headers.sh`) locally first -- both fail loudly and name the exact duplicated header before you need a real deploy to notice |
| "Build tiles" step fails immediately with `[tiles] ERROR: config value .tools.pmtiles.version missing in infra/config/pages.json` (or any `.tools.*`/`.area.*`/`.schema.*` key "missing in infra/config/pages.json") | fixed P1-X40, do not reintroduce: `tools/tiles/bin/lib.sh` reads the env var `TILES_CONFIG` as an override for `tools/tiles/config.json` (documented in `tools/tiles/README.md` and `tools/tiles/size-report.md`). `deploy-preview.yml` used to declare a job-level `env: TILES_CONFIG: infra/config/pages.json` for its own unrelated "which Pages project URLs" lookup; a job-level `env:` is visible to every step, so it silently redirected `build.sh` to read the Pages-project config file instead of its own, and it died on the first missing tile-build key. This is not a Linux/runner issue -- it reproduces identically on macOS (`TILES_CONFIG=infra/config/pages.json bash tools/tiles/bin/build.sh`) | the workflow's variable is named `PAGES_CONFIG` now (same name `infra/scripts/lib.sh` already used, no collision). If you add a new workflow-level `env:` entry, never name it `TILES_CONFIG` -- that name is reserved for `tools/tiles`'s own config override |
| no access to the raw Actions run log to see the `[tiles] ERROR: ...` line (no repo auth, or the run expired) | — | download the `tile-build-logs` artifact from the run's Summary page (Actions -> the run -> Artifacts). It is uploaded automatically `if: failure()` and contains `tools/tiles/out/build.log` (full stdout+stderr of `build.sh`) plus whatever of `verify-bbox.txt`, `size-report.txt`/`.json`, and `manifest.json` existed at the point of failure. Never contains tile/pmtiles data, only text logs and small JSON, retained 14 days |
| CI job `billing-guard` fails with `FAIL <file> -- matches forbidden pattern '...'` (P2-F04-T08, D-085) | a workflow, `infra/scripts/*.sh`, or `infra/config/*.json` edit added a call/keyword for a billable Cloudflare product (R2, Images, Stream, Argo, Load Balancing, Logpush, any Workers deploy other than `wrangler pages ...`) or non-standard GitHub Actions runner/Packages/Codespaces usage | this is almost never a bug to "fix" quietly -- it means the change needs a real HUMAN cost-approval decision first (decision log), same as the R2 extension path in section 7 below. Revert the change or get the decision recorded, then re-push. Never edit `infra/scripts/check-billing-guard.sh`'s patterns just to make a real violation pass |
| CI job `lint-headers` fails | see the row above (P1-X41) -- same script, just now run automatically on every push instead of only by hand |
| deployed client's `/kw/*` URLs 404 even though the workflow succeeded | expected until `apps/client`'s own build copies `tools/art/out/client/` into `dist/kw/` (gameplay-programmer, P2-F05-T10/P2-F06-T09) -- the `_headers` cache rules in `infra/pages/keep-walking-preview/_headers` exist and are lint-checked regardless of whether anything is deployed under those paths yet |

## 10. HUMAN P2-F06-T26 -- deploy a `playtest` build and smoke it on Android + iPhone

Owner: devops-engineer (P2-F05-T14) built the `profile` input this section uses; the deploy and
smoke test itself is HUMAN task P2-F06-T26. Same `deploy-preview` workflow and same two Cloudflare
Pages Free projects as sections 1-4 above -- `profile: playtest` only changes two build-time
strings passed to the client build (`VITE_KW_PROFILE`, `VITE_KW_COMMIT`), nothing about hosting, no
new secret, no billable service (D-085).

### 10.1 Before you start -- gates

Do not run this section until ALL of these are true (board `studio/phases/phase-2/board.md`, "กฎ
งานที่ขึ้นกับผลเดินทดสอบ"): P2-F05-T16 (QA gate F04+F05) PASS, P2-F06-T21 (QA gate F06) PASS,
P2-C05 (field-test go/no-go) = **Go**, P2-F06-T12 (Wake Lock/pocket-screen device matrix) done. If
P2-C05 is **No-go**, stop -- do not deploy a playtest build on a stack that has not gone through the
field-test gate, and tell the orchestrator instead of running this section.

### 10.2 Deploy

1. `git status` at `/Users/pongpon/Game`, confirm nothing untracked/secret, `git push` if needed --
   same as section 3 step 1, the workflow always builds the commit that is on GitHub.
2. Repo -> **Actions** tab -> workflow **"deploy-preview"** -> **Run workflow**.
   - `profile`: **playtest**.
   - `dry_run`: **true** first. Open the run's Summary: confirm the tile result line looks the same
     as any normal preview run, AND confirm the new line `profile input: playtest (client
     VITE_KW_PROFILE="playtest", VITE_KW_COMMIT=<8 hex chars>)` shows a non-empty commit.
   - `use_github_pages_fallback`: same value the last successful normal-preview run used (section 3
     step 3 second bullet), unless the tile set changed since.
   - Once the dry run looks right, run again with `dry_run` = **false** (same other inputs).
3. Read the real run's Summary for the client URL (`https://keep-walking-preview.pages.dev` unless
   `infra/config/pages.json` was changed) -- this is the SAME URL a normal `profile: preview` run
   deploys to, there is no separate `-playtest` project. That also means: **do not re-run
   `deploy-preview` with `profile: preview` (or any other change) while playtesters are actively
   using the link** -- the next successful deploy to the same project replaces it immediately
   (Cloudflare Pages Free has no separate "playtest" alias to isolate this).

### 10.3 Verify version/SHA on the phone, then smoke test

1. Open the client URL from step 3 above on the Android phone, then the iPhone (real device, real
   mobile network or Wi-Fi -- not the office network's dev proxy).
2. Look at the on-page build badge (small text on the map shell, `apps/client/src/main.ts`): it
   must read exactly `playtest <short-sha>`, where `<short-sha>` matches the `VITE_KW_COMMIT` value
   the Summary printed in step 10.2.2 (also matches `git log --oneline -1` of the commit you pushed
   in step 10.2.1). If the badge is missing, shows `dev ...`, or shows a different SHA: **stop, do
   not hand the link to playtesters** -- the deploy did not pick up the `playtest` profile or an
   older deployment is still live; re-check the run's Summary and re-deploy.
3. Confirm the HUD stays OFF by default on both phones (no `?hud=1` in the URL) and only opens when
   `?hud=1` is added by hand -- this is the client-side behaviour P2-F04-T25 already implements,
   this step is only confirming it survived the real build, not re-testing the feature logic.
4. Confirm `?loc=mock` is NOT reachable without deliberately typing it (playtest profile still
   allows Mock via query for the smoke test itself, per tech note F04 section 17 -- this is
   expected and is how you drive a scripted trace on the phone if a GPS walk is not being done for
   this particular smoke check).
5. Walk a short real loop near a launch-area dungeon on each phone (or replay a trace with
   `?loc=mock&trace=<id>`), confirm a tick/drop reaches the summary screen, confirm no crash on
   backgrounding the tab, then report PASS/FAIL plus the exact URL and commit SHA to the
   orchestrator -- that URL is what P2-F06-T27's real playtesters get.

### 10.4 Rollback

Same mechanism as section 6 (Cloudflare Pages keeps every previous deployment): Dashboard -> Workers
& Pages -> `keep-walking-preview` -> Deployments -> find the last good deployment -> "..." ->
**Rollback to this deployment**. Because `playtest` and `preview` share one project, rolling back
also affects whichever profile was live before -- check the badge again after any rollback (step
10.3.2) before telling playtesters the link is safe again.
