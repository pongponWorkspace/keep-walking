"""Step 1 fetch: checksum verification, skip, cleanup (file:// URLs, no network)."""

from __future__ import annotations

import hashlib

import pytest

from pipeline.fetch import FetchError, fetch_sources


def _source(tmp_path, content: bytes, sha: str | None = None, required: bool = True) -> dict:
    src = tmp_path / "remote.bin"
    src.write_bytes(content)
    return {"id": "T1", "url": src.as_uri(), "path": "downloads/t1.bin", "bytes": len(content),
            "sha256": sha or hashlib.sha256(content).hexdigest(), "required": required}


def test_download_then_skip(tmp_path, monkeypatch):
    monkeypatch.delenv("CI", raising=False)
    s = _source(tmp_path, b"osm-bytes")
    first = fetch_sources([s], tmp_path, offline=False, include_optional=True)
    assert first["T1"]["status"] == "downloaded"
    again = fetch_sources([s], tmp_path, offline=True, include_optional=True)
    assert again["T1"]["status"] == "verified"


def test_checksum_mismatch_deletes_and_stops(tmp_path, monkeypatch):
    monkeypatch.delenv("CI", raising=False)
    s = _source(tmp_path, b"tampered", sha="0" * 64)
    with pytest.raises(FetchError):
        fetch_sources([s], tmp_path, offline=False, include_optional=True)
    assert not (tmp_path / s["path"]).exists()
    assert not (tmp_path / (s["path"] + ".part")).exists()


def test_offline_missing_required_fails(tmp_path):
    s = _source(tmp_path, b"x")
    with pytest.raises(FetchError):
        fetch_sources([s], tmp_path, offline=True, include_optional=True)


def test_no_download_in_ci(tmp_path, monkeypatch):
    monkeypatch.setenv("CI", "true")
    s = _source(tmp_path, b"x")
    with pytest.raises(FetchError, match="CI"):
        fetch_sources([s], tmp_path, offline=False, include_optional=True)
