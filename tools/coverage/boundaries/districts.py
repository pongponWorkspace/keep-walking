"""Study-area district list (P2-H26, D-126): every district of the coverage study area with a
stable camelCase id, so the client can derive the S-09 interest list as
"study districts minus data/map/launch-area.geojson" from one dataset.

Two offline steps, both deterministic (same pattern as boundaries.launch):

  extract  tools/coverage/out/boundaries.geojson (git-ignored pipeline output, needs D1)
           -> boundaries/study-districts.source.json  (osm relation id, OSM name:en, province)
  build    committed source -> data/map/study-districts.json  (id, osmRelationId, provinceIso)

id rule (district_id): OSM `name:en` without the trailing " District", words joined in
lowerCamelCase: "Phra Nakhon District" -> phraNakhon, "Mueang Samut Prakan District" ->
mueangSamutPrakan. The launch ids in boundaries/params.json#launchArea.districts and the
content keys `district.<id>` in config/content/names.th.json use the same ids; build stops if a
launch district's id or relation differs, if an id repeats, or if the count per province is not
tools/coverage/params.json#pipeline.studyArea.provinces[].expectedDistricts.

`--check` computes the file in memory and compares it byte for byte (exit 1 on drift).
`build --check` needs only committed inputs and runs in the root `pnpm test` through the
pytest bridge; `extract --check` needs tools/coverage/out/ and is skipped when it is absent.

Run from tools/coverage/:  .venv/bin/python -m boundaries.districts build [--check]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from pipeline.config import DEFAULT_PARAMS, TOOL_DIR

from .__main__ import DEFAULT_BOUNDARY_PARAMS
from .build import BuildError

DEFAULT_SOURCE = Path(__file__).resolve().parent / "study-districts.source.json"
TOOL = "tools/coverage/boundaries/districts.py (P2-H26)"
SUFFIX = " District"
ID_RE = re.compile(r"^[a-z][A-Za-z0-9]*$")


def district_id(name_en: str) -> str:
    """'Pom Prap Sattru Phai District' -> 'pomPrapSattruPhai'."""
    base = name_en.strip()
    if not base.endswith(SUFFIX):
        raise BuildError(f"name:en {name_en!r} does not end with {SUFFIX!r}")
    words = re.split(r"[\s\-]+", base[: -len(SUFFIX)].strip())
    if not words or not all(w.isalnum() and w.isascii() for w in words):
        raise BuildError(f"name:en {name_en!r} has characters outside [A-Za-z0-9 -]")
    out = words[0].lower() + "".join(w[:1].upper() + w[1:].lower() for w in words[1:])
    if not ID_RE.match(out):
        raise BuildError(f"derived id {out!r} from {name_en!r} is not lowerCamelCase")
    return out


def _dumps(doc: dict[str, Any], key: str) -> str:
    """Pretty head, one compact entry per line (small, diff-friendly)."""
    head = {k: v for k, v in doc.items() if k != key}
    top = json.dumps(head, ensure_ascii=False, indent=2)[:-2]
    rows = ",\n".join("    " + json.dumps(r, ensure_ascii=False, separators=(", ", ": "))
                      for r in doc[key])
    return f'{top},\n  "{key}": [\n{rows}\n  ]\n}}\n'


def extract(boundaries: dict[str, Any], study_area: dict[str, Any]) -> dict[str, Any]:
    order = {p["iso"]: i for i, p in enumerate(study_area["provinces"])}
    rows = []
    for f in boundaries["features"]:
        p = f["properties"]
        if p["province_iso"] not in order:
            continue
        rows.append({"osmRelationId": int(p["district_osm_id"]), "osmNameEn": p["district_en"],
                     "provinceIso": p["province_iso"]})
    rows.sort(key=lambda r: (order[r["provinceIso"]], r["osmRelationId"]))
    meta = boundaries.get("coverage_meta", {})
    return {"attribution": meta.get("attribution"), "license": meta.get("license"),
            "source": {"dataDate": meta.get("data_date"),
                       "derivedFrom": "tools/coverage/out/boundaries.geojson", "tool": TOOL},
            "districts": rows}


def build(source: dict[str, Any], study_area: dict[str, Any],
          launch: list[dict[str, Any]]) -> dict[str, Any]:
    rows = [{"id": district_id(r["osmNameEn"]), "osmRelationId": r["osmRelationId"],
             "provinceIso": r["provinceIso"]} for r in source["districts"]]
    ids = [r["id"] for r in rows]
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if dup:
        raise BuildError(f"duplicate district ids {dup}")
    for p in study_area["provinces"]:
        n = sum(r["provinceIso"] == p["iso"] for r in rows)
        if n != int(p["expectedDistricts"]):
            raise BuildError(f"{p['iso']}: {n} districts, expected {p['expectedDistricts']}")
    by_rel = {r["osmRelationId"]: r["id"] for r in rows}
    for d in launch:
        if by_rel.get(int(d["osmRelationId"])) != d["id"]:
            raise BuildError(f"launch district {d['id']} ({d['osmRelationId']}) does not match "
                             f"derived id {by_rel.get(int(d['osmRelationId']))!r}")
    return {"attribution": source["attribution"], "license": source["license"],
            "source": {**source["source"], "derivedFrom": "tools/coverage/boundaries/"
                       + DEFAULT_SOURCE.name, "tool": TOOL},
            "idRule": "OSM name:en minus ' District', lowerCamelCase (boundaries/districts.py)",
            "districts": rows}


def _parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="python -m boundaries.districts", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("step", choices=["extract", "build"])
    ap.add_argument("--params", type=Path, default=DEFAULT_PARAMS)
    ap.add_argument("--boundary-params", type=Path, default=DEFAULT_BOUNDARY_PARAMS)
    ap.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    ap.add_argument("--out-base", type=Path, default=TOOL_DIR)
    ap.add_argument("--check", action="store_true", help="compare with the committed file")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        pl = json.loads(args.params.read_text(encoding="utf-8"))["pipeline"]
        bp = json.loads(args.boundary_params.read_text(encoding="utf-8"))
        sd = bp["studyDistricts"]
        if args.step == "extract":
            fc = json.loads((TOOL_DIR / sd["input"]).read_text(encoding="utf-8"))
            # tools/ is prettier-checked (data/ is not): indent=2 is prettier's JSON layout here
            # (no scalar arrays), so `--check` stays byte-exact without a .prettierignore entry.
            doc = extract(fc, pl["studyArea"])
            text, out = json.dumps(doc, ensure_ascii=False, indent=2) + "\n", args.source
        else:
            src = json.loads(args.source.read_text(encoding="utf-8"))
            doc = build(src, pl["studyArea"], bp["launchArea"]["districts"])
            text, out = _dumps(doc, "districts"), (args.out_base / sd["output"]).resolve()
        data = text.encode("utf-8")
        if len(data) > int(sd["maxFileBytes"]):
            raise BuildError(f"{out.name}: {len(data):,} bytes > {int(sd['maxFileBytes']):,}")
        if args.check:
            same = out.exists() and out.read_bytes() == data
            print(f"[districts {args.step}] {'ok' if same else 'DRIFT'}: {out}")
            return 0 if same else 1
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)
        print(f"[districts {args.step}] wrote {out} ({len(data):,} bytes)")
    except (BuildError, KeyError, OSError, ValueError) as exc:
        print(f"[districts] error: {exc!r}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
