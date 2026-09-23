"""Contract checks shared by the fixture tests and the committed-output tests
(tech note 15.1, map-style 6.2–6.3)."""

from __future__ import annotations

import json
from typing import Any, Iterator

from shapely.geometry import MultiLineString, Point, Polygon, shape

MAX_DECIMALS = 5


def signed_area(ring: list[list[float]]) -> float:
    """Shoelace; > 0 means counter-clockwise."""
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(ring, ring[1:])) / 2


def iter_numbers(obj: Any) -> Iterator[float]:
    if isinstance(obj, (int, float)) and not isinstance(obj, bool):
        yield obj
    elif isinstance(obj, list):
        for item in obj:
            yield from iter_numbers(item)


def max_decimals(fc: dict[str, Any]) -> int:
    worst = 0
    for f in fc["features"]:
        for v in iter_numbers(f["geometry"]["coordinates"]):
            text = json.dumps(v)
            if "e" in text.lower():
                raise AssertionError(f"exponent notation in coordinate {text}")
            if "." in text:
                worst = max(worst, len(text.split(".")[1]))
    return worst


def check_collection(fc: dict[str, Any]) -> None:
    assert fc["type"] == "FeatureCollection"
    assert "OpenStreetMap" in fc["attribution"] and "ODbL" in fc["attribution"]
    assert max_decimals(fc) <= MAX_DECIMALS
    for f in fc["features"]:
        assert f["type"] == "Feature"
        assert isinstance(f["properties"], dict)
        assert shape(f["geometry"]).is_valid or f["geometry"]["type"] == "MultiLineString"


def check_mask(fc: dict[str, Any], outer_ring: list[list[float]]) -> Polygon:
    check_collection(fc)
    assert len(fc["features"]) == 1
    feat = fc["features"][0]
    assert feat["properties"] == {}
    geom = feat["geometry"]
    assert geom["type"] == "Polygon"
    rings = geom["coordinates"]
    assert [[float(x), float(y)] for x, y in rings[0]] == [
        [float(x), float(y)] for x, y in outer_ring]
    assert signed_area(rings[0]) > 0, "outer ring must be counter-clockwise (RFC 7946)"
    assert len(rings) >= 2, "mask needs at least one hole"
    for ring in rings[1:]:
        assert ring[0] == ring[-1] and len(ring) >= 4
        assert signed_area(ring) < 0, "holes must be clockwise (RFC 7946)"
    poly = shape(geom)
    assert poly.is_valid
    return poly


def check_provinces(
    fc: dict[str, Any], expected_count: int, playable_isos: set[str]
) -> tuple[MultiLineString, list[dict[str, Any]]]:
    check_collection(fc)
    borders = [f for f in fc["features"] if f["properties"].get("kind") == "border"]
    labels = [f for f in fc["features"] if f["properties"].get("kind") == "label"]
    assert len(borders) + len(labels) == len(fc["features"]), "unknown kind"
    assert len(borders) == 1
    assert borders[0]["properties"] == {"kind": "border"}
    assert borders[0]["geometry"]["type"] in ("LineString", "MultiLineString")
    for line in borders[0]["geometry"]["coordinates"]:
        assert len(line) >= 2
    assert len(labels) == expected_count
    for f in labels:
        props = f["properties"]
        assert set(props) == {"kind", "name", "playable", "iso"}
        assert isinstance(props["name"], str) and props["name"].strip() == props["name"] != ""
        assert not props["name"].startswith("จังหวัด")
        assert isinstance(props["playable"], bool)
        assert f["geometry"]["type"] == "Point"
    names = [f["properties"]["name"] for f in labels]
    isos = [f["properties"]["iso"] for f in labels]
    assert len(set(names)) == len(names) and len(set(isos)) == len(isos)
    assert {f["properties"]["iso"] for f in labels if f["properties"]["playable"]} == playable_isos
    return shape(borders[0]["geometry"]), labels


def check_labels_vs_mask(labels: list[dict[str, Any]], mask: Polygon) -> None:
    """Playable labels sit in a hole (visible area); the others under the mask."""
    for f in labels:
        covered = mask.contains(Point(f["geometry"]["coordinates"]))
        assert covered != f["properties"]["playable"], f["properties"]
