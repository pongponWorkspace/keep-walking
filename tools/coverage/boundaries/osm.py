"""Read province polygons (admin_level 4 relations) from an OSM file."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import osmium
from shapely import wkb
from shapely.geometry.base import BaseGeometry


class ProvinceReadError(Exception):
    pass


@dataclass
class ProvinceArea:
    osm_id: int
    iso: str
    name: str
    geom: BaseGeometry  # WGS84 (Multi)Polygon


def province_name(tags: dict[str, str], bp: dict[str, Any]) -> str | None:
    """First present name tag, with configured prefixes (e.g. "จังหวัด") removed."""
    name = next((tags[k] for k in bp["nameTags"] if tags.get(k)), None)
    if name is None:
        return None
    for prefix in bp["nameStripPrefixes"]:
        if name.startswith(prefix) and len(name) > len(prefix):
            name = name[len(prefix):]
    return name.strip()


def _open(path: Path) -> Any:
    if path.name.endswith(".osm.xml"):
        return osmium.io.File(str(path), "osm")
    return str(path)


def read_provinces(path: Path, bp: dict[str, Any]) -> list[ProvinceArea]:
    """One streaming pass. Keeps boundary=administrative relations at the
    configured admin level whose ISO3166-2 code has the configured prefix
    (the extract also carries neighbouring countries' provinces)."""
    level, prefix = bp["adminLevel"], bp["isoPrefix"]
    fp = (
        osmium.FileProcessor(_open(path))
        .with_locations()
        .with_areas(osmium.filter.TagFilter(("admin_level", level)))
        .with_filter(osmium.filter.TagFilter(("admin_level", level)))
    )
    fab = osmium.geom.WKBFactory()
    found: dict[int, ProvinceArea] = {}
    problems: list[str] = []
    for o in fp:
        if not o.is_area() or o.from_way():
            continue
        tags = dict(o.tags)
        iso = tags.get("ISO3166-2", "")
        if tags.get("boundary") != "administrative" or not iso.startswith(prefix):
            continue
        rid = o.orig_id()
        name = province_name(tags, bp)
        if name is None:
            problems.append(f"relation {rid} ({iso}) has no name")
            continue
        try:
            geom = wkb.loads(fab.create_multipolygon(o), hex=True)
        except RuntimeError:
            problems.append(f"relation {rid} ({iso}) failed to assemble")
            continue
        found[rid] = ProvinceArea(rid, iso, name, geom)
    if problems:
        raise ProvinceReadError("; ".join(problems))
    provinces = sorted(found.values(), key=lambda p: p.osm_id)
    isos = [p.iso for p in provinces]
    dupes = sorted({i for i in isos if isos.count(i) > 1})
    if dupes:
        raise ProvinceReadError(f"duplicate ISO codes: {', '.join(dupes)}")
    if len(provinces) != int(bp["expectedCount"]):
        raise ProvinceReadError(
            f"expected {bp['expectedCount']} provinces, found {len(provinces)}: "
            + ", ".join(isos)
        )
    return provinces
