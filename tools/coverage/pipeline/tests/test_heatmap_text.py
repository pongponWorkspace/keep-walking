"""BUG-F01-002: heatmap UI text lives in data files, not in Python source."""

from __future__ import annotations

import re
import string
from pathlib import Path

from analysis import heatmap as H

THAI = re.compile("[฀-๿]")
ANALYSIS_DIR = Path(H.__file__).resolve().parent


def test_no_thai_in_analysis_python_source():
    hits = [f"{p.name}:{i}" for p in sorted(ANALYSIS_DIR.glob("*.py"))
            for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1)
            if THAI.search(line)]
    assert not hits, f"hardcoded Thai text in {hits}"


def test_strings_file_has_every_key():
    s = H.strings()
    for key in ("no_name", "district_title", "candidate_title", "table_head",
                "totals_line", "method_line"):
        assert key in s, key
    assert len(s["table_head"]) == 11  # one per column written by _table()


def test_template_fields_match_build_html():
    fields = {f for _, f, _, _ in string.Formatter().parse(H.html_template()) if f}
    assert fields == {"vb_w", "vb_h", "img_w", "img_h", "pop_png", "zone_png", "red_png",
                      "districts", "candidates", "table", "ticks", "block_m", "data_date",
                      "totals", "method"}


def test_summary_lines_format():
    totals = {"usable_dungeons": 730, "districts_with_usable_dungeon": 70, "districts": 79,
              "pop_share_green": 0.1058, "pop_share_yellow": 0.5533, "pop_share_red": 0.3409}
    out = H.summary_lines(totals, 11, 200)
    assert "730" in out["totals_line"] and "(ไม่นับ review_required 11)" in out["totals_line"]
    assert "70/79" in out["totals_line"] and "10.6%" in out["totals_line"]
    assert "200 ม." in out["method_line"]
