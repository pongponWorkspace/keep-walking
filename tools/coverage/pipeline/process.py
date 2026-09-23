"""Pipeline steps after reading: normalize, area, blocklist, overlap, assign.

Every exclusion reason that applies is kept in reasons_all; reason_excluded
is the first one in REASON_PRIORITY (METHOD 5.2, 9.4).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import shapely
from shapely.geometry import Polygon
from shapely.geometry.base import BaseGeometry

from .boundaries import StudyArea
from .config import Config
from .geom import Projector, area_reason, parts_connected, repair, size_band
from .osm_read import RawArea, RawData, RawNode

# Reason codes in priority order (codes, not tunable values). METHOD 9.4.
REASON_PRIORITY = (
    "religious_self",
    "religious_inside_heritage",
    "religious_name",
    "blocked_religious",
    "blocked_military",
    "blocked_diplomatic",
    "blocked_health",
    "blocked_education",
    "blocked_government",
    "blocked_cemetery",
    "access_private",
    "private_garden",
    "indoor",
    "indoor_market",
    "crosses_major_way",
    "invalid_geometry",
    "multipart_disjoint",
    "area_too_small",
    "area_too_large",
    "duplicate_of",
    "nested_in",
)
AREA_REASONS = frozenset({"area_too_small", "area_too_large"})
HERITAGE_CLASSES = frozenset({"historic", "attraction"})

# Which step produces which reason, for the per-step counts in run meta.
STEP_REASONS = {
    "normalize": {"invalid_geometry", "multipart_disjoint"},
    "area": set(AREA_REASONS),
    "blocklist": set(REASON_PRIORITY[:15]),
    "overlap": {"duplicate_of", "nested_in"},
}


def _rank(reason: str) -> int:
    if reason.startswith("blocked_") and reason not in REASON_PRIORITY:
        return REASON_PRIORITY.index("blocked_cemetery")
    return REASON_PRIORITY.index(reason)


@dataclass
class Piece:
    raw: RawArea
    geom_proj: BaseGeometry
    area_m2: float = 0.0
    reasons: set[str] = field(default_factory=set)
    flags: set[str] = field(default_factory=set)
    related: dict[str, Any] = field(default_factory=dict)
    district: Any = None
    multi_district: bool = False
    poi_inside: list[dict[str, Any]] = field(default_factory=list)

    @property
    def id(self) -> str:
        return self.raw.id

    @property
    def primary_class(self) -> str:
        return self.raw.classes[0]

    def reason_excluded(self) -> str | None:
        return min(self.reasons, key=_rank) if self.reasons else None

    def reasons_sorted(self) -> list[str]:
        return sorted(self.reasons, key=_rank)


@dataclass
class Blocker:
    id: str
    cats: list[str]
    geom_proj: BaseGeometry  # polygon (areas) or buffered circle (nodes)
    point_proj: BaseGeometry | None  # original point for nodes


def extract(data: RawData, study: StudyArea, proj: Projector, cf: dict[str, Any]):
    """Step 3: keep candidates whose representative point is inside the study
    area, blockers touching it, and POI nodes inside it."""
    union = study.union
    pieces: list[Piece] = []
    blockers: list[Blocker] = []
    for a in data.areas:
        if a.classes and union.contains(a.geom.representative_point()):
            pieces.append(Piece(a, proj.to_proj(a.geom)))
        if a.block_cats and union.intersects(a.geom):
            blockers.append(Blocker(a.id, a.block_cats, proj.to_proj(a.geom), None))
    radius = float(cf["pointBlockerRadius_m"])
    pois: list[RawNode] = []
    for n in data.nodes:
        if not union.intersects(n.geom):
            continue
        if n.block_cats:
            pt = proj.to_proj(n.geom)
            blockers.append(Blocker(n.id, n.block_cats, pt.buffer(radius), pt))
        if n.is_poi and "religious" not in n.block_cats:
            pois.append(n)
    minx, miny, maxx, maxy = union.bounds
    box = shapely.box(minx, miny, maxx, maxy)
    ways = [(w, proj.to_proj(w.geom)) for w in data.major_ways if box.intersects(w.geom)]
    pieces.sort(key=lambda p: p.id)
    blockers.sort(key=lambda b: b.id)
    return pieces, blockers, pois, ways


def normalize(pieces: list[Piece], cf: dict[str, Any]) -> dict[str, int]:
    """Step 4: repair invalid geometry, reject disjoint multipolygons."""
    max_change = float(cf["repairMaxAreaChangeShare"])
    gap = float(cf["multipartMaxGap_m"])
    repaired = 0
    for p in pieces:
        if not p.geom_proj.is_valid:
            fixed, change = repair(p.geom_proj)
            repaired += 1
            p.related["repair_area_change_share"] = change
            if change > max_change or fixed.is_empty:
                p.reasons.add("invalid_geometry")
            if not fixed.is_empty:
                p.geom_proj = fixed
        if not parts_connected(p.geom_proj, gap):
            p.reasons.add("multipart_disjoint")
            p.flags.add("multipart_disjoint")
    return {"repaired": repaired}


def compute_area(pieces: list[Piece], cfg: Config) -> None:
    """Step 5: projected area after holes; inclusive range from dungeons.json."""
    upper = cfg.cf["sizeBandUpper_m2"]
    for p in pieces:
        p.area_m2 = float(p.geom_proj.area)
        p.related["size_band"] = size_band(p.area_m2, upper)
        reason = area_reason(p.area_m2, cfg.min_area_m2, cfg.max_area_m2)
        if reason:
            p.reasons.add(reason)


def _share(piece: Piece, geoms: list[BaseGeometry]) -> float:
    if piece.area_m2 <= 0:
        return 0.0
    inter = piece.geom_proj.intersection(shapely.union_all(geoms)).area
    return inter / piece.area_m2


def outer_shell(geom: BaseGeometry) -> BaseGeometry:
    """The geometry with every hole filled (outer rings only)."""
    polys = getattr(geom, "geoms", [geom])
    shells = [Polygon(g.exterior) for g in polys if isinstance(g, Polygon) and not g.is_empty]
    if not shells:
        return Polygon()
    return shells[0] if len(shells) == 1 else shapely.union_all(shells)


def _religious_inside_shell(p: Piece, blockers: list[Blocker], tree: Any) -> str | None:
    """Lowest id of a religious blocker inside the outer ring of the piece
    (node inside or on the shell, or area overlap > 0), else None."""
    shell = outer_shell(p.geom_proj)
    if shell.is_empty:
        return None
    for idx in sorted(int(i) for i in tree.query(shell, predicate="intersects")):
        b = blockers[idx]
        if b.id == p.id or "religious" not in b.cats:
            continue
        if b.point_proj is not None:
            if shell.intersects(b.point_proj):
                return b.id
        elif shell.intersection(b.geom_proj).area > 0:
            return b.id
    return None


def blocklist(
    pieces: list[Piece], blockers: list[Blocker], ways: list[Any], cfg: Config,
    patterns: dict[str, Any],
) -> None:
    """Step 6: access/indoor rules, religious rules R1-R4, share rule 7.2,
    review flags, crosses_major_way."""
    from .tags import access_reasons, matching_specs, name_matches

    cf = cfg.cf
    max_share = cf["maxBlockedShare"]
    tree = shapely.STRtree([b.geom_proj for b in blockers]) if blockers else None
    way_tree = shapely.STRtree([g for _, g in ways]) if ways else None
    review_ids = set(cf["reviewOsmIds"])
    min_inside = float(cf["majorWayMinInsideLength_m"])

    for p in pieces:
        tags, cls = p.raw.tags, p.primary_class
        p.reasons.update(access_reasons(tags, p.raw.classes, cf))

        # R1 and self-tagged blockers of other categories (share = 1).
        for cat in p.raw.block_cats:
            p.reasons.add("religious_self" if cat == "religious" else f"blocked_{cat}")

        hits: dict[str, list[Blocker]] = {}
        if tree is not None:
            for idx in tree.query(p.geom_proj, predicate="intersects"):
                b = blockers[int(idx)]
                if b.id == p.id:
                    continue
                for cat in b.cats:
                    hits.setdefault(cat, []).append(b)

        # R2: heritage/attraction with any religious feature inside the outer
        # ring. Holes count as inside (D-006 precaution, P1-X08 GEO-02): a
        # temple drawn as the inner ring of an attraction still excludes it.
        if cls in HERITAGE_CLASSES and tree is not None:
            hit = _religious_inside_shell(p, blockers, tree)
            if hit is not None:
                p.reasons.add("religious_inside_heritage")
                p.related["religious_inside_heritage"] = hit

        # R3: religious name.
        if name_matches(tags, patterns["religious"], anchored=True):
            if cls in HERITAGE_CLASSES:
                p.reasons.add("religious_name")
            else:
                p.flags.add("review_required")
                p.related.setdefault("review_reasons", []).append("religious_name")

        # R4 and 7.2: share per category.
        block_info: dict[str, Any] = {}
        for cat in sorted(hits):
            share = _share(p, [b.geom_proj for b in hits[cat]])
            ids = sorted({b.id for b in hits[cat]})
            block_info[cat] = {"ids": ids, "share": share}
            if share > float(max_share[cat]):
                p.reasons.add(f"blocked_{cat}")
            elif cat == "religious" and share > 0:
                p.flags.add("contains_religious_feature")
                p.related["religious_blockers"] = ids
        if block_info:
            p.related["blockers"] = block_info

        # Review flags (SF-9): never excluded automatically.
        review = []
        if matching_specs(tags, cf["reviewTags"]):
            review.append("review_tag")
        if name_matches(tags, patterns["review"], anchored=False):
            review.append("review_name")
        if matching_specs(tags, cf["reviewMinAreaTags"]) and p.area_m2 >= cfg.min_area_m2:
            review.append("monument_area")
        if p.id in review_ids:
            review.append("review_osm_id")
        if review:
            p.flags.add("review_required")
            p.related.setdefault("review_reasons", []).extend(review)

        # crosses_major_way (D-028: flag by default, switchable).
        if way_tree is not None and cf["majorWayAction"] != "off":
            crossing = []
            for idx in way_tree.query(p.geom_proj, predicate="intersects"):
                w, g = ways[int(idx)]
                if p.geom_proj.intersection(g).length >= min_inside:
                    crossing.append(w.id)
            if crossing:
                p.flags.add("crosses_major_way")
                p.related["major_ways"] = sorted(set(crossing))
                if cf["majorWayAction"] == "exclude":
                    p.reasons.add("crosses_major_way")


def _keeper(a: Piece, b: Piece) -> tuple[Piece, Piece]:
    """Duplicate pair: keep the one with a name and more tags, then lower osm_id."""
    def score(p: Piece) -> tuple[int, int, int]:
        return (1 if p.raw.tags.get("name") else 0, len(p.raw.tags), -p.raw.osm_id)
    return (a, b) if score(a) >= score(b) else (b, a)


def resolve_overlaps(pieces: list[Piece], cfg: Config) -> None:
    """METHOD 6.3 among pieces that pass every rule except area. Pieces that
    fail a rule never swallow other pieces. Processed large to small."""
    cf = cfg.cf
    dup_iou, nested = float(cf["duplicateIoU"]), float(cf["nestedContainmentShare"])
    partial = float(cf["partialOverlapShare"])
    elig = [p for p in pieces if p.reasons <= AREA_REASONS and p.area_m2 > 0]
    elig.sort(key=lambda p: (-p.area_m2, p.id))
    rank = {p.id: i for i, p in enumerate(elig)}
    tree = shapely.STRtree([p.geom_proj for p in elig]) if elig else None
    removed: set[str] = set()
    partial_pairs: list[tuple[Piece, Piece]] = []
    for a in elig:
        if a.id in removed or tree is None:
            continue
        for idx in sorted(int(i) for i in tree.query(a.geom_proj, predicate="intersects")):
            b = elig[idx]
            if rank[b.id] <= rank[a.id] or b.id in removed:
                continue
            inter = a.geom_proj.intersection(b.geom_proj).area
            if inter <= 0:
                continue
            iou = inter / (a.area_m2 + b.area_m2 - inter)
            contain = inter / b.area_m2
            if iou >= dup_iou:
                keep, lose = _keeper(a, b)
                lose.reasons.add("duplicate_of")
                lose.related["duplicate_of"] = keep.id
                removed.add(lose.id)
                if lose is a:
                    break
            elif contain >= nested:
                reason_a = area_reason(a.area_m2, cfg.min_area_m2, cfg.max_area_m2)
                if reason_a == "area_too_large":
                    a.flags.add("split_candidate")
                    a.related.setdefault("split_children", []).append(b.id)
                else:
                    b.reasons.add("nested_in")
                    b.related["nested_in"] = a.id
                    removed.add(b.id)
            elif contain >= partial:
                partial_pairs.append((a, b))
    # A piece inside a review-flagged split parent (for example a throne hall
    # inside a palace ground) inherits the review flag (SF-9).
    by_id = {p.id: p for p in elig}
    for a in elig:
        if "split_candidate" in a.flags and "review_required" in a.flags:
            for child_id in a.related.get("split_children", []):
                child = by_id[child_id]
                child.flags.add("review_required")
                child.related.setdefault("review_reasons", []).append("inside_review_parent")
                child.related["review_parent"] = a.id
    for a, b in partial_pairs:
        if a.reasons or b.reasons:
            continue
        for x, y in ((a, b), (b, a)):
            x.flags.add("overlaps_candidate")
            x.related.setdefault("overlaps", []).append(y.id)


def assign_districts(pieces: list[Piece], study: StudyArea, cf: dict[str, Any]) -> int:
    """Step 7: district with the largest overlap; multi_district when the
    runner-up overlap share exceeds partialOverlapShare."""
    partial = float(cf["partialOverlapShare"])
    tree = shapely.STRtree([d.geom_proj for d in study.districts])
    unassigned = 0
    for p in pieces:
        overlaps = []
        for idx in tree.query(p.geom_proj, predicate="intersects"):
            d = study.districts[int(idx)]
            inter = p.geom_proj.intersection(d.geom_proj).area
            if inter > 0:
                overlaps.append((inter, -d.osm_id, d))
        if not overlaps:
            unassigned += 1
            continue
        overlaps.sort(key=lambda t: (t[0], t[1]), reverse=True)
        p.district = overlaps[0][2]
        if len(overlaps) > 1 and p.area_m2 > 0 and overlaps[1][0] / p.area_m2 > partial:
            p.multi_district = True
            p.flags.add("multi_district")
            p.related["districts"] = [
                d.osm_id for inter, _, d in overlaps if inter / p.area_m2 > partial
            ]
    return unassigned


def attach_pois(
    pieces: list[Piece], pois: list[RawNode], proj: Projector, poi_specs: list[str]
) -> list[RawNode]:
    """POI nodes inside a piece go to poi_inside; nodes inside no final
    candidate are returned as unmatched (METHOD 6.4)."""
    if not pieces:
        return list(pois)
    tree = shapely.STRtree([p.geom_proj for p in pieces])
    unmatched = []
    for n in pois:
        pt = proj.to_proj(n.geom)
        in_candidate = False
        for idx in sorted(int(i) for i in tree.query(pt, predicate="intersects")):
            p = pieces[idx]
            p.poi_inside.append({
                "id": n.id, "osm_id": n.osm_id,
                "tag": _poi_tag(n.tags, poi_specs), "name": n.tags.get("name:th") or n.tags.get("name"),
            })
            in_candidate = in_candidate or not p.reasons
        if not in_candidate:
            unmatched.append(n)
    for p in pieces:
        p.poi_inside.sort(key=lambda d: d["id"])
    return unmatched


def _poi_tag(tags: dict[str, str], poi_specs: list[str]) -> str:
    from .tags import matching_specs, parse_spec

    hits = matching_specs(tags, poi_specs)
    if not hits:
        return ""
    key = parse_spec(hits[0])[0]
    return f"{key}={tags[key]}"
