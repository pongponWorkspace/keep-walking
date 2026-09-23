"""Hand-drawn synthetic OSM fixture (no data copied from OSM).

Shapes are drawn in UTM 47N metres around Bangkok and converted to WGS84, so
areas are known exactly up to the 1e-7 degree precision of OSM coordinates
(about 1 m2 on a 3,000 m2 square). Each case sits in its own grid cell.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from xml.sax.saxutils import quoteattr

from pyproj import Transformer
from shapely.geometry import Polygon

ORIGIN_X, ORIGIN_Y = 662000.0, 1520000.0  # UTM 47N near Bangkok
CELL = 700.0
COLS, ROWS = 8, 5
TO_WGS = Transformer.from_crs("EPSG:32647", "EPSG:4326", always_xy=True)
TO_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32647", always_xy=True)
# Exact-boundary fixtures (GAP-01): the area the pipeline measures, after the
# 1e-7 degree rounding of the OSM file, lands within this many m2 of the
# target and on the stated side of it.
BOUNDARY_TOL_M2 = 0.05


@dataclass
class Builder:
    nodes: list[tuple[int, float, float, dict]] = field(default_factory=list)
    ways: list[tuple[int, list[int], dict]] = field(default_factory=list)
    rels: list[tuple[int, list[tuple[str, int, str]], dict]] = field(default_factory=list)
    nid: int = 1000
    wid: int = 1000
    rid: int = 900000

    def node(self, x: float, y: float, tags: dict | None = None) -> int:
        self.nid += 1
        lon, lat = TO_WGS.transform(ORIGIN_X + x, ORIGIN_Y + y)
        self.nodes.append((self.nid, lon, lat, tags or {}))
        return self.nid

    def way(self, coords: list[tuple[float, float]], tags: dict | None = None,
            closed: bool = True) -> int:
        ids = [self.node(x, y) for x, y in coords]
        if closed:
            ids.append(ids[0])
        self.wid += 1
        self.ways.append((self.wid, ids, tags or {}))
        return self.wid

    def rel(self, members: list[tuple[str, int, str]], tags: dict) -> int:
        self.rid += 1
        self.rels.append((self.rid, members, tags))
        return self.rid

    def to_xml(self) -> str:
        out = ["<?xml version='1.0' encoding='UTF-8'?>",
               "<osm version='0.6' generator='keep-walking-fixture'>"]
        for i, lon, lat, tags in self.nodes:
            out.append(f"<node id='{i}' version='1' lat='{lat:.7f}' lon='{lon:.7f}'"
                       + (">" + _tags(tags) + "</node>" if tags else "/>"))
        for i, refs, tags in self.ways:
            nd = "".join(f"<nd ref='{r}'/>" for r in refs)
            out.append(f"<way id='{i}' version='1'>{nd}{_tags(tags)}</way>")
        for i, members, tags in self.rels:
            mem = "".join(f"<member type='{t}' ref='{r}' role='{role}'/>"
                          for t, r, role in members)
            out.append(f"<relation id='{i}' version='1'>{mem}{_tags(tags)}</relation>")
        out.append("</osm>")
        return "\n".join(out) + "\n"


def _tags(tags: dict) -> str:
    return "".join(f"<tag k={quoteattr(k)} v={quoteattr(str(v))}/>"
                   for k, v in sorted(tags.items()))


def rect(cx: float, cy: float, w: float, h: float) -> list[tuple[float, float]]:
    return [(cx - w / 2, cy - h / 2), (cx + w / 2, cy - h / 2),
            (cx + w / 2, cy + h / 2), (cx - w / 2, cy + h / 2)]


def square(cx: float, cy: float, area: float) -> list[tuple[float, float]]:
    side = area ** 0.5
    return rect(cx, cy, side, side)


def stored_area(coords: list[tuple[float, float]]) -> float:
    """Area in UTM 47N of a ring after the 7-decimal rounding of to_xml()."""
    pts = []
    for x, y in coords:
        lon, lat = TO_WGS.transform(ORIGIN_X + x, ORIGIN_Y + y)
        pts.append(TO_UTM.transform(round(lon, 7), round(lat, 7)))
    return Polygon(pts).area


def tuned_square(cx: float, cy: float, lo: float, hi: float) -> list[tuple[float, float]]:
    """Square whose stored area is in [lo, hi] (a few hundredths of a m2 wide).

    Rounding to 1e-7 degree moves each corner by up to about 1 cm, which shifts
    the area of a 387 m square by several m2. So: pick a side whose stored area
    is 1-3 m2 short, then raise a thin 4 m wide bump on the top edge until the
    stored area falls in the window (one latitude step of the bump apex is
    about 0.02 m2).
    """
    target = (lo + hi) / 2

    def ring(side: float, bump: float) -> list[tuple[float, float]]:
        h = side / 2
        return [(cx - h, cy - h), (cx + h, cy - h), (cx + h, cy + h), (cx + 2, cy + h),
                (cx, cy + h + bump), (cx - 2, cy + h), (cx - h, cy + h)]

    side = (target - 2.0) ** 0.5
    for _ in range(20000):
        a0 = stored_area(ring(side, 0.0))
        if target - 3.0 <= a0 <= target - 1.0:
            break
        side += 0.0005 if a0 < target - 3.0 else -0.0005
    else:
        raise RuntimeError(f"no base side for {target}")
    for i in range(20000):
        coords = ring(side, i * 0.001)
        if lo <= stored_area(coords) <= hi:
            return coords
    raise RuntimeError(f"no bump height for [{lo}, {hi}]")


def cell(col: int, row: int) -> tuple[float, float]:
    """Centre of a grid cell."""
    return (col + 0.5) * CELL, (row + 0.5) * CELL


POW = {"amenity": "place_of_worship", "religion": "buddhist"}
DISTRICT_SPLIT_X = 4 * CELL


def build_fixture() -> tuple[str, dict[str, dict], int]:
    """Return (osm xml, expected results by case name, province relation id)."""
    b = Builder()
    exp: dict[str, dict] = {}

    def case(name, ref, reason=None, flags=(), area=None):
        exp[name] = {"id": ref, "reason": reason, "flags": set(flags), "area": area}

    def park(cx, cy, coords_or_area, extra=None):
        coords = coords_or_area if isinstance(coords_or_area, list) else square(cx, cy, coords_or_area)
        return "osm-w%d" % b.way(coords, {"leisure": "park", **(extra or {})})

    # Boundaries: one province, two districts split at x = DISTRICT_SPLIT_X.
    w_prov = b.way(rect(COLS * CELL / 2, ROWS * CELL / 2, COLS * CELL, ROWS * CELL))
    prov = b.rel([("w", w_prov, "outer")], {"type": "boundary", "boundary": "administrative",
                                            "admin_level": "4", "name": "จังหวัดทดสอบ",
                                            "name:en": "Test Province"})
    for i, (x0, name) in enumerate(((0.0, "เขตตะวันตก"), (DISTRICT_SPLIT_X, "เขตตะวันออก"))):
        w = b.way(rect(x0 + DISTRICT_SPLIT_X / 2, ROWS * CELL / 2, DISTRICT_SPLIT_X, ROWS * CELL))
        b.rel([("w", w, "outer")], {"type": "boundary", "boundary": "administrative",
                                    "admin_level": "6", "name": name, "name:en": f"D{i}"})

    # Area limits at the exact QA values 2,999 / 3,000 / 150,000 / 150,001 m2
    # (GAP-01). Stored areas are tuned to within BOUNDARY_TOL_M2 and on the
    # right side of the limit; test_gaps.py also runs with the limits set to
    # the measured areas themselves to prove area == limit is inclusive.
    t = BOUNDARY_TOL_M2
    case("park_too_small", park(0, 0, tuned_square(*cell(0, 0), 2999 - t, 2999 + t)),
         "area_too_small", area=2999)
    case("park_at_min", park(0, 0, tuned_square(*cell(1, 0), 3000 + 1e-4, 3000 + t)),
         None, area=3000)
    case("park_at_max", park(0, 0, tuned_square(*cell(2, 0), 150000 - t, 150000 - 1e-4)),
         None, area=150000)
    case("park_too_large", park(0, 0, tuned_square(*cell(3, 0), 150001 - t, 150001 + t)),
         "area_too_large", area=150001)

    # METHOD 7.4 table.
    cx, cy = cell(5, 0)
    case("park_small_shrine_polygon", park(cx, cy, 40000.0), None, ["contains_religious_feature"])
    b.way(square(cx, cy, 60.0), POW)
    cx, cy = cell(6, 0)
    case("park_sala_400", park(cx, cy, 8000.0), "blocked_religious")
    b.way(square(cx, cy, 400.0), {"building": "religious"})
    cx, cy = cell(7, 0)
    case("park_20k_pow_node", park(cx, cy, 20000.0), None, ["contains_religious_feature"])
    b.node(cx, cy, POW)
    cx, cy = cell(0, 1)
    case("park_4k_pow_node", park(cx, cy, 4000.0), "blocked_religious")
    b.node(cx, cy, POW)
    cx, cy = cell(1, 1)
    case("attraction_pow_node", "osm-w%d" % b.way(square(cx, cy, 30000.0),
         {"tourism": "attraction", "name": "จุดชมวิว"}), "religious_inside_heritage")
    b.node(cx + 30, cy, POW)
    cx, cy = cell(2, 1)
    case("historic_wat_name", "osm-w%d" % b.way(square(cx, cy, 5000.0),
         {"historic": "ruins", "name": "วัดร้างริมคลอง"}), "religious_name")
    cx, cy = cell(3, 1)
    b.way(square(cx, cy, 20000.0), {"landuse": "religious"})
    case("market_in_temple", "osm-w%d" % b.way(square(cx, cy, 5000.0),
         {"amenity": "marketplace"}), "blocked_religious")
    cx, cy = cell(5, 1)
    b.way(square(cx, cy, 20000.0), {"amenity": "school"})
    case("pitch_in_school", "osm-w%d" % b.way(square(cx, cy, 4000.0),
         {"leisure": "pitch"}), "blocked_education")
    cx, cy = cell(6, 1)
    case("park_hospital_fence", park(cx, cy, rect(cx, cy, 200, 100)), None)
    b.way([(cx + 96, cy - 50), (cx + 196, cy - 50), (cx + 196, cy + 50), (cx + 96, cy + 50)],
          {"amenity": "hospital"})

    # Multipolygon with an inner ring: 100x100 outer minus 50x50 hole = 7,500 m2.
    cx, cy = cell(7, 1)
    outer = b.way(rect(cx, cy, 100, 100))
    inner = b.way(rect(cx, cy, 50, 50))
    case("mp_with_hole", "osm-r%d" % b.rel([("w", outer, "outer"), ("w", inner, "inner")],
         {"type": "multipolygon", "leisure": "park", "name": "สวนมีสระ"}), None, area=7500)

    # Way and relation drawn twice: the named relation is kept.
    cx, cy = cell(0, 2)
    case("dup_way", park(cx, cy, rect(cx, cy, 60, 100)), "duplicate_of")
    w = b.way(rect(cx, cy, 60, 100))
    case("dup_relation", "osm-r%d" % b.rel([("w", w, "outer")],
         {"type": "multipolygon", "leisure": "park", "name": "สวนซ้ำ"}), None)

    # Pitch inside a park: nested, counted once.
    cx, cy = cell(1, 2)
    case("nested_parent", park(cx, cy, 20000.0), None)
    case("nested_pitch", "osm-w%d" % b.way(square(cx, cy, 3500.0), {"leisure": "pitch"}),
         "nested_in")

    # Park larger than maxArea with a garden inside in range.
    cx, cy = cell(2, 2)
    case("split_parent", park(cx, cy, 200000.0), "area_too_large", ["split_candidate"])
    case("split_child", "osm-w%d" % b.way(square(cx + 100, cy, 5000.0),
         {"leisure": "garden"}), None)

    cx, cy = cell(3, 2)
    case("garden_private", "osm-w%d" % b.way(square(cx, cy, 5000.0),
         {"leisure": "garden", "access": "private"}), "access_private")
    cx, cy = cell(5, 2)
    case("market_indoor", "osm-w%d" % b.way(square(cx, cy, 5000.0),
         {"amenity": "marketplace", "building": "yes"}), "indoor_market")
    cx, cy = cell(6, 2)
    case("garden_residential", "osm-w%d" % b.way(square(cx, cy, 5000.0),
         {"leisure": "garden", "garden:type": "residential"}), "private_garden")

    # Major road across a park (flag), bridge across another (no flag).
    cx, cy = cell(7, 2)
    case("park_crossed_by_primary", park(cx, cy, rect(cx, cy, 200, 100)), None,
         ["crosses_major_way"])
    b.way([(cx, cy - 150), (cx, cy + 150)], {"highway": "primary"}, closed=False)
    cx, cy = cell(0, 3)
    case("park_under_bridge", park(cx, cy, rect(cx, cy, 200, 100)), None)
    b.way([(cx, cy - 150), (cx, cy + 150)], {"highway": "primary", "bridge": "yes"},
          closed=False)

    # Two parks overlapping 10 percent: both kept and flagged.
    cx, cy = cell(1, 3)
    case("overlap_a", park(cx, cy, rect(cx - 45, cy, 100, 100)), None, ["overlaps_candidate"])
    case("overlap_b", park(cx, cy, rect(cx + 45, cy, 100, 100)), None, ["overlaps_candidate"])

    # Review flags: palace (SF-9) and a park whose name starts with "วัด".
    cx, cy = cell(2, 3)
    case("palace", "osm-w%d" % b.way(square(cx, cy, 10000.0), {"historic": "palace"}),
         None, ["review_required"])
    cx, cy = cell(3, 3)
    case("park_wat_name", park(cx, cy, 5000.0, {"name": "วัดทองสวนสาธารณะ"}), None,
         ["review_required"])

    # Royal ground larger than maxArea: a throne hall inside inherits the review flag.
    cx, cy = cell(4, 1)
    case("palace_ground_large", "osm-w%d" % b.way(square(cx, cy, 200000.0),
         {"historic": "palace", "name": "พระราชวังทดสอบ"}), "area_too_large",
         ["split_candidate", "review_required"])
    case("throne_hall_inside", "osm-w%d" % b.way(square(cx, cy, 5000.0),
         {"historic": "building", "name": "อาคารทดสอบ"}), None, ["review_required"])

    # Park straddling the district border.
    case("park_multi_district", park(0, 0, rect(DISTRICT_SPLIT_X, 4.5 * CELL, 200, 100)),
         None, ["multi_district"])

    # Cemetery (D-026) and university (D-027) blockers.
    cx, cy = cell(5, 3)
    b.way(square(cx, cy, 20000.0), {"landuse": "cemetery"})
    case("park_in_cemetery", park(cx, cy, 10000.0), "blocked_cemetery")
    cx, cy = cell(6, 3)
    b.way(square(cx, cy, 20000.0), {"amenity": "university"})
    case("pitch_in_university", "osm-w%d" % b.way(square(cx, cy, 4000.0),
         {"leisure": "pitch"}), "blocked_education")

    # POIs: one inside a candidate, one alone, one religious (never listed).
    cx, cy = cell(7, 3)
    case("park_with_poi", park(cx, cy, 10000.0), None)
    exp["_poi_inside"] = {"id": "osm-n%d" % b.node(cx, cy, {"historic": "monument"}),
                          "parent": exp["park_with_poi"]["id"]}
    cx, cy = cell(6, 4)
    exp["_poi_alone"] = {"id": "osm-n%d" % b.node(cx, cy, {"historic": "memorial"})}
    cx, cy = cell(7, 4)
    exp["_poi_religious"] = {"id": "osm-n%d" % b.node(cx, cy, {"historic": "wayside_shrine"})}

    # Self-tagged religious park, disjoint and connected multipart relations.
    cx, cy = cell(1, 4)
    case("park_is_temple", park(cx, cy, 10000.0, POW), "religious_self")
    cx, cy = cell(3, 4)
    w1, w2 = b.way(rect(cx - 80, cy, 60, 60)), b.way(rect(cx + 80, cy, 60, 60))
    case("multipart_far", "osm-r%d" % b.rel([("w", w1, "outer"), ("w", w2, "outer")],
         {"type": "multipolygon", "leisure": "park"}), "multipart_disjoint")
    cx, cy = cell(0, 4)
    w1, w2 = b.way(rect(cx - 40, cy, 60, 60)), b.way(rect(cx + 40, cy, 60, 60))
    case("multipart_near", "osm-r%d" % b.rel([("w", w1, "outer"), ("w", w2, "outer")],
         {"type": "multipolygon", "leisure": "park"}), None, area=7200)

    # GAP-02 (GEO-02): a temple drawn as the inner ring of a park multipolygon.
    # The hole is outside the park, so the religious share is 0 and the park
    # stays a candidate, but the temple must still be found and recorded by the
    # blocklist step (a hole is not a free pass, METHOD 6.2).
    cx, cy = cell(4, 0)
    outer = b.way(rect(cx, cy, 150, 150))
    temple = b.way(rect(cx, cy, 50, 50), POW)
    case("park_temple_hole", "osm-r%d" % b.rel([("w", outer, "outer"), ("w", temple, "inner")],
         {"type": "multipolygon", "leisure": "park"}), None, area=20000)
    exp["_temple_hole_blocker"] = {"id": "osm-w%d" % temple, "parent": exp["park_temple_hole"]["id"]}
    # Same shape on a heritage class: R2 says a religious feature inside the
    # outer ring excludes the whole piece, hole or not (METHOD 6.2 + 7.3 R2).
    cx, cy = cell(4, 2)
    outer = b.way(rect(cx, cy, 150, 150))
    temple = b.way(rect(cx, cy, 50, 50), POW)
    exp["_attraction_temple_hole"] = {
        "id": "osm-r%d" % b.rel([("w", outer, "outer"), ("w", temple, "inner")],
                                {"type": "multipolygon", "tourism": "attraction"}),
        "reason": "religious_inside_heritage"}

    # GAP-02 (GEO-07): two parks that really overlap, by 2% of the smaller one,
    # which is below partialOverlapShare (0.05): no overlaps_candidate flag.
    cx, cy = cell(4, 3)
    case("touch_a", park(cx, cy, rect(cx - 49, cy, 100, 100)), None, area=10000)
    case("touch_b", park(cx, cy, rect(cx + 49, cy, 100, 100)), None, area=10000)
    exp["_touch_share"] = {"value": 0.02}

    # GAP-02 (GEO-11): areas that cannot be assembled are listed in
    # counts.extract.assembly_failed, never dropped silently.
    # osmium rejects a self-intersecting ring ("invalid area") ...
    cx, cy = cell(5, 4)
    exp["_assembly_bowtie"] = {"id": "osm-w%d" % b.way(
        [(cx - 150, cy - 50), (cx - 50, cy + 50), (cx - 50, cy - 50), (cx - 150, cy + 50)],
        {"leisure": "park"})}
    # ... and a multipolygon whose outer way is not closed.
    cx, cy = cell(2, 4)
    w_open = b.way(rect(cx, cy, 100, 100), closed=False)
    exp["_assembly_open_relation"] = {"id": "osm-r%d" % b.rel(
        [("w", w_open, "outer")], {"type": "multipolygon", "leisure": "park"})}
    # A plain way tagged leisure=park that is not closed (known gap, see test).
    cx, cy = cell(5, 4)
    exp["_unclosed_way"] = {"id": "osm-w%d" % b.way(rect(cx + 100, cy, 100, 100),
                                                    {"leisure": "park"}, closed=False)}

    # Outside the study area: must not appear in any output.
    exp["_outside"] = {"id": park(-1000.0, -1000.0, 5000.0)}
    return b.to_xml(), exp, prov
