"""P1-F01-T06: per-district counts, walk distance on the OSM walk graph,
Launch Score, heatmap. Reads the pipeline outputs, D1 (OSM) and D2 (WorldPop).
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import shapely
from shapely.geometry import shape

from pipeline.geom import Projector

from . import metrics as M
from .graph import TransitPoint, WalkGraph, components, multi_source_dijkstra
from .raster import Grid


@dataclass
class Inputs:
    candidates: list[dict[str, Any]]  # features of candidates.geojson
    districts: list[dict[str, Any]]  # features of out/boundaries.geojson
    grid: Grid  # population window
    graph: WalkGraph
    transit: list[TransitPoint]


def load_features(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    with path.open(encoding="utf-8") as fh:
        fc = json.load(fh)
    return fc["features"], fc.get("coverage_meta", {})


def study_bbox(districts: list[dict[str, Any]], buffer_m: float) -> tuple[float, float, float, float]:
    """lon/lat box of all districts plus buffer_m (metres converted with the
    local degree length at the box centre)."""
    bounds = np.array([shape(d["geometry"]).bounds for d in districts])
    w, s = bounds[:, 0].min(), bounds[:, 1].min()
    e, n = bounds[:, 2].max(), bounds[:, 3].max()
    lat_c = (s + n) / 2.0
    dlat = buffer_m / 111_320.0
    dlon = buffer_m / (111_320.0 * math.cos(math.radians(lat_c)))
    return (w - dlon, s - dlat, e + dlon, n + dlat)


def snap(g: WalkGraph, pool: np.ndarray, x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Nearest graph node (from the index array `pool`) for every point.
    Tie-break: equidistant nodes -> lowest graph index (= lowest OSM node id,
    node_ids are sorted). Returns (graph index, snap distance m)."""
    if len(x) == 0:
        return np.zeros(0, np.int64), np.zeros(0)
    tree = shapely.STRtree(shapely.points(g.x[pool], g.y[pool]))
    pairs, dist = tree.query_nearest(shapely.points(x, y), return_distance=True, all_matches=True)
    order = np.lexsort((pairs[1], pairs[0]))
    inp, hit, dist = pairs[0][order], pairs[1][order], dist[order]
    first = np.ones(len(inp), dtype=bool)
    first[1:] = inp[1:] != inp[:-1]
    node = np.full(len(x), -1, dtype=np.int64)
    snap_d = np.full(len(x), np.inf)
    node[inp[first]] = pool[hit[first]]
    snap_d[inp[first]] = dist[first]
    return node, snap_d


