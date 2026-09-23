#!/usr/bin/env python3
"""Local static server for tools/tiles with HTTP Range support (206) and CORS.

Python standard library only. `python3 -m http.server` ignores Range headers, which breaks
`pmtiles://` sources, so this adds single-range byte serving on top of SimpleHTTPRequestHandler.
Headers mirror the map project's _headers on Cloudflare Pages (tech note 7.5) closely enough
for local testing: Content-Type for .mvt/.pbf/.ttf/.pmtiles, Access-Control-Allow-Origin,
Timing-Allow-Origin, Accept-Ranges. No credentials, binds to 127.0.0.1 by default.

usage: serve.py [--root DIR] [--host HOST] [--port PORT]   (defaults from config.json localServe)
"""
import argparse
import json
import os
import re
import sys
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TILES_DIR = Path(__file__).resolve().parent.parent
RANGE_RE = re.compile(r"^bytes=(\d*)-(\d*)$")
TYPES = {
    ".mvt": "application/x-protobuf",
    ".pbf": "application/x-protobuf",
    ".pmtiles": "application/octet-stream",
    ".ttf": "font/ttf",
    ".json": "application/json",
    ".geojson": "application/geo+json",
}


class RangeHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, **TYPES}

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Range, If-Match, If-None-Match")
        self.send_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, ETag")
        self.send_header("Timing-Allow-Origin", "*")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.end_headers()

    def send_head(self):
        header = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not header or not os.path.isfile(path):
            return super().send_head()
        m = RANGE_RE.match(header.strip())
        size = os.path.getsize(path)
        if not m or (m.group(1) == "" and m.group(2) == ""):
            return super().send_head()  # unsupported form (e.g. multi-range): full 200
        if m.group(1) == "":  # suffix range: last N bytes
            start, end = max(0, size - int(m.group(2))), size - 1
        else:
            start = int(m.group(1))
            end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
        if start >= size or start > end:
            self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        fh = open(path, "rb")
        fh.seek(start)
        self.send_response(HTTPStatus.PARTIAL_CONTENT)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return fh

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self._remaining = None


def main():
    cfg = json.loads((TILES_DIR / "config.json").read_text(encoding="utf-8"))["localServe"]
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(TILES_DIR.parent.parent / cfg["root"]))
    ap.add_argument("--host", default=cfg["host"])
    ap.add_argument("--port", type=int, default=cfg["port"])
    args = ap.parse_args()
    handler = partial(RangeHandler, directory=args.root)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"serving {args.root} at http://{args.host}:{args.port}/ (Ctrl+C to stop)", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
