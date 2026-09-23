"""Deterministic writers for district-counts.csv and run-meta.json."""

from __future__ import annotations

import csv
import io
from typing import Any

# Column -> number of decimals (None = text / integer as is). Order = CSV order.
FIXED_HEAD = [
    ("province_iso", None), ("province", None), ("district_osm_id", None),
    ("district", None), ("district_en", None), ("district_area_km2", 3),
    ("valid_polygon_count", None), ("review_required_not_counted", None),
]
TAIL = [
    ("valid_total_area_m2", 1), ("population", 0), ("population_cells", None),
    ("population_resolution", None), ("dungeons_per_100k", 3), ("distance_method", None),
    ("walk_avg_m", 0), ("walk_median_m", 0),
    ("g1_pop_share_green", 4), ("pop_share_yellow", 4), ("g4_pop_share_red", 4),
    ("pop_share_red_snap", 4), ("s1_pop_share_green_yellow", 4),
    ("g2_valid_count_incl_multi", None), ("g3_preset_count_incl_multi", None),
    ("transit_mean_m", 0), ("rail_walk_mean_m", 0), ("bus_walk_mean_m", 0),
    ("dungeons_with_rail_in_reach", None), ("density_per_km2", 4),
    ("population_density_per_km2", 1),
    ("score_density", 4), ("score_walk", 4), ("score_transit", 4), ("score_preset", 4),
    ("score_population", 4), ("launch_score", 4), ("launch_rank", None),
]


def columns(class_names: list[str], size_names: list[str], preset_ids: list[str]) -> list[tuple[str, int | None]]:
    mid = [(f"class_{c}", None) for c in class_names]
    mid += [(f"size_{s}", None) for s in size_names]
    mid += [(f"preset_{p}", None) for p in preset_ids]
    return FIXED_HEAD + mid + TAIL


def fmt(value: Any, digits: int | None) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value == float("inf"):
        return "inf"
    if digits is None:
        return str(value)
    if digits == 0:
        return str(int(round(float(value))))
    return f"{float(value):.{digits}f}"


def district_csv(rows: list[dict[str, Any]], cols: list[tuple[str, int | None]]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow([c for c, _ in cols])
    for r in rows:
        w.writerow([fmt(r.get(c), d) for c, d in cols])
    return buf.getvalue()


def study_totals(rows: list[dict[str, Any]], usable: list[dict[str, Any]]) -> dict[str, Any]:
    pop = sum(r["population"] for r in rows)

    def pop_share(col: str) -> float | None:
        if pop <= 0:
            return None
        return round(sum((r[col] or 0.0) * r["population"] for r in rows) / pop, 4)

    return {
        "usable_dungeons": len(usable),
        "districts": len(rows),
        "districts_with_usable_dungeon": sum(1 for r in rows if r["g2_valid_count_incl_multi"] > 0),
        "population": round(pop),
        "pop_share_green": pop_share("g1_pop_share_green"),
        "pop_share_yellow": pop_share("pop_share_yellow"),
        "pop_share_red": pop_share("g4_pop_share_red"),
        "pop_share_red_snap": pop_share("pop_share_red_snap"),
    }
