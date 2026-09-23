"""Hand-drawn OSM fixture for the non-religious blocklist categories (BUG-F01-001).

Covers BLOCK-03 (health, hospital as a whole piece), BLOCK-04 (government),
BLOCK-05 (military) and BLOCK-06 (diplomatic) end to end, mirroring the
religious cases in fixture_osm.py. Kept separate from fixture_osm.py so the
shared baseline (and every count and byte-size test built on it) is unchanged.

Each case sits in its own grid cell. Shapes are drawn in UTM 47N metres and
converted to WGS84 by the same Builder as the main fixture.
"""

from __future__ import annotations

from .fixture_osm import Builder, rect, square

CELL = 700.0
COLS = 6
PARK_M2 = 4000.0        # every test park; above minArea_m2 (3,000)
CONTAINER_M2 = 20000.0  # blocker polygon drawn around the park (share = 1.0)

# (case name, blocker tags, expected reason). The blocker is a polygon that
# fully contains the park, so the park's blocked share is 1.0 for every row.
# One row per tag spec so a spec dropped from config/balance/dungeons.json
# (or a mapping bug in pipeline/tags.py) fails a named case.
CONTAINER_CASES: list[tuple[str, dict, str]] = [
    # BLOCK-03 health: hospital grounds cover the whole piece.
    ("park_in_amenity_hospital", {"amenity": "hospital"}, "blocked_health"),
    ("park_in_healthcare_hospital", {"healthcare": "hospital"}, "blocked_health"),
    ("park_in_building_hospital", {"building": "hospital"}, "blocked_health"),
    ("park_in_clinic_area", {"amenity": "clinic"}, "blocked_health"),
    # BLOCK-04 government.
    ("park_in_office_government", {"office": "government"}, "blocked_government"),
    ("park_in_government_any", {"government": "ministry"}, "blocked_government"),
    ("park_in_townhall", {"amenity": "townhall"}, "blocked_government"),
    ("park_in_courthouse", {"amenity": "courthouse"}, "blocked_government"),
    ("park_in_police", {"amenity": "police"}, "blocked_government"),
    ("park_in_fire_station", {"amenity": "fire_station"}, "blocked_government"),
    ("park_in_prison", {"amenity": "prison"}, "blocked_government"),
    ("park_in_landuse_government", {"landuse": "government"}, "blocked_government"),
    ("park_in_building_government", {"building": "government"}, "blocked_government"),
    # BLOCK-05 military.
    ("park_in_landuse_military", {"landuse": "military"}, "blocked_military"),
    ("park_in_military_any", {"military": "barracks"}, "blocked_military"),
    # BLOCK-06 diplomatic.
    ("park_in_office_diplomatic", {"office": "diplomatic"}, "blocked_diplomatic"),
    ("park_in_embassy", {"amenity": "embassy"}, "blocked_diplomatic"),
    ("park_in_diplomatic_any", {"diplomatic": "embassy"}, "blocked_diplomatic"),
]

# (case name, tags added to the park itself, expected reason): the piece is
# itself the blocker (share = 1), like religious_self for temples.
SELF_CASES: list[tuple[str, dict, str]] = [
    ("park_is_hospital", {"amenity": "hospital"}, "blocked_health"),
    ("park_is_townhall", {"amenity": "townhall"}, "blocked_government"),
    ("park_is_military", {"military": "danger_area"}, "blocked_military"),
    ("park_is_embassy", {"amenity": "embassy"}, "blocked_diplomatic"),
]

# (case name, node tags, expected reason). One node at the park centre is
# buffered by pointBlockerRadius_m (10 m): share = pi*100/4000 = 0.0785.
# That is above maxBlockedShare 0.02 (military, diplomatic) and below 0.1
# (health, government), so the same shape proves each category's own limit.
# amenity=clinic is area only and must not count as a node.
NODE_CASES: list[tuple[str, dict, str | None]] = [
    ("park_military_node", {"military": "checkpoint"}, "blocked_military"),
    ("park_embassy_node", {"amenity": "embassy"}, "blocked_diplomatic"),
    ("park_diplomatic_node", {"diplomatic": "consulate"}, "blocked_diplomatic"),
    ("park_police_node", {"amenity": "police"}, None),
    ("park_hospital_node", {"amenity": "hospital"}, None),
    ("park_clinic_node", {"amenity": "clinic"}, None),
]

NODE_SHARE = 3.14159 * 100.0 / PARK_M2


def _cell(i: int) -> tuple[float, float]:
    return (i % COLS + 0.5) * CELL, (i // COLS + 0.5) * CELL


def build_blocklist_fixture() -> tuple[str, dict[str, dict], int]:
    """Return (osm xml, expected by case name, province relation id)."""
    b = Builder()
    exp: dict[str, dict] = {}
    n = len(CONTAINER_CASES) + len(SELF_CASES) + len(NODE_CASES)
    rows = (n + COLS - 1) // COLS
    width, height = COLS * CELL, rows * CELL

    w_prov = b.way(rect(width / 2, height / 2, width, height))
    prov = b.rel([("w", w_prov, "outer")], {"type": "boundary", "boundary": "administrative",
                                            "admin_level": "4", "name": "จังหวัดทดสอบ",
                                            "name:en": "Test Province"})
    for i in range(2):
        w = b.way(rect(width / 4 + i * width / 2, height / 2, width / 2, height))
        b.rel([("w", w, "outer")], {"type": "boundary", "boundary": "administrative",
                                    "admin_level": "6", "name": f"เขต{i}", "name:en": f"D{i}"})

    def park(cx: float, cy: float, extra: dict | None = None) -> str:
        return "osm-w%d" % b.way(square(cx, cy, PARK_M2), {"leisure": "park", **(extra or {})})

    i = 0
    for name, tags, reason in CONTAINER_CASES:
        cx, cy = _cell(i)
        b.way(square(cx, cy, CONTAINER_M2), tags)
        exp[name] = {"id": park(cx, cy), "reason": reason, "blocker": tags}
        i += 1
    for name, tags, reason in SELF_CASES:
        cx, cy = _cell(i)
        exp[name] = {"id": park(cx, cy, tags), "reason": reason, "blocker": tags}
        i += 1
    for name, tags, reason in NODE_CASES:
        cx, cy = _cell(i)
        exp[name] = {"id": park(cx, cy), "reason": reason, "blocker": tags}
        b.node(cx, cy, tags)
        i += 1
    return b.to_xml(), exp, prov
