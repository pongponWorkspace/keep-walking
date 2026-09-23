"""Pure tag rules (no geometry, no I/O). Every list comes from config.

A tag spec is "key=value" or "key=*" (any value).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

Tags = Mapping[str, str]
NAME_KEYS = ("name", "name:th", "name:en")


def parse_spec(spec: str) -> tuple[str, str | None]:
    key, _, value = spec.partition("=")
    return key, (None if value == "*" else value)


def tag_matches(tags: Tags, spec: str) -> bool:
    key, value = parse_spec(spec)
    if key not in tags:
        return False
    return value is None or tags[key] == value


def matching_specs(tags: Tags, specs: Iterable[str]) -> list[str]:
    return [s for s in specs if tag_matches(tags, s)]


def classify(tags: Tags, candidate_classes: list[dict[str, Any]]) -> list[str]:
    """All candidate classes this object belongs to, in priority order."""
    return [c["class"] for c in candidate_classes if matching_specs(tags, c["tags"])]


@dataclass(frozen=True)
class BlockRules:
    """Active blocklist: category -> tag specs, after the config switches."""

    by_category: dict[str, tuple[str, ...]]
    area_only: frozenset[str]

    @classmethod
    def from_filter(cls, cf: Mapping[str, Any]) -> "BlockRules":
        disabled_cats = set(cf["blocklistDisabledCategories"])
        disabled_tags = set(cf["blocklistDisabledTags"])
        by_cat: dict[str, tuple[str, ...]] = {}
        for cat, specs in cf["blocklistTags"].items():
            if cat.startswith("_") or cat in disabled_cats:
                continue
            by_cat[cat] = tuple(s for s in specs if s not in disabled_tags)
        return cls(by_cat, frozenset(cf["blocklistAreaOnlyTags"]))

    def categories(self, tags: Tags, is_area: bool) -> list[str]:
        """Blocker categories this object belongs to (sorted, stable)."""
        cats = []
        for cat, specs in self.by_category.items():
            hits = matching_specs(tags, specs)
            if not is_area:
                hits = [s for s in hits if s not in self.area_only]
            if hits:
                cats.append(cat)
        return sorted(cats)

    def all_specs(self) -> list[str]:
        return sorted({s for specs in self.by_category.values() for s in specs})


def compile_patterns(patterns: Iterable[str]) -> list[re.Pattern[str]]:
    return [re.compile(p) for p in patterns]


def names(tags: Tags) -> list[str]:
    return [tags[k] for k in NAME_KEYS if tags.get(k)]


def name_matches(tags: Tags, patterns: list[re.Pattern[str]], anchored: bool) -> bool:
    """anchored=True uses re.match semantics (pattern carries '^'), else search."""
    for text in names(tags):
        for pat in patterns:
            if (pat.match(text) if anchored else pat.search(text)):
                return True
    return False


def access_reasons(tags: Tags, classes: list[str], cf: Mapping[str, Any]) -> list[str]:
    """Rules of METHOD 6.1 that make an object not public or not outdoor."""
    reasons: list[str] = []
    if tags.get("access") in set(cf["excludeAccessValues"]):
        reasons.append("access_private")
    if "garden" in classes and classes[0] == "garden":
        if tags.get("garden:type") in set(cf["privateGardenTypes"]):
            reasons.append("private_garden")
    if _is_indoor(tags):
        reasons.append("indoor")
    if "marketplace" in classes and classes[0] == "marketplace":
        building = tags.get("building")
        if building is not None and building not in set(cf["outdoorBuildingValues"]):
            reasons.append("indoor_market")
    return reasons


def _is_indoor(tags: Tags) -> bool:
    indoor = tags.get("indoor")
    if indoor is not None and indoor != "no":
        return True
    layer = tags.get("layer")
    if layer is None:
        return False
    try:
        return float(layer) < 0
    except ValueError:
        return False


def is_major_way(tags: Tags, cf: Mapping[str, Any]) -> bool:
    if not matching_specs(tags, cf["majorWayTags"]):
        return False
    for key in cf["majorWayIgnoreIfTagged"]:
        if key in tags and tags[key] != "no":
            return False
    return True