def cells_by_district(grid: Grid, districts: list[dict[str, Any]]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Populated cells whose centre lies in a district. Returns (row, col,
    district index, population). A centre on a shared edge goes to the
    district that comes first in district_osm_id order."""
    rows, cols = np.nonzero(grid.values > 0)
    lon_c, lat_c = grid.centers()
    lon, lat = lon_c[cols], lat_c[rows]
    owner = np.full(len(rows), -1, dtype=np.int64)
    order = sorted(range(len(districts)), key=lambda i: districts[i]["properties"]["district_osm_id"])
    for i in order:
        geom = shape(districts[i]["geometry"])
        shapely.prepare(geom)
        w, s, e, n = geom.bounds
        cand = np.nonzero((owner < 0) & (lon >= w) & (lon <= e) & (lat >= s) & (lat <= n))[0]
        if len(cand):
            inside = shapely.contains_xy(geom, lon[cand], lat[cand])
            owner[cand[inside]] = i
    keep = owner >= 0
    return rows[keep], cols[keep], owner[keep], grid.values[rows[keep], cols[keep]]


def district_list(props: dict[str, Any]) -> list[int]:
    """Districts a candidate counts in: every district in related_ids.districts
    when multi_district (launch-criteria 1), else its own district."""
    extra = props.get("related_ids", {}).get("districts")
    if props.get("multi_district") and extra:
        return sorted(set(int(d) for d in extra) | {int(props["district_osm_id"])})
    return [int(props["district_osm_id"])]


def _project(proj: Projector, lonlat: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if len(lonlat) == 0:
        return np.zeros(0), np.zeros(0)
    x, y = proj.fwd.transform(lonlat[:, 0], lonlat[:, 1])
    return np.asarray(x, dtype=np.float64), np.asarray(y, dtype=np.float64)


def _route(g: WalkGraph, pool: np.ndarray, x: np.ndarray, y: np.ndarray):
    """Multi-source Dijkstra from points (snapped to the main component).
    Source rank = position in the input list (inputs are sorted by id)."""
    node, snap_d = snap(g, pool, x, y)
    dist, owner = multi_source_dijkstra(
        g, [(int(n), float(s), r) for r, (n, s) in enumerate(zip(node.tolist(), snap_d.tolist()))])
    return node, snap_d, dist, owner


def compute(inp: Inputs, acfg: dict[str, Any], cf: dict[str, Any], presets: list[dict[str, Any]],
            proj: Projector, class_names: list[str]) -> dict[str, Any]:
    bands = acfg["distanceBands_m"]
    tcfg = acfg["transit"]
    snap_max = float(cf["walkGraphSnapMaxDistance_m"])
    g = inp.graph

    usable = sorted((f for f in inp.candidates if M.is_usable(f["properties"])), key=lambda f: f["id"])
    not_counted = sorted(f["id"] for f in inp.candidates if not M.is_usable(f["properties"]))
    for f in usable:
        p = f["properties"]
        p["_preset"] = M.assign_preset(p["class"], p["size_band"], presets)
    dx, dy = _project(proj, np.array([f["properties"]["rep_point"] for f in usable], dtype=np.float64).reshape(-1, 2))

    comp = components(g)
    pool = np.nonzero(comp == 0)[0]
    comp_sizes = np.bincount(comp) if len(comp) else np.zeros(0, np.int64)
    d_node, d_snap, dist, owner = _route(g, pool, dx, dy)

    rows, cols, cdist, pop = cells_by_district(inp.grid, inp.districts)
    lon_c, lat_c = inp.grid.centers()
    cx, cy = _project(proj, np.column_stack([lon_c[cols], lat_c[rows]]))
    c_node, c_snap = snap(g, pool, cx, cy)
    walk = c_snap + dist[c_node] if len(c_node) else np.zeros(0)
    nearest = owner[c_node] if len(c_node) else np.zeros(0, np.int64)
    too_far = c_snap > snap_max
    zones = M.zone_of(walk, too_far, bands)

    transit_by_kind: dict[str, np.ndarray] = {}
    transit_counts: dict[str, int] = {}
    for kind in ("rail", "bus"):
        pts = [t for t in inp.transit if t.kind == kind]
        transit_counts[kind] = len(pts)
        if not pts or not len(dx):
            transit_by_kind[kind] = np.full(len(dx), np.inf)
            continue
        tx, ty = _project(proj, np.array([(t.lon, t.lat) for t in pts]))
        _, _, tdist, _ = _route(g, pool, tx, ty)
        transit_by_kind[kind] = d_snap + tdist[d_node]
    transit_d = np.array([M.transit_distance(r, b, tcfg) for r, b in
                          zip(transit_by_kind["rail"].tolist(), transit_by_kind["bus"].tolist())])

    # Straight-line comparison (PRD 8.1 fallback, reported for reference only).
    if len(dx) and len(cx):
        dtree = shapely.STRtree(shapely.points(dx, dy))
        _, euclid = dtree.query_nearest(shapely.points(cx, cy), return_distance=True, all_matches=False)
    else:
        euclid = np.full(len(cx), np.inf)
    to_owner = np.hypot(cx - dx[nearest], cy - dy[nearest]) if len(dx) and len(cx) else np.zeros(0)

    return {
        "usable": usable, "not_counted": not_counted, "d_snap": d_snap,
        "transit_rail": transit_by_kind["rail"], "transit_bus": transit_by_kind["bus"],
        "transit_d": transit_d, "transit_counts": transit_counts,
        "cells": {"row": rows, "col": cols, "district": cdist, "pop": pop, "walk": walk,
                  "snap": c_snap, "too_far": too_far, "zone": zones, "nearest": nearest,
                  "euclid": euclid, "to_owner": to_owner},
        "graph": {"nodes": g.n_nodes, "edges": g.n_edges, "components": int(len(comp_sizes)),
                  "main_component_nodes": int(len(pool)),
                  "top_component_sizes": sorted(comp_sizes.tolist(), reverse=True)[:5]},
        "rows": district_rows(inp, acfg, cf, presets, class_names, usable, not_counted,
                              transit_d, transit_by_kind, rows, cdist, pop, walk, zones, too_far),
    }


def district_rows(inp, acfg, cf, presets, class_names, usable, not_counted, transit_d,
                  transit_by_kind, rows, cdist, pop, walk, zones, too_far) -> list[dict[str, Any]]:
    """One row per district (79). Breakdown columns (class_*, size_*,
    preset_*, valid_total_area_m2) count each candidate once, in its own
    district, so they sum to valid_polygon_count. Launch-criteria columns
    (g2_*, g3_*, transit, density) count a multi_district candidate in every
    district it covers (launch-criteria 1)."""
    bands_upper = cf["sizeBandUpper_m2"]
    size_names = sorted(bands_upper, key=lambda k: bands_upper[k]) + ["large"]
    preset_ids = acfg["primaryPresets"]
    not_counted_set = set(not_counted)
    by_id = {int(d["properties"]["district_osm_id"]): i for i, d in enumerate(inp.districts)}
    own: dict[int, list[int]] = {k: [] for k in by_id}
    covers: dict[int, list[int]] = {k: [] for k in by_id}
    for j, f in enumerate(usable):
        p = f["properties"]
        own[int(p["district_osm_id"])].append(j)
        for d in district_list(p):
            if d in covers:
                covers[d].append(j)
    review_by_d: dict[int, int] = {k: 0 for k in by_id}
    for f in inp.candidates:
        if f["id"] in not_counted_set and f["properties"].get("district_osm_id") in review_by_d:
            review_by_d[f["properties"]["district_osm_id"]] += 1

    out = []
    for d_osm, i in by_id.items():
        props = inp.districts[i]["properties"]
        area_km2 = float(props["area_m2"]) / 1e6
        mask = cdist == i
        w = pop[mask]
        population = float(w.sum())
        mine = [usable[j]["properties"] for j in own[d_osm]]
        cov = covers[d_osm]
        shares = M.zone_shares(zones[mask], w, too_far[mask])
        row: dict[str, Any] = {
            "province_iso": props["province_iso"], "province": props["province"],
            "district_osm_id": d_osm, "district": props["district"], "district_en": props["district_en"],
            "district_area_km2": area_km2,
            "valid_polygon_count": len(mine),
            "review_required_not_counted": review_by_d[d_osm],
        }
        for c in class_names:
            row[f"class_{c}"] = sum(1 for p in mine if p["class"] == c)
        for s in size_names:
            row[f"size_{s}"] = sum(1 for p in mine if p["size_band"] == s)
        for pid in preset_ids:
            row[f"preset_{pid}"] = sum(1 for p in mine if p["_preset"] == pid)
        row["valid_total_area_m2"] = sum(float(p["area_m2"]) for p in mine)
        row["population"] = population
        row["population_cells"] = int(mask.sum())
        row["population_resolution"] = acfg["populationResolutionLabel"]
        row["dungeons_per_100k"] = (len(mine) / population * 1e5) if population > 0 else None
        row["distance_method"] = "osm_walk_network"
        row["walk_avg_m"] = M.weighted_mean(walk[mask], w)
        row["walk_median_m"] = M.weighted_median(walk[mask], w)
        row["g1_pop_share_green"] = shares["green"]
        row["pop_share_yellow"] = shares["yellow"]
        row["g4_pop_share_red"] = shares["red"]
        row["pop_share_red_snap"] = shares["red_snap"]
        row["s1_pop_share_green_yellow"] = (
            None if shares["green"] is None else shares["green"] + shares["yellow"])
        row["g2_valid_count_incl_multi"] = len(cov)
        row["g3_preset_count_incl_multi"] = len({usable[j]["properties"]["_preset"] for j in cov} & set(preset_ids))
        row["transit_mean_m"] = float(np.mean(transit_d[cov])) if cov else None
        row["rail_walk_mean_m"] = float(np.mean(transit_by_kind["rail"][cov])) if cov else None
        row["bus_walk_mean_m"] = float(np.mean(transit_by_kind["bus"][cov])) if cov else None
        row["dungeons_with_rail_in_reach"] = int(sum(
            1 for j in cov if transit_by_kind["rail"][j] <= float(acfg["transit"]["railAcceptableWalk_m"])))
        row["density_per_km2"] = len(cov) / area_km2 if area_km2 > 0 else None
        row["population_density_per_km2"] = population / area_km2 if area_km2 > 0 else None
        out.append(row)

    raw = {r["district_osm_id"]: {
        "density": r["density_per_km2"], "walk_avg_m": r["walk_avg_m"],
        "transit_mean_m": r["transit_mean_m"], "preset_count": r["g3_preset_count_incl_multi"],
        "pop_density": r["population_density_per_km2"],
        "has_dungeon": r["g2_valid_count_incl_multi"] > 0} for r in out}
    scores = M.launch_scores(raw, acfg["weights"], len(preset_ids))
    ranks = M.rank_desc({k: v["launchScore"] for k, v in scores.items()}, {k: k for k in scores})
    names = {"densityScore": "score_density", "walkDistanceScore": "score_walk",
             "transitAccessScore": "score_transit", "presetDiversityScore": "score_preset",
             "populationDensityScore": "score_population", "launchScore": "launch_score"}
    for r in out:
        s = scores[r["district_osm_id"]]
        for k, col in names.items():
            r[col] = s[k]
        r["launch_rank"] = ranks[r["district_osm_id"]]
    out.sort(key=lambda r: (r["province_iso"], r["district_osm_id"]))
    return out


def fallback_comparison(res: dict[str, Any], cf: dict[str, Any], bands: dict[str, float],
                        districts: list[dict[str, Any]], share_digits: int) -> dict[str, Any]:
    """Straight line x route factor (PRD 8.1 fallback) at min / fallback /
    max, next to the network result. Reference only: network routing ran."""
    c = res["cells"]
    factors = {"min": float(cf["walkRouteFactorUncertaintyMinMult"]),
               "fallback": float(cf["walkRouteFactorFallbackMult"]),
               "max": float(cf["walkRouteFactorUncertaintyMaxMult"])}
    no_snap = np.zeros(len(c["pop"]), dtype=bool)
    variants = {"network": c["zone"]}
    for name, f in factors.items():
        variants[f"straight_x{f:g}"] = M.zone_of(c["euclid"] * f, no_snap, bands)

    def shares(mask: np.ndarray) -> dict[str, Any]:
        out = {}
        for name, z in variants.items():
            s = M.zone_shares(z[mask], c["pop"][mask], no_snap[mask])
            out[name] = {k: (None if s[k] is None else round(s[k], share_digits)) for k in M.ZONES}
        return out

    per_d = {}
    for i, d in enumerate(districts):
        per_d[str(d["properties"]["district_osm_id"])] = shares(c["district"] == i)
    return {"factors": factors, "study": shares(np.ones(len(c["pop"]), dtype=bool)),
            "districts": dict(sorted(per_d.items()))}


def circuity(res: dict[str, Any], min_straight: float) -> dict[str, Any]:
    """Measured route factor: network distance / straight line to the same
    (network-nearest) dungeon, for cells that snapped within the limit."""
    c = res["cells"]
    m = (~c["too_far"]) & (c["to_owner"] >= min_straight)
    ratio = c["walk"][m] / c["to_owner"][m]
    q = M.quantiles(ratio.tolist(), (0.25, 0.5, 0.75, 0.9))
    return {"cells": int(m.sum()), "min_straight_m": min_straight,
            "quantiles": {k: (None if v is None else round(v, 3)) for k, v in q.items()},
            "pop_weighted_median": (None if not m.any()
                                    else round(M.weighted_median(ratio, c["pop"][m]), 3))}
