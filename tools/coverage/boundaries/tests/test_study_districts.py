"""P2-H26 (D-126): data/map/study-districts.json, the study-area district list with ids that
match data/map/launch-area.geojson. `build --check` needs only committed files (pnpm test)."""

from __future__ import annotations

import copy
import json

import pytest

from boundaries.build import BuildError
from boundaries.districts import DEFAULT_SOURCE, build, district_id, main
from pipeline.config import DEFAULT_PARAMS, TOOL_DIR

from .conftest import DATA_MAP, load

BP = load(TOOL_DIR / "boundaries" / "params.json")
STUDY = load(DEFAULT_PARAMS)["pipeline"]["studyArea"]
FILE = DATA_MAP / "study-districts.json"
LAUNCH = load(DATA_MAP / "launch-area.geojson")


def test_build_check_matches_committed_file():
    assert main(["build", "--check"]) == 0, "rerun: python -m boundaries.districts build"


@pytest.mark.skipif(not (TOOL_DIR / BP["studyDistricts"]["input"]).exists(),
                    reason="needs the git-ignored coverage pipeline output (tools/coverage/out/)")
def test_extract_check_matches_committed_source():
    assert main(["extract", "--check"]) == 0, "rerun: python -m boundaries.districts extract"


def test_every_study_district_once_with_the_contract_fields():
    doc = load(FILE)
    rows = doc["districts"]
    assert len(rows) == sum(int(p["expectedDistricts"]) for p in STUDY["provinces"]) == 79
    assert all(set(r) == {"id", "osmRelationId", "provinceIso"} for r in rows)
    assert len({r["id"] for r in rows}) == len({r["osmRelationId"] for r in rows}) == 79
    assert {r["provinceIso"] for r in rows} == {p["iso"] for p in STUDY["provinces"]}
    assert "ODbL" in doc["license"] and "OpenStreetMap" in doc["attribution"]
    assert FILE.stat().st_size <= int(BP["studyDistricts"]["maxFileBytes"])


def test_launch_ids_line_up_and_the_interest_list_has_76():
    rows = {r["id"]: r["osmRelationId"] for r in load(FILE)["districts"]}
    launch = {f["properties"]["id"]: f["properties"]["osmRelationId"] for f in LAUNCH["features"]}
    assert all(rows.get(i) == rel for i, rel in launch.items()), launch
    assert len(set(rows) - set(launch)) == 76  # D-126 S-09 interest list under D-083


@pytest.mark.parametrize("name, expected", [
    ("Phra Nakhon District", "phraNakhon"),
    ("Samphanthawong District", "samphanthawong"),
    ("Mueang Samut Prakan District", "mueangSamutPrakan"),
    ("Pathum Wan District", "pathumWan"),
    ("Bang Rak District", "bangRak"),
    ("Pom Prap Sattru Phai District", "pomPrapSattruPhai"),
])
def test_id_rule(name, expected):
    assert district_id(name) == expected


@pytest.mark.parametrize("name", ["Phra Nakhon", "Bang Rak (เขต) District", "", "  District"])
def test_id_rule_rejects_unexpected_names(name):
    with pytest.raises(BuildError):
        district_id(name)


def _source():
    return json.loads(DEFAULT_SOURCE.read_text(encoding="utf-8"))


def test_build_stops_on_launch_mismatch_duplicate_or_count():
    launch = BP["launchArea"]["districts"]
    bad_launch = copy.deepcopy(launch)
    bad_launch[0]["id"] = "somethingElse"
    with pytest.raises(BuildError):
        build(_source(), STUDY, bad_launch)
    dup = _source()
    dup["districts"][1]["osmNameEn"] = dup["districts"][0]["osmNameEn"]
    with pytest.raises(BuildError):
        build(dup, STUDY, launch)
    short = _source()
    short["districts"].pop()
    with pytest.raises(BuildError):
        build(short, STUDY, launch)


NAMES = DATA_MAP.parent.parent / "config" / "content" / "names.th.json"


def test_ids_equal_names_th_district_keys():
    """P2-H26: narrative-designer's district.<id> keys (config/content/names.th.json) and this
    file's ids are one set, with the same relation and province, so the S-09 list shows names."""
    names = load(NAMES)
    keyed = {k[len("district."):]: v for k, v in names.items() if k.startswith("district.")}
    rows = {r["id"]: r for r in load(FILE)["districts"]}
    assert set(keyed) == set(rows), (sorted(set(rows) - set(keyed)), sorted(set(keyed) - set(rows)))
    for i, entry in keyed.items():
        assert entry["_osmRelationId"] == rows[i]["osmRelationId"], i
        assert entry["_provinceIso"] == rows[i]["provinceIso"], i
