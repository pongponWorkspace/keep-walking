#!/usr/bin/env bash
# Synthetic fixture only (infra/scripts/test/test-billing-guard.sh) -- only Cloudflare Pages Free
# calls, same shape as the real infra/scripts/publish-client.sh.
set -euo pipefail
pnpm exec wrangler pages project create my-project --production-branch=main
pnpm exec wrangler pages deploy dist --project-name=my-project --branch=main
