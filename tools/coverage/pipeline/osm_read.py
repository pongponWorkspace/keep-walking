"""Read an OSM file (PBF or XML) once and collect raw features.

Only step 1 (fetch) uses the network; this module reads local files only.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import osmium
from shapely import wkb
from shapely.geometry import Point
from shapely.geometry.base import BaseGeometry

from .tags import BlockRules, classify, is_major_way, matching_specs, parse_spec

EB = osmium.osm.osm_entity_bits


@dataclass
class RawArea:
    osm_type: str  # "way" | "relation"
    osm_id: int
    tags: dict[str, str]
    geom: BaseGeometry  # WGS84
    classes: list[str]
    block_cats: list[str]
    admin_level: str | None

    @property
    def id(self) -> str:
        return f"osm-{self.osm_type[0]}{self.osm_id}"


@dataclass
class RawNode:
    osm_id: int
    tags: dict[str, str]
    geom: Point
    block_cats: list[str]
    is_poi: bool

    @property
    def id(self) -> str:
        return f"osm-n{self.osm_id}"


@dataclass
class RawWay:
    osm_id: int
    tags: dict[str, str]
    geom: BaseGeometry

    @property
    def id(self) -> str:
        return f"osm-w{self.osm_id}"


@dataclass
class RawData:
    data_date: str | None
    areas: list[RawArea] = field(default_factory=list)
    nodes: list[RawNode] = field(default_factory=list)
    major_ways: list[RawWay] = field(default_factory=list)
    candidate_relations_seen: set[int] = field(default_factory=set)
    assembly_failed: list[str] = field(default_factory=list)


def filter_keys(pipeline: dict[str, Any], rules: BlockRules) -> list[str]:
    """OSM keys to pre-filter on, derived from config (no fixed list in code)."""
    specs = [s for c in pipeline["candidateClasses"] for s in c["tags"]]
    specs += rules.all_specs() + list(pipeline["poiTags"])
    keys = {parse_spec(s)[0] for s in specs} | {"boundary"}
    return sorted(keys)


def major_way_pairs(cf: dict[str, Any]) -> list[tuple[str, str]]:
    pairs = []
    for spec in cf["majorWayTags"]:
        key, value = parse_spec(spec)
        if value is None:
            raise ValueError(f"majorWayTags must be key=value, got {spec}")
        pairs.append((key, value))
    return pairs


def _open(path: Path) -> Any:
    name = path.name
    if name.endswith(".osm.xml"):
        return osmium.io.File(str(path), "osm")
    return str(path)


def read_header_date(path: Path) -> str | None:
    reader = osmium.io.Reader(_open(path), EB.NOTHING)
    try:
        header = reader.header()
        return header.get("osmosis_replication_timestamp") or None
    finally:
        reader.close()


def read_osm(path: Path, cf: dict[str, Any], pipeline: dict[str, Any]) -> RawData:
    """One streaming pass: candidate/blocker/boundary areas, blocker and POI
    nodes, major ways (for the crosses_major_way flag)."""
    rules = BlockRules.from_filter(cf)
    classes_cfg = pipeline["candidateClasses"]
    study = pipeline["studyArea"]
    prov_level, dist_level = study["provinceAdminLevel"], study["districtAdminLevel"]
    prov_ids = {int(p["osmRelationId"]) for p in study["provinces"]}
    keys = filter_keys(pipeline, rules)

    area_filter = osmium.filter.KeyFilter(*keys)
    main_filter = osmium.filter.KeyFilter(*keys)
    main_filter.enable_for(EB.NODE | EB.AREA)
    way_filter = osmium.filter.TagFilter(*major_way_pairs(cf))
    way_filter.enable_for(EB.WAY)

    fp = (
        osmium.FileProcessor(_open(path))
        .with_locations()
        .with_areas(area_filter)
        .with_filter(main_filter)
        .with_filter(way_filter)
    )
    fab = osmium.geom.WKBFactory()
    data = RawData(read_header_date(path))
    assembled: set[int] = set()
    assembled_ways: set[int] = set()

    for o in fp:
        if o.is_area():
            tags = dict(o.tags)
            from_way = o.from_way()
            if from_way:
                assembled_ways.add(o.orig_id())
            classes = classify(tags, classes_cfg)
            cats = rules.categories(tags, True)
            level = None
            if not from_way and tags.get("boundary") == "administrative":
                lv = tags.get("admin_level")
                if (lv == prov_level and o.orig_id() in prov_ids) or lv == dist_level:
                    level = lv
            if not classes and not cats and level is None:
                continue
            osm_type = "way" if from_way else "relation"
            oid = o.orig_id()
            if not from_way:
                assembled.add(oid)
            try:
                geom = wkb.loads(fab.create_multipolygon(o), hex=True)
            except RuntimeError:
                data.assembly_failed.append(f"osm-{osm_type[0]}{oid}")
                continue
            data.areas.append(RawArea(osm_type, oid, tags, geom, classes, cats, level))
        elif o.is_node():
            tags = dict(o.tags)
            cats = rules.categories(tags, False)
            poi = bool(matching_specs(tags, pipeline["poiTags"]))
            if (cats or poi) and o.location.valid():
                pt = Point(o.location.lon, o.location.lat)
                data.nodes.append(RawNode(o.id, tags, pt, cats, poi))
        elif o.is_way():
            tags = dict(o.tags)
            if not is_major_way(tags, cf):
                continue
            try:
                line = wkb.loads(fab.create_linestring(o), hex=True)
            except RuntimeError:
                continue
            data.major_ways.append(RawWay(o.id, tags, line))
        elif o.is_relation():
            if o.tags.get("type") == "multipolygon" and classify(dict(o.tags), classes_cfg):
                data.candidate_relations_seen.add(o.id)

    missing = sorted(data.candidate_relations_seen - assembled)
    data.assembly_failed.extend(f"osm-r{rid}" for rid in missing)
    data.assembly_failed.extend(
        f"osm-w{wid}" for wid in unassembled_candidate_ways(path, classes_cfg, assembled_ways))
    data.assembly_failed = sorted(set(data.assembly_failed))
    return data


def unassembled_candidate_ways(
    path: Path, classes_cfg: list[dict[str, Any]], assembled_ways: set[int]
) -> list[int]:
    """Ways with a candidate tag that never became an area (P1-X08 GEO-11).

    pyosmium silently skips a way that is not closed, so a second, cheap pass
    over ways and relations only (no node locations, under a second on the
    Thailand extract) lists them. An unclosed tagged way that is a member of
    a candidate multipolygon relation is covered by that relation (its
    assembly is checked separately) and is not listed.
    """
    keys = sorted({parse_spec(s)[0] for c in classes_cfg for s in c["tags"]})
    fp = osmium.FileProcessor(_open(path), EB.WAY | EB.RELATION).with_filter(
        osmium.filter.KeyFilter(*keys, "type"))
    tagged_ways: dict[int, bool] = {}
    relation_members: set[int] = set()
    for o in fp:
        if o.is_way():
            if classify(dict(o.tags), classes_cfg):
                tagged_ways[o.id] = o.is_closed()
        elif o.is_relation():
            tags = dict(o.tags)
            if tags.get("type") == "multipolygon" and classify(tags, classes_cfg):
                relation_members.update(m.ref for m in o.members if m.type == "w")
    return sorted(
        wid for wid, closed in tagged_ways.items()
        if wid not in assembled_ways and (closed or wid not in relation_members)
    )
