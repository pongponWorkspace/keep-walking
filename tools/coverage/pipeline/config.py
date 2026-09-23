"""Load pipeline configuration.

Game rules come from config/balance/dungeons.json only: area.minArea_m2,
area.maxArea_m2, verification.*, and coverageFilter.* (moved there in P1-H03,
which resolved assumption A-P1-F01-T01-1). Tool parameters (sources, study
area, CRS, output paths) come from tools/coverage/params.json#pipeline.
There are no default values in code: a missing key stops the run.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

TOOL_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = TOOL_DIR.parent.parent
DEFAULT_PARAMS = TOOL_DIR / "params.json"
DEFAULT_DUNGEONS = REPO_ROOT / "config" / "balance" / "dungeons.json"

# Key names only (no values). Every key must be present in the chosen source.
REQUIRED_FILTER_KEYS = (
    "maxBlockedShare",
    "pointBlockerRadius_m",
    "duplicateIoU",
    "nestedContainmentShare",
    "partialOverlapShare",
    "multipartMaxGap_m",
    "repairMaxAreaChangeShare",
    "excludeAccessValues",
    "sizeBandUpper_m2",
    "boundaryCrossCheckMaxDiffShare",
    "religiousNamePatterns",
    "blocklistTags",
    "blocklistDisabledCategories",
    "blocklistDisabledTags",
    "blocklistAreaOnlyTags",
    "reviewOsmIds",
    "reviewTags",
    "reviewNamePatterns",
    "reviewMinAreaTags",
    "outdoorBuildingValues",
    "privateGardenTypes",
    "majorWayTags",
    "majorWayIgnoreIfTagged",
    "majorWayAction",
    "majorWayMinInsideLength_m",
)

REQUIRED_PIPELINE_KEYS = (
    "sources",
    "osmSource",
    "crossCheckSource",
    "projectedCrs",
    "studyArea",
    "candidateClasses",
    "poiTags",
    "coordinatePrecision",
    "areaPrecision",
    "sharePrecision",
    "qaSample",
    "maxCommittedFileBytes",
    "excludedTrimTagKeys",
    "outputs",
)

MAJOR_WAY_ACTIONS = ("flag", "exclude", "off")


class ConfigError(Exception):
    """Raised when a required configuration value is missing or invalid."""


@dataclass
class Config:
    min_area_m2: float
    max_area_m2: float
    cf: dict[str, Any]
    pipeline: dict[str, Any]
    verification_mode: str
    floor_level: Any
    sources: dict[str, str] = field(default_factory=dict)

    def as_meta(self) -> dict[str, Any]:
        """Every value used, with the file it came from (for run meta)."""
        return {
            "sources": self.sources,
            "area": {"minArea_m2": self.min_area_m2, "maxArea_m2": self.max_area_m2},
            "verification": {
                "v1VerificationMode": self.verification_mode,
                "v1FloorLevel": self.floor_level,
            },
            "coverageFilter": _strip_meta(self.cf),
        }


def _strip_meta(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _strip_meta(v) for k, v in obj.items() if not k.startswith("_")}
    return obj


def _read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError as exc:
        raise ConfigError(f"config file not found: {path}") from exc


def _require(obj: dict[str, Any], keys: tuple[str, ...], where: str) -> None:
    missing = [k for k in keys if k not in obj]
    if missing:
        raise ConfigError(f"missing keys in {where}: {', '.join(missing)}")


def _validate_filter(cf: dict[str, Any], where: str) -> None:
    _require(cf, REQUIRED_FILTER_KEYS, where)
    cats = [c for c in cf["blocklistTags"] if not c.startswith("_")]
    missing_share = [c for c in cats if c not in cf["maxBlockedShare"]]
    if missing_share:
        raise ConfigError(f"{where}.maxBlockedShare has no value for: {', '.join(missing_share)}")
    if "religious" not in cats:
        raise ConfigError(f"{where}.blocklistTags must define the 'religious' category (D-006)")
    if "religious" in cf["blocklistDisabledCategories"]:
        raise ConfigError("the religious category cannot be disabled (D-006)")
    for band in ("small", "medium"):
        if band not in cf["sizeBandUpper_m2"]:
            raise ConfigError(f"{where}.sizeBandUpper_m2.{band} is missing")
    if cf["majorWayAction"] not in MAJOR_WAY_ACTIONS:
        raise ConfigError(f"{where}.majorWayAction must be one of {MAJOR_WAY_ACTIONS}")


def load_config(
    params_path: Path = DEFAULT_PARAMS,
    dungeons_path: Path = DEFAULT_DUNGEONS,
) -> Config:
    """Game rules from dungeons.json, tool parameters from params.json."""
    dungeons = _read_json(dungeons_path)
    params = _read_json(params_path)

    area = dungeons.get("area")
    if not isinstance(area, dict):
        raise ConfigError(f"{dungeons_path}: object 'area' is missing")
    _require(area, ("minArea_m2", "maxArea_m2"), f"{dungeons_path}#area")
    min_a, max_a = float(area["minArea_m2"]), float(area["maxArea_m2"])
    if not min_a < max_a:
        raise ConfigError("area.minArea_m2 must be smaller than area.maxArea_m2")

    verification = dungeons.get("verification")
    if not isinstance(verification, dict):
        raise ConfigError(f"{dungeons_path}: object 'verification' is missing")
    _require(verification, ("v1VerificationMode", "v1FloorLevel"), f"{dungeons_path}#verification")

    sources = {
        "area": f"{_rel(dungeons_path)}#area",
        "verification": f"{_rel(dungeons_path)}#verification",
    }
    cf = dungeons.get("coverageFilter")
    if not isinstance(cf, dict):
        raise ConfigError(f"{dungeons_path}: object 'coverageFilter' is missing (P1-H03)")
    sources["coverageFilter"] = f"{_rel(dungeons_path)}#coverageFilter"
    _validate_filter(cf, sources["coverageFilter"])

    pipeline = params.get("pipeline")
    if not isinstance(pipeline, dict):
        raise ConfigError(f"{params_path}: object 'pipeline' is missing")
    _require(pipeline, REQUIRED_PIPELINE_KEYS, f"{params_path}#pipeline")
    sources["pipeline"] = f"{_rel(params_path)}#pipeline"
    return Config(
        min_a, max_a, cf, pipeline,
        verification["v1VerificationMode"], verification["v1FloorLevel"], sources,
    )


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)
