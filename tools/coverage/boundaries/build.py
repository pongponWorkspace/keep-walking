"""Build the two GeoJSON documents (pure functions, no file access).

Simplification runs in the projected CRS (metres); rounding to the output
precision happens last, then geometry is re-checked for validity and
RFC 7946 winding (exterior counter-clockwise, holes clockwise).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import shapely
from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.geometry.base import BaseGeometry
from shapely.geometry.polygon import orient
from shapely.ops import polylabel, unary_union

from pipeline.geom import Projector

from .osm import ProvinceArea


class BuildError(Exception):
    pass


def _polygons(geom: BaseGeometry) -> list[Polygon]:
    if isinstance(geom, Polygon):
        return [] if geom.is_empty else [geom]
    if isinstance(geom, MultiPolygon):
        return list(geom.geoms)
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon) and not g.is_empty]


def _lines(geom: BaseGeometry) -> list[LineString]:
    if isinstance(geom, LineString):
        return [] if geom.is_empty else [geom]
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, LineString) and not g.is_empty]


def _round_xy(coords: Any, digits: int) -> list[list[float]]:
    """Round and drop consecutive duplicates created by rounding."""
    out: list[list[float]] = []
    for x, y in coords:
        pt = [round(float(x), digits), round(float(y), digits)]
        if not out or out[-1] != pt:
            out.append(pt)
    return out


def playable_ids(study_area: dict[str, Any]) -> dict[int, str]:
    """{osmRelationId: iso} from tools/coverage/params.json#pipeline.studyArea."""
    return {int(p["osmRelationId"]): p["iso"] for p in study_area["provinces"]}


def check_playable(provinces: list[ProvinceArea], playable: dict[int, str]) -> None:
    by_id = {p.osm_id: p for p in provinces}
    problems = []
    for rid, iso in sorted(playable.items()):
        p = by_id.get(rid)
        if p is None:
            problems.append(f"{iso} (relation {rid}) not found")
        elif p.iso != iso:
            problems.append(f"relation {rid}: params says {iso}, OSM says {p.iso}")
    if problems:
        raise BuildError("playable provinces: " + "; ".join(problems))


@dataclass
class BorderLine:
    coords: list[list[float]]  # WGS84, rounded
    playable: bool  # touches a playable province (fine simplification)
    edge: bool  # separates the play area from the rest (forms the mask hole)


def border_lines(
    provinces: list[ProvinceArea], playable: dict[int, str], proj: Projector, bp: dict[str, Any]
) -> list[BorderLine]:
    """Every province boundary once. Boundaries are noded by a union and
    merged at degree-2 nodes, so each line lies between the same two
    provinces (or a province and the outside) and ends at junctions, which
    simplification keeps fixed. Lines touching a playable province use the
    fine settings, so the border drawn at the play-area edge and the mask
    hole share the same coordinates."""
    proj_geoms = {p.osm_id: proj.to_proj(p.geom) for p in provinces}
    play_union = unary_union([g for rid, g in proj_geoms.items() if rid in playable])
    play_bounds = unary_union([g.boundary for rid, g in proj_geoms.items() if rid in playable])
    edge_ring = play_union.boundary
    shapely.prepare(play_bounds)
    shapely.prepare(edge_ring)
    snap = float(bp["classifyTolerance_m"])
    merged = shapely.line_merge(unary_union([g.boundary for g in proj_geoms.values()]))
    out: list[BorderLine] = []
    for ln in _lines(merged):
        mid = ln.interpolate(0.5, normalized=True)
        is_play = play_bounds.distance(mid) <= snap
        is_edge = is_play and edge_ring.distance(mid) <= snap
        tol = bp["playableSimplify_m"] if is_play else bp["simplify_m"]
        digits = bp["playableCoordinatePrecision"] if is_play else bp["coordinatePrecision"]
        simple = ln.simplify(float(tol), preserve_topology=False)
        coords = _round_xy(proj.to_wgs(simple).coords, int(digits))
        if len(coords) >= 2:
            out.append(BorderLine(coords, is_play, is_edge))
    if not out:
        raise BuildError("no border lines")
    out.sort(key=lambda b: (b.coords[0][0], b.coords[0][1], b.coords[-1][0], b.coords[-1][1]))
    return out


