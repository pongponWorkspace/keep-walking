"""P2-F04-T03: before/after table of district-counts.csv for the launch
districts (D-083), with the PRD F01 G1-G4 checks. Run from tools/coverage/:

    git -C ../.. show cb3672c:data/coverage/district-counts.csv > /tmp/before.csv
    .venv/bin/python -m analysis.compare --before /tmp/before.csv

Reads only CSV files and launch-score.config.json (launchDistricts,
goCriteria). Output is deterministic: same inputs, same bytes.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import operator
import sys
from pathlib import Path
from typing import Any

from pipeline.config import TOOL_DIR
from pipeline.output import write_text

DEFAULT_ACFG = TOOL_DIR / "analysis" / "launch-score.config.json"
DEFAULT_AFTER = TOOL_DIR.parent.parent / "data" / "coverage" / "district-counts.csv"
DEFAULT_OUT = TOOL_DIR.parent.parent / "data" / "coverage" / "launch-districts-before-after.csv"

# Display rows (not tunable values): the columns T18 / level-designer read.
METRICS = (
    "valid_polygon_count", "review_required_not_counted",
    "preset_largePark", "preset_market", "preset_pocketPark",
    "g1_pop_share_green", "pop_share_yellow", "g4_pop_share_red", "s1_pop_share_green_yellow",
    "g2_valid_count_incl_multi", "g3_preset_count_incl_multi",
    "walk_avg_m", "walk_median_m", "pocketPark_walk_median_m",
    "transit_mean_m", "rail_walk_mean_m", "bus_walk_mean_m",
    "score_transit", "launch_score", "launch_rank",
)
OPS = {">=": operator.ge, "<=": operator.le, ">": operator.gt, "<": operator.lt}
HEADER = ("district_osm_id", "district", "metric", "before", "after", "delta",
          "criterion", "pass_before", "pass_after")


def _read(path: Path) -> dict[int, dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as fh:
        return {int(r["district_osm_id"]): r for r in csv.DictReader(fh)}


def _num(text: str | None) -> float | None:
    if text is None or text == "":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _fmt(v: float | None) -> str:
    if v is None:
        return ""
    return str(int(v)) if float(v).is_integer() else f"{v:.4f}".rstrip("0").rstrip(".")


def _check(v: float | None, rule: dict[str, Any] | None) -> str:
    if rule is None:
        return ""
    if v is None:
        return "n/a"
    return "pass" if OPS[rule["op"]](v, float(rule["value"])) else "fail"


def build_rows(before: dict[int, dict[str, str]], after: dict[int, dict[str, str]],
               acfg: dict[str, Any]) -> list[tuple[str, ...]]:
    crit = acfg["goCriteria"]
    rows: list[tuple[str, ...]] = []
    for d in acfg["launchDistricts"]:
        if d not in after:
            raise KeyError(f"district_osm_id {d} not in the after file")
        a, b = after[d], before.get(d, {})
        for m in METRICS:
            va, vb = _num(a.get(m)), _num(b.get(m))
            delta = None if va is None or vb is None else va - vb
            rule = crit.get(m)
            text = f"{rule['op']} {_fmt(float(rule['value']))}" if rule else ""
            rows.append((str(d), a["district"], m, _fmt(vb), _fmt(va), _fmt(delta), text,
                         _check(vb, rule), _check(va, rule)))
    return rows


def render(rows: list[tuple[str, ...]]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(HEADER)
    w.writerows(rows)
    return buf.getvalue()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python -m analysis.compare", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--before", type=Path, required=True)
    ap.add_argument("--after", type=Path, default=DEFAULT_AFTER)
    ap.add_argument("--acfg", type=Path, default=DEFAULT_ACFG)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args(argv)
    acfg = json.loads(args.acfg.read_text(encoding="utf-8"))
    rows = build_rows(_read(args.before), _read(args.after), acfg)
    n = write_text(args.out, render(rows))
    print(f"[compare] {len(rows)} rows, {n:,} bytes -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
