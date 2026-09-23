"""Step 1 (the only step that uses the network): download dated source files
and verify SHA-256 against params.json#pipeline.sources (METHOD 4)."""

from __future__ import annotations

import hashlib
import os
import shutil
import urllib.request
from pathlib import Path
from typing import Any

CHUNK_BYTES = 1 << 20  # 1 MiB read buffer (I/O unit, not a tunable value)


class FetchError(Exception):
    pass


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(CHUNK_BYTES), b""):
            h.update(chunk)
    return h.hexdigest()


def _download(url: str, dest: Path) -> None:
    part = dest.with_name(dest.name + ".part")
    part.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "keep-walking-coverage/1"})
    try:
        with urllib.request.urlopen(req) as resp, part.open("wb") as out:
            shutil.copyfileobj(resp, out, CHUNK_BYTES)
    except Exception:
        part.unlink(missing_ok=True)
        raise
    part.replace(dest)


def fetch_sources(
    sources: list[dict[str, Any]], tool_dir: Path, offline: bool, include_optional: bool
) -> dict[str, dict[str, Any]]:
    """Return {id: {path, sha256, status}}. Existing files with a matching
    checksum are skipped. A mismatch after download deletes the file and stops."""
    if not offline and os.environ.get("CI"):
        raise FetchError("CI must not download large data (TL-S11); use the test fixture")
    result: dict[str, dict[str, Any]] = {}
    for src in sources:
        path = tool_dir / src["path"]
        wanted = src["required"] or include_optional
        if path.exists():
            digest = sha256_file(path)
            if digest == src["sha256"]:
                result[src["id"]] = {"path": src["path"], "sha256": digest, "status": "verified"}
                continue
            if offline:
                raise FetchError(f"{src['id']}: checksum mismatch for {path} (got {digest})")
            print(f"[fetch] {src['id']}: checksum mismatch, downloading again")
            path.unlink()
        if not wanted:
            result[src["id"]] = {"path": src["path"], "sha256": None, "status": "skipped"}
            continue
        if offline:
            if src["required"]:
                raise FetchError(f"{src['id']}: {path} missing; run without --offline first")
            result[src["id"]] = {"path": src["path"], "sha256": None, "status": "missing"}
            continue
        print(f"[fetch] {src['id']}: downloading {src['url']} ({src['bytes']:,} bytes)")
        _download(src["url"], path)
        digest = sha256_file(path)
        if digest != src["sha256"]:
            path.unlink()
            raise FetchError(f"{src['id']}: checksum mismatch after download (got {digest})")
        result[src["id"]] = {"path": src["path"], "sha256": digest, "status": "downloaded"}
    return result