def build_borders(lines: list[BorderLine]) -> dict[str, Any]:
    """One MultiLineString feature (kind: border), map-style 6.3."""
    geometry = {"type": "MultiLineString", "coordinates": [b.coords for b in lines]}
    return {"type": "Feature", "properties": {"kind": "border"}, "geometry": geometry}


def build_mask(
    lines: list[BorderLine], provinces: list[ProvinceArea], playable: dict[int, str],
    mp: dict[str, Any],
) -> dict[str, Any]:
    """One Polygon feature: the world ring with one hole per face formed by the
    play-area edge lines. No properties (tech note 15.1). Faces are kept only
    when they lie in the play area, so an enclave (a non-playable province
    surrounded by playable ones) stays an interior ring and stops the build."""
    digits = int(mp["coordinatePrecision"])
    edges = [LineString(b.coords) for b in lines if b.edge]
    if not edges:
        raise BuildError("no play-area edge lines")
    play = unary_union([p.geom for p in provinces if p.osm_id in playable])
    faces = [f for f in _polygons(shapely.polygonize(edges))
             if play.intersection(f).area > 0.5 * f.area]
    if not faces:
        raise BuildError("play-area edge lines do not close")
    faces = _polygons(unary_union(faces))
    enclaves = sum(len(f.interiors) for f in faces)
    if enclaves:
        # A hole inside the play area would need a MultiPolygon mask; the
        # contract is a single Polygon, so stop instead of silently changing it.
        raise BuildError(f"play area has {enclaves} interior ring(s)")
    holes = [_round_xy(f.exterior.coords, digits) for f in faces]
    holes.sort(key=lambda r: (r[0][0], r[0][1]))
    mask = orient(Polygon(mp["outerRing"], holes), sign=1.0)
    if not mask.is_valid:
        raise BuildError(f"mask polygon invalid: {shapely.is_valid_reason(mask)}")
    rings = [_round_xy(mask.exterior.coords, digits)]
    rings += [_round_xy(r.coords, digits) for r in mask.interiors]
    return {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": rings}}


def label_point(geom: BaseGeometry, proj: Projector, tolerance_m: float) -> Point:
    """Pole of inaccessibility of the largest part (WGS84). Always inside it."""
    largest = max(_polygons(proj.to_proj(geom)), key=lambda g: g.area)
    return proj.to_wgs(polylabel(largest, tolerance=tolerance_m))


def _iso_key(iso: str) -> tuple[str, int]:
    head, _, num = iso.rpartition("-")
    return (head, int(num)) if num.isdigit() else (iso, 0)


def build_labels(
    provinces: list[ProvinceArea], playable: dict[int, str], proj: Projector, lp: dict[str, Any]
) -> list[dict[str, Any]]:
    digits = int(lp["coordinatePrecision"])
    tol = float(lp["polylabelTolerance_m"])
    feats = []
    for p in sorted(provinces, key=lambda q: _iso_key(q.iso)):
        pt = label_point(p.geom, proj, tol)
        feats.append({
            "type": "Feature",
            "properties": {
                "kind": "label",
                "name": p.name,
                "playable": p.osm_id in playable,
                "iso": p.iso,
            },
            "geometry": {"type": "Point", "coordinates": _round_xy([pt.coords[0]], digits)[0]},
        })
    return feats


def feature_collection(
    features: list[dict[str, Any]], attribution: str, source: dict[str, Any]
) -> dict[str, Any]:
    """RFC 7946 FeatureCollection. `attribution` and `source` are foreign
    members (ignored by MapLibre) that keep licence and data date with the file."""
    return {
        "type": "FeatureCollection",
        "attribution": attribution,
        "source": source,
        "features": features,
    }
