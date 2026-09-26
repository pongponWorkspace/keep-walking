#!/usr/bin/env bash
# Synthetic fixture only (infra/scripts/test/test-billing-guard.sh) -- deliberately violates D-085.
set -euo pipefail
pnpm exec wrangler deploy --name my-worker
echo "uploading via images.cloudflare.com API"
