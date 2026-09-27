#!/usr/bin/env bash
# Thin wrapper around tools/tiles/bin/verify-bbox.py (delivered by P1-F02-T06; committed
# per-province polygons added by P2-F04-T23 / P1-X39) so CI (P2-F06-T16) and a developer have one
# stable entry point under infra/, matching the infra/scripts/lint-headers.sh convention.
#
# Python stdlib only (no pip install), no network, no credential: reads
# tools/tiles/config.json#area.bbox and the committed data/map/playable-provinces.geojson +
# data/map/playarea-mask.geojson, and exits 1 when a playable province or the playarea mask hole
# falls outside the bbox.
#
# usage: check-bbox.sh [verify-bbox.py args, e.g. --config <path>]
source "$(dirname "$0")/lib.sh"

need python3

python3 "$REPO_ROOT/tools/tiles/bin/verify-bbox.py" "$@"
