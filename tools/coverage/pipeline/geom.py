"""Geometry helpers. Areas and distances are computed in the projected CRS
from config (pipeline.projectedCrs, EPSG:32647 = UTM 47N)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union

WGS84 = "EPSG:4326"


@dataclass(frozen=True)
class Projector:
    crs: str
    fwd: Transformer
    inv: Transformer

    @classmethod
    def for_crs(cls, crs: str) -> "Projector":
        return cls(
            crs,
            Transformer.from_crs(WGS84, crs, always_xy=True),
            Transformer.from_crs(crs, WGS84, always_xy=True),
        )

    def to_proj(self, geom: BaseGeometry) -> BaseGeometry:
        return shapely.transform(geom, self._fwd_xy)

    def to_wgs(self, geom: BaseGeometry) -> BaseGeometry:
        return shapely.transform(geom, self._inv_xy)

    def _fwd_xy(self, coords: Any) -> Any:
        x, y = self.fwd.transform(coords[:, 0], coords[:, 1])
        return np.column_stack([x, y])

    def _inv_xy(self, coords: Any) -> Any:
        x, y = self.inv.transform(coords[:, 0], coords[:, 1])
        return np.column_stack([x, y])


def polygonal_part(geom: BaseGeometry) -> BaseGeometry:
    """Keep only polygon parts of a geometry (after make_valid)."""
    if isinstance(geom, (Polygon, MultiPolygon)):
        return geom
    parts = [g for g in getattr(geom, "geoms", []) if isinstance(g, (Polygon, MultiPolygon))]
    if not parts:
        return Polygon()
    return unary_union(parts)


def repair(geom_proj: BaseGeometry) -> tuple[BaseGeometry, float]:
    """make_valid and return (repaired geometry, relative area change)."""
    if geom_proj.is_valid:
        return geom_proj, 0.0
    fixed = polygonal_part(shapely.make_valid(geom_proj))
    # Reference = outer rings minus inner rings, computed ring by ring so it
    # does not depend on validity. Degenerate input counts as a full change.
    reference = _ring_area(geom_proj)
    if reference <= 0:
        return fixed, 1.0
    return fixed, abs(fixed.area - reference) / reference


def _ring_area(geom: BaseGeometry) -> float:
    """Outer rings minus inner rings, ignoring ring orientation and validity."""
    polys = [geom] if isinstance(geom, Polygon) else list(getattr(geom, "geoms", []))
    total = 0.0
    for p in polys:
        if not isinstance(p, Polygon) or p.is_empty:
            continue
        total += abs(Polygon(p.exterior).area)
        total -= sum(abs(Polygon(r).area) for r in p.interiors)
    return total


def parts_connected(geom_proj: BaseGeometry, max_gap_m: float) -> bool:
    """True when every outer part is within max_gap_m of the rest (one walkable piece)."""
    parts = list(getattr(geom_proj, "geoms", [geom_proj]))
    if len(parts) <= 1:
        return True
    grown = unary_union([p.buffer(max_gap_m / 2) for p in parts])
    return isinstance(grown, Polygon)


def size_band(area_m2: float, upper: dict[str, float]) -> str:
    if area_m2 <= upper["small"]:
        return "small"
    if area_m2 <= upper["medium"]:
        return "medium"
    return "large"


def area_reason(area_m2: float, min_area: float, max_area: float) -> str | None:
    """Inclusive range check on the unrounded area (METHOD 8.1)."""
    if area_m2 < min_area:
        return "area_too_small"
    if area_m2 > max_area:
        return "area_too_large"
    return None
