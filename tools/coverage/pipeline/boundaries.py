"""Study-area boundaries: provinces by relation id, districts by admin level.

The run stops when the province or district counts differ from config
(METHOD 2): OSM boundaries can be edited between runs.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import shapely
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union

from .geom import Projector
from .osm_read import RawArea


class BoundaryError(Exception):
    pass


@dataclass
class Province:
    osm_id: int
    iso: str
    name: str | None
    name_en: str | None
    geom: BaseGeometry


@dataclass
class District:
    osm_id: int
    name: str | None
    name_en: str | None
    province: Province
    geom: BaseGeometry  # WGS84
    geom_proj: BaseGeometry


@dataclass
class StudyArea:
    provinces: list[Province]
    districts: list[District]
    union: BaseGeometry  # WGS84 union of provinces

    def __post_init__(self) -> None:
        shapely.prepare(self.union)


def _thai_name(tags: dict[str, str]) -> str | None:
    return tags.get("name:th") or tags.get("name")


def build_study_area(
    areas: list[RawArea], pipeline: dict[str, Any], proj: Projector
) -> StudyArea:
    study = pipeline["studyArea"]
    by_id = {
        a.osm_id: a
        for a in areas
        if a.osm_type == "relation" and a.admin_level == study["provinceAdminLevel"]
    }
    provinces: list[Province] = []
    missing = []
    for p in study["provinces"]:
        rid = int(p["osmRelationId"])
        area = by_id.get(rid)
        if area is None:
            missing.append(f"{p['iso']} (relation {rid})")
            continue
        provinces.append(
            Province(rid, p["iso"], _thai_name(area.tags), area.tags.get("name:en"), area.geom)
        )
    if missing:
        raise BoundaryError(f"province boundaries not found: {', '.join(missing)}")

    union = unary_union([p.geom for p in provinces])
    for p in provinces:
        shapely.prepare(p.geom)

    districts: list[District] = []
    for a in areas:
        if a.osm_type != "relation" or a.admin_level != study["districtAdminLevel"]:
            continue
        rp = a.geom.representative_point()
        parent = next((p for p in provinces if p.geom.contains(rp)), None)
        if parent is None:
            continue
        districts.append(
            District(
                a.osm_id, _thai_name(a.tags), a.tags.get("name:en"), parent,
                a.geom, proj.to_proj(a.geom),
            )
        )
    districts.sort(key=lambda d: d.osm_id)

    problems = []
    for p in study["provinces"]:
        got = sorted(d.name or str(d.osm_id) for d in districts if d.province.iso == p["iso"])
        if len(got) != int(p["expectedDistricts"]):
            problems.append(
                f"{p['iso']}: expected {p['expectedDistricts']} districts, found {len(got)}: "
                + ", ".join(got)
            )
    if problems:
        raise BoundaryError("district count mismatch; " + " | ".join(problems))
    return StudyArea(provinces, districts, union)


def cross_check(
    study: StudyArea, gb_path: Path, max_diff_share: float, proj: Projector, share_digits: int
) -> dict[str, Any]:
    """Compare each district's area with the best-overlapping geoBoundaries
    ADM2 polygon. Differences above max_diff_share are warnings, not errors."""
    if not gb_path.exists():
        return {"status": "skipped", "reason": f"{gb_path.name} not present"}
    minx, miny, maxx, maxy = study.union.bounds
    with gb_path.open(encoding="utf-8") as fh:
        features = json.load(fh)["features"]
    gb = []
    for f in features:
        g = shape(f["geometry"])
        bx0, by0, bx1, by1 = g.bounds
        if bx1 < minx or bx0 > maxx or by1 < miny or by0 > maxy:
            continue
        gb.append((f["properties"].get("shapeName"), proj.to_proj(shapely.make_valid(g))))
    del features
    tree = shapely.STRtree([g for _, g in gb])
    warnings = []
    compared = 0
    for d in study.districts:
        best, best_inter = None, 0.0
        for idx in tree.query(d.geom_proj):
            inter = d.geom_proj.intersection(gb[idx][1]).area
            if inter > best_inter:
                best, best_inter = idx, inter
        if best is None:
            warnings.append({"district_osm_id": d.osm_id, "name": d.name, "issue": "no match"})
            continue
        compared += 1
        a_osm, a_gb = d.geom_proj.area, gb[best][1].area
        diff = abs(a_osm - a_gb) / a_osm
        if diff > max_diff_share:
            warnings.append({
                "district_osm_id": d.osm_id, "name": d.name, "gb_name": gb[best][0],
                "area_osm_m2": round(a_osm), "area_gb_m2": round(a_gb),
                "diff_share": round(diff, share_digits),
            })
    return {"status": "done", "compared": compared, "warnings": warnings}
