"""Pure functions for the per-district metrics (no file or OSM access).

Definitions: product/prd/F01-coverage-survey.md sections 3-4 and
design/levels/launch-criteria.md sections 1-4. Every threshold and weight is
passed in from config; nothing here has a default value.
"""

from __future__ import annotations

from typing import Any, Iterable

import numpy as np

ZONES = ("green", "yellow", "red")


def assign_preset(cls: str, size_band: str, presets: list[dict[str, Any]]) -> str | None:
    """First preset in presets.json whose matches.osmClasses holds the class
    and matches.sizeBand holds the size band (class-first rule: marketplace
    is in 'market' only, for every size band)."""
    hits = [p["id"] for p in presets
            if cls in p["matches"]["osmClasses"] and size_band in p["matches"]["sizeBand"]]
    if len(hits) > 1:
        raise ValueError(f"presets overlap for class={cls} size_band={size_band}: {hits}")
    return hits[0] if hits else None


def is_usable(props: dict[str, Any]) -> bool:
    """A candidate counts as a usable dungeon only when nothing is pending a
    human decision (review_required, e.g. D-048 Dusit royal grounds)."""
    return props.get("reason_excluded") is None and "review_required" not in props.get("flags", [])


def zone_of(distance_m: np.ndarray, snap_too_far: np.ndarray, bands: dict[str, float]) -> np.ndarray:
    """0 green (<= greenMax), 1 yellow (<= yellowMax), 2 red (> yellowMax or
    the cell snapped farther than walkGraphSnapMaxDistance_m, PRD 8.1)."""
    z = np.where(distance_m <= bands["greenMax"], 0, np.where(distance_m <= bands["yellowMax"], 1, 2))
    z = np.where(snap_too_far | ~np.isfinite(distance_m), 2, z)
    return z.astype(np.int64)


def weighted_mean(values: np.ndarray, weights: np.ndarray) -> float | None:
    total = float(weights.sum())
    if total <= 0:
        return None
    return float((values * weights).sum() / total)


def weighted_median(values: np.ndarray, weights: np.ndarray) -> float | None:
    """Smallest value v with cumulative weight >= half (ties by value order)."""
    if weights.sum() <= 0:
        return None
    order = np.lexsort((np.arange(len(values)), values))
    cum = np.cumsum(weights[order])
    k = int(np.searchsorted(cum, cum[-1] / 2.0))
    return float(values[order][k])


def zone_shares(zones: np.ndarray, weights: np.ndarray, snap_too_far: np.ndarray) -> dict[str, float | None]:
    total = float(weights.sum())
    if total <= 0:
        return {"green": None, "yellow": None, "red": None, "red_snap": None}
    out: dict[str, float | None] = {z: float(weights[zones == i].sum() / total) for i, z in enumerate(ZONES)}
    out["red_snap"] = float(weights[snap_too_far].sum() / total)
    return out


def transit_distance(rail_m: float, bus_m: float, tcfg: dict[str, Any]) -> float:
    """launch-criteria 4.3: rail inside railAcceptableWalk_m ->
    (railWeight x rail + busWeight x bus) / (railWeight + busWeight), else bus only."""
    if rail_m <= float(tcfg["railAcceptableWalk_m"]):
        rw, bw = float(tcfg["railWeight"]), float(tcfg["busWeight"])
        return (rw * rail_m + bw * bus_m) / (rw + bw)
    return bus_m


def min_max(values: dict[Any, float], higher_is_better: bool = True) -> dict[Any, float]:
    """Min-max over the given keys only. All equal -> 1.0 for everyone."""
    if not values:
        return {}
    lo, hi = min(values.values()), max(values.values())
    if hi == lo:
        return {k: 1.0 for k in values}
    if higher_is_better:
        return {k: (v - lo) / (hi - lo) for k, v in values.items()}
    return {k: (hi - v) / (hi - lo) for k, v in values.items()}


def launch_scores(
    raw: dict[Any, dict[str, float | None]], weights: dict[str, float], n_presets: int,
) -> dict[Any, dict[str, float]]:
    """raw[district] = {density, walk_avg_m, transit_mean_m, preset_count,
    pop_density, has_dungeon}. Districts without a usable dungeon get 0 on
    every sub-score and LaunchScore 0 (launch-criteria 3); min-max runs over
    the districts that have at least one."""
    scored = [k for k, r in raw.items() if r["has_dungeon"]]

    def pick(name: str) -> dict[Any, float]:
        return {k: float(raw[k][name]) for k in scored if raw[k][name] is not None}

    subs = {
        "densityScore": min_max(pick("density")),
        "walkDistanceScore": min_max(pick("walk_avg_m"), higher_is_better=False),
        "transitAccessScore": min_max(pick("transit_mean_m"), higher_is_better=False),
        "presetDiversityScore": {k: float(raw[k]["preset_count"]) / n_presets for k in scored},
        "populationDensityScore": min_max(pick("pop_density")),
    }
    out: dict[Any, dict[str, float]] = {}
    for k in raw:
        row = {name: (subs[name].get(k, 0.0) if k in scored else 0.0) for name in subs}
        row["launchScore"] = sum(weights[name] * row[name] for name in subs) if k in scored else 0.0
        out[k] = row
    return out


def rank_desc(scores: dict[Any, float], tiebreak: dict[Any, Any]) -> dict[Any, int]:
    """1 = highest score; ties by tiebreak key ascending (district_osm_id)."""
    order = sorted(scores, key=lambda k: (-scores[k], tiebreak[k]))
    return {k: i + 1 for i, k in enumerate(order)}


def quantiles(values: Iterable[float], qs: tuple[float, ...]) -> dict[str, float | None]:
    arr = np.asarray(list(values), dtype=np.float64)
    if arr.size == 0:
        return {f"p{int(q * 100)}": None for q in qs}
    return {f"p{int(q * 100)}": float(np.quantile(arr, q)) for q in qs}
