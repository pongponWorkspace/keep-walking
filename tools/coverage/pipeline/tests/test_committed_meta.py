"""P2-F04-T23: committed data/coverage outputs stay within the hygiene limits.

- run-meta.json records only config keys a reader actually uses (D-066, P1-F01-T06 handoff):
  every key under config.launchScore / config.coverageFilter is read by tools/coverage/analysis,
  and the pipeline meta embedded in candidates/excluded lists exactly REQUIRED_FILTER_KEYS.
- excluded.geojson stays <= pipeline.excludedTargetBytes (4.5 MB, tech gate F02 finding F-07),
  below the 5 MiB CI guard, so the next regenerate has headroom.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from pipeline.config import DEFAULT_PARAMS, REQUIRED_FILTER_KEYS

TOOL_DIR = Path(__file__).resolve().parents[2]
DATA = TOOL_DIR.parent.parent / "data" / "coverage"
PARAMS = json.loads(DEFAULT_PARAMS.read_text(encoding="utf-8"))["pipeline"]
ANALYSIS_SRC = "\n".join(p.read_text(encoding="utf-8")
                         for p in sorted((TOOL_DIR / "analysis").glob("*.py")))


def _read_by_analysis(key: str) -> bool:
    return re.search(rf'\[\s*"{re.escape(key)}"\s*\]|\.get\(\s*"{re.escape(key)}"', ANALYSIS_SRC) is not None


def test_run_meta_config_keys_are_read_by_analysis():
    meta = json.loads((DATA / "run-meta.json").read_text(encoding="utf-8"))
    unread = [f"launchScore.{k}" for k in meta["config"]["launchScore"] if not _read_by_analysis(k)]
    unread += [f"coverageFilter.{k}" for k in meta["config"]["coverageFilter"]
               if not _read_by_analysis(k)]
    assert not unread, f"run-meta.json records keys nobody reads: {unread}"


def test_committed_pipeline_meta_lists_only_pipeline_keys():
    for name in ("candidates", "excluded"):
        with (DATA / f"{name}.geojson").open(encoding="utf-8") as fh:
            meta = json.load(fh)["coverage_meta"]
        assert list(meta["config"]["coverageFilter"]) == list(REQUIRED_FILTER_KEYS), name


def test_excluded_geojson_under_target_and_ci_guard():
    size = (DATA / "excluded.geojson").stat().st_size
    target = int(PARAMS["excludedTargetBytes"])
    assert target <= 4_500_000 < int(PARAMS["maxCommittedFileBytes"])
    assert size <= target, f"excluded.geojson {size:,} B > target {target:,} B (F-07)"
