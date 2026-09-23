"""CLI. Run from tools/coverage/:  .venv/bin/python -m pipeline all"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .boundaries import BoundaryError
from .config import DEFAULT_DUNGEONS, DEFAULT_PARAMS, TOOL_DIR, ConfigError, load_config
from .fetch import FetchError, fetch_sources, sha256_file
from .run import resolve_outputs, run_pipeline


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="python -m pipeline", description=__doc__)
    ap.add_argument("command", choices=("all", "fetch", "run"),
                    help="all = fetch + run (default use) · fetch = download/verify only · "
                         "run = process a given --osm file (tests, experiments)")
    ap.add_argument("--params", type=Path, default=DEFAULT_PARAMS)
    ap.add_argument("--dungeons", type=Path, default=DEFAULT_DUNGEONS)
    ap.add_argument("--offline", action="store_true",
                    help="never download; only verify checksums of files already present")
    ap.add_argument("--include-optional", action="store_true",
                    help="also download optional sources (WorldPop D2 for T06, ADM1 D4)")
    ap.add_argument("--skip-crosscheck", action="store_true",
                    help="skip the geoBoundaries district area cross-check")
    ap.add_argument("--osm", type=Path, help="run: OSM file (.osm.pbf or .osm.xml)")
    ap.add_argument("--out-base", type=Path, default=TOOL_DIR,
                    help="base directory for relative output paths (default tools/coverage)")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        cfg = load_config(args.params, args.dungeons)
        pl = cfg.pipeline
        outputs = resolve_outputs(pl, args.out_base)
        by_id = {s["id"]: s for s in pl["sources"]}
        xsrc = by_id.get(pl["crossCheckSource"])

        if args.command in ("all", "fetch"):
            wanted = [s for s in pl["sources"]
                      if s["required"] or args.include_optional
                      or (s is xsrc and not args.skip_crosscheck)]
            status = fetch_sources(wanted, TOOL_DIR, args.offline, include_optional=True)
            for sid, st in status.items():
                print(f"[fetch] {sid}: {st['status']} {st['sha256'] or ''}")
            if args.command == "fetch":
                return 0
            src = by_id[pl["osmSource"]]
            osm_path = TOOL_DIR / src["path"]
            inputs = {sid: {"path": st["path"], "sha256": st["sha256"]}
                      for sid, st in status.items() if st["sha256"]}
        else:
            if args.osm is None:
                print("run needs --osm", file=sys.stderr)
                return 2
            osm_path = args.osm
            inputs = {"osm": {"path": osm_path.name, "sha256": sha256_file(osm_path)}}

        xpath = None
        if xsrc is not None and not args.skip_crosscheck and args.command == "all":
            xpath = TOOL_DIR / xsrc["path"]
        meta = run_pipeline(cfg, osm_path, inputs, outputs, xpath)
    except (ConfigError, FetchError, BoundaryError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    final = meta["counts"]["final"]
    print(f"[write] candidates {final['candidates']} · excluded {final['excluded']} · "
          f"points_unmatched {final['points_unmatched']}")
    for step in meta["counts"]["steps"]:
        print(f"[steps] {step['step']:<10} in {step['in']:>6}  out {step['out']:>6}")
    for k, v in meta["output_bytes"].items():
        print(f"[write] {k}: {v:,} bytes")
    if meta["committed_files_over_limit"]:
        print(f"WARNING: committed files over size limit: {meta['committed_files_over_limit']}")
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
