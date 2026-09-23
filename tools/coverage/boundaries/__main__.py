"""CLI. Run from tools/coverage/:  .venv/bin/python -m boundaries

Offline only: verifies the checksum of the D1 extract already downloaded by
`python -m pipeline fetch` and never downloads. Output is byte-identical for
the same extract and parameters (no run time inside the files).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from pipeline.config import DEFAULT_PARAMS, TOOL_DIR
from pipeline.fetch import FetchError, fetch_sources
from pipeline.geom import Projector
from pipeline.osm_read import read_header_date

from .build import (
    BuildError, border_lines, build_borders, build_labels, build_mask, check_playable,
    feature_collection, playable_ids,
)
from .osm import ProvinceReadError, read_provinces

DEFAULT_BOUNDARY_PARAMS = Path(__file__).resolve().parent / "params.json"


def dumps(fc: dict[str, Any]) -> str:
    """Compact JSON, one feature per line (small and diff-friendly)."""
    head = {k: v for k, v in fc.items() if k != "features"}
    lines = [json.dumps(f, ensure_ascii=False, separators=(",", ":")) for f in fc["features"]]
    body = ",\n".join(lines)
    top = json.dumps(head, ensure_ascii=False, separators=(",", ":"))[:-1]
    return f'{top},"features":[\n{body}\n]}}\n'


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="python -m boundaries", description=__doc__)
    ap.add_argument("--params", type=Path, default=DEFAULT_PARAMS,
                    help="coverage params (playable provinces, OSM source, CRS)")
    ap.add_argument("--boundary-params", type=Path, default=DEFAULT_BOUNDARY_PARAMS)
    ap.add_argument("--osm", type=Path,
                    help="use this OSM file instead of source D1 (tests); skips the checksum")
    ap.add_argument("--out-base", type=Path, default=TOOL_DIR,
                    help="base directory for relative output paths (default tools/coverage)")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        pl = json.loads(args.params.read_text(encoding="utf-8"))["pipeline"]
        bp = json.loads(args.boundary_params.read_text(encoding="utf-8"))
        src = {s["id"]: s for s in pl["sources"]}[pl["osmSource"]]
        if args.osm is None:
            fetch_sources([src], TOOL_DIR, offline=True, include_optional=False)
            osm_path = TOOL_DIR / src["path"]
            source = {"id": src["id"], "file": Path(src["path"]).name, "sha256": src["sha256"]}
        else:
            osm_path = args.osm
            source = {"id": "custom", "file": osm_path.name, "sha256": None}
        source["dataDate"] = read_header_date(osm_path)
        source["tool"] = "tools/coverage/boundaries (P1-H07)"

        proj = Projector.for_crs(pl["projectedCrs"])
        playable = playable_ids(pl["studyArea"])
        provinces = read_provinces(osm_path, bp["provinces"])
        check_playable(provinces, playable)
        print(f"[boundaries] {len(provinces)} provinces, {len(playable)} playable")

        lines = border_lines(provinces, playable, proj, bp["borders"])
        mask_fc = feature_collection(
            [build_mask(lines, provinces, playable, bp["mask"])], bp["attribution"], source)
        prov_fc = feature_collection(
            [build_borders(lines)]
            + build_labels(provinces, playable, proj, bp["labels"]),
            bp["attribution"], source)

        limit = int(bp["maxFileBytes"])
        texts = {k: dumps(fc).encode("utf-8") for k, fc in
                 (("mask", mask_fc), ("provinces", prov_fc))}
        for key, text in texts.items():  # check both before writing either
            if len(text) > limit:
                raise BuildError(f"{key}: {len(text):,} bytes > limit {limit:,}")
        for key, text in texts.items():
            path = (args.out_base / bp["outputs"][key]).resolve()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(text)
            print(f"[boundaries] wrote {path} ({len(text):,} bytes)")
    except (FetchError, ProvinceReadError, BuildError, KeyError, OSError) as exc:
        print(f"[boundaries] error: {exc!r}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
