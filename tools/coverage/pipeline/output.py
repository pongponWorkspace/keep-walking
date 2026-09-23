"""Deterministic GeoJSON writers (RFC 7946, WGS84, sorted by id).

No run time or machine-specific value is written into GeoJSON, so two runs
on the same inputs produce byte-identical files (METHOD 11).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import shapely
from shapely.geometry import mapping
from shapely.geometry.base import BaseGeometry

from .config import REQUIRED_FILTER_KEYS, Config
from .geom import Projector
from .osm_read import RawNode
from .process import Piece

ATTRIBUTION = "© OpenStreetMap contributors"
LICENSE = "ODbL-1.0 (https://opendatacommons.org/licenses/odbl/1-0/)"
RELATED_SKIP = {"size_band"}


def _round_geom(geom: BaseGeometry, digits: int) -> dict[str, Any]:
    oriented = shapely.orient_polygons(geom) if geom.geom_type != "Point" else geom
    rounded = shapely.transform(oriented, lambda c: np.round(c, digits))
    return mapping(rounded)


def _round_shares(obj: Any, digits: int) -> Any:
    if isinstance(obj, float):
        return round(obj, digits)
    if isinstance(obj, dict):
        return {k: _round_shares(v, digits) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_round_shares(v, digits) for v in obj]
    return obj


def piece_feature(p: Piece, cfg: Config, proj: Projector, trim_tags: bool = False) -> dict:
    pl = cfg.pipeline
    tags = p.raw.tags
    if trim_tags:
        keep = set(pl["excludedTrimTagKeys"])
        tags = {k: v for k, v in tags.items() if k in keep}
    repaired = "repair_area_change_share" in p.related
    geom_wgs = proj.to_wgs(p.geom_proj) if repaired else p.raw.geom
    rp = geom_wgs.representative_point()
    digits = int(pl["coordinatePrecision"])
    d = p.district
    related = {k: v for k, v in sorted(p.related.items()) if k not in RELATED_SKIP}
    props = {
        "id": p.id,
        "osm_id": p.raw.osm_id,
        "osm_type": p.raw.osm_type,
        "name": p.raw.tags.get("name:th") or p.raw.tags.get("name"),
        "name_en": p.raw.tags.get("name:en"),
        "class": p.primary_class,
        "classes_all": list(p.raw.classes),
        "tags": dict(sorted(tags.items())),
        "area_m2": round(p.area_m2, int(pl["areaPrecision"])),
        "size_band": p.related["size_band"],
        "district": d.name if d else None,
        "district_en": d.name_en if d else None,
        "district_osm_id": d.osm_id if d else None,
        "province": d.province.name if d else None,
        "province_iso": d.province.iso if d else None,
        "multi_district": p.multi_district,
        "reason_excluded": p.reason_excluded(),
        "reasons_all": p.reasons_sorted(),
        "flags": sorted(p.flags),
        "related_ids": _round_shares(related, int(pl["sharePrecision"])),
        "poi_inside": p.poi_inside,
        "opening_hours": p.raw.tags.get("opening_hours"),
        "verification_mode": cfg.verification_mode,
        "floor_level": cfg.floor_level,
        "rep_point": [round(rp.x, digits), round(rp.y, digits)],
    }
    return {"type": "Feature", "id": p.id, "properties": props,
            "geometry": _round_geom(geom_wgs, digits)}


def point_feature(n: RawNode, district: Any, digits: int) -> dict:
    props = {
        "id": n.id,
        "osm_id": n.osm_id,
        "osm_type": "node",
        "name": n.tags.get("name:th") or n.tags.get("name"),
        "tags": dict(sorted(n.tags.items())),
        "district": district.name if district else None,
        "district_osm_id": district.osm_id if district else None,
        "province": district.province.name if district else None,
        "province_iso": district.province.iso if district else None,
        "reason_excluded": "point_only",
    }
    return {"type": "Feature", "id": n.id, "properties": props,
            "geometry": _round_geom(n.geom, digits)}


def committed_meta(meta: dict[str, Any]) -> dict[str, Any]:
    """coverage_meta.config lists only the coverageFilter keys the pipeline
    reads (config.REQUIRED_FILTER_KEYS, P1-X08). dungeons.json#coverageFilter
    also holds keys for other readers (walk graph for tools/coverage/analysis,
    back office shape rules); recording them here would suggest the pipeline
    applied them. The other readers record what they use in their own meta."""
    cfg = meta.get("config")
    if not isinstance(cfg, dict) or not isinstance(cfg.get("coverageFilter"), dict):
        return meta
    cf = cfg["coverageFilter"]
    kept = {k: cf[k] for k in REQUIRED_FILTER_KEYS if k in cf}
    return {**meta, "config": {**cfg, "coverageFilter": kept}}


def dumps_collection(features: list[dict], meta: dict[str, Any]) -> str:
    """One feature per line, stable key order, UTF-8 (Thai kept readable)."""
    features = sorted(features, key=lambda f: f["id"])
    head = {"type": "FeatureCollection", "coverage_meta": committed_meta(meta)}
    head_txt = json.dumps(head, ensure_ascii=False, separators=(",", ":"))[:-1]
    body = ",\n".join(
        json.dumps(f, ensure_ascii=False, separators=(",", ":")) for f in features
    )
    return f'{head_txt},"features":[\n{body}\n]}}\n'


def write_text(path: Path, text: str) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = text.encode("utf-8")
    path.write_bytes(data)
    return len(data)


# Applied in order to the committed excluded.geojson only, and only until the
# file fits maxCommittedFileBytes (CI guard). The full schema is always written
# to the ignored excludedFull output. Tier names are recorded in coverage_meta.
# Lossless tiers come before the geometry tiers (P1-X08, GAP-04): on the
# 2026-09-01 data the run stops after drop_derived_properties with every
# polygon kept and about 22% headroom under the guard.
COMPACTION_TIERS = (
    "trim_tags",
    "omit_empty_values",
    "drop_derived_properties",
    "point_geometry_area_only",
    "point_geometry_all",
)
# omit_empty_values: these keys are left out when their value is [] or {}.
# A missing key means "empty" (no flag, no POI inside, no related id).
EMPTY_OMITTABLE = ("flags", "poi_inside", "related_ids")
# drop_derived_properties: every key here can be rebuilt from what stays in
# the feature or in coverage_meta (the list is written to coverage_meta):
#   district, district_en, province   <- district_osm_id / province_iso
#   verification_mode, floor_level    <- coverage_meta.config.verification
#   osm_type, osm_id                  <- id ("osm-w123" = way 123)
#   name, name_en, opening_hours      <- tags name:th|name, name:en, opening_hours
#                                        (all kept by trim_tags)
#   class                             <- classes_all[0]
#   multi_district                    <- "multi_district" in flags
#   size_band                         <- area_m2 + coverageFilter.sizeBandUpper_m2
#                                        (exact except within areaPrecision of a band edge)
DERIVED_PROPERTIES = (
    "district", "district_en", "province", "verification_mode", "floor_level",
    "osm_type", "osm_id", "name", "name_en", "opening_hours", "class",
    "multi_district", "size_band",
)
AREA_ONLY = frozenset({"area_too_small", "area_too_large"})


def compact_feature(feature: dict, tiers: list[str]) -> dict:
    props = dict(feature["properties"])
    geometry = feature["geometry"]
    if "omit_empty_values" in tiers:
        for key in EMPTY_OMITTABLE:
            if key in props and props[key] in ([], {}):
                del props[key]
    if "drop_derived_properties" in tiers:
        for key in DERIVED_PROPERTIES:
            props.pop(key, None)
    to_point = "point_geometry_all" in tiers or (
        "point_geometry_area_only" in tiers and set(props["reasons_all"]) <= AREA_ONLY
    )
    if to_point:
        geometry = {"type": "Point", "coordinates": props["rep_point"]}
    return {"type": "Feature", "id": feature["id"], "properties": props, "geometry": geometry}
