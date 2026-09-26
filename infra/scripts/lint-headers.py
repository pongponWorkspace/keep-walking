#!/usr/bin/env python3
"""Cloudflare Pages `_headers` overlap linter (P1-X41).

Why this exists: Cloudflare Pages applies EVERY rule in a `_headers` file whose path pattern
matches a request path, in file order. If two matching rules set the same header name, Cloudflare
does not let the later/more specific rule win -- it concatenates both values with ", " (this is
exactly the bug P1-X41 fixed: `/tiles/*` and `/tiles/*/tiles.json` both matched a tiles.json
request and produced `access-control-allow-origin: *, *`). A rule can remove a header value it
would otherwise inherit from an earlier matching rule with a `! Header-Name` directive
(https://developers.cloudflare.com/pages/configuration/headers/, the `!` detach syntax).

This script parses a `_headers` file, replays Cloudflare's matching + merge behaviour above for a
fixed list of representative request paths, and fails (exit 1) if any path would still receive two
values for the same header. It never makes a network request and has no third-party dependency
(stdlib only), so it is safe to run in CI or completely offline.

Usage:
    python3 infra/scripts/lint-headers.py <headers-file> [<headers-file> ...]
    python3 infra/scripts/lint-headers.py --paths-file <file> <headers-file> ...   (test hook)

Exit codes: 0 = no path has a duplicated header. 1 = at least one path/header pair is duplicated,
or the file could not be parsed. 2 = usage error (bad arguments, file not found).
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

# Cloudflare Pages `_headers` representative paths (P1-X41 acceptance): a real tile, a TileJSON
# under the same tileset directory, the manifest, a glyph pbf (nested, with a space in the
# directory name -- a real tracked path, see tools/tiles/fixtures), a self-hosted font face, a
# sprite JSON and PNG, and the two paths every Pages project can serve regardless of project-
# specific rules (a 404 page and the SPA's index.html). Any project's `_headers` file is checked
# against this same fixed list: a path a project's rules never match simply resolves with zero or
# one matching rule, which is never a duplicate, so reusing one list for every project is safe.
DEFAULT_REPRESENTATIVE_PATHS: list[str] = [
    "/tiles/pm4-20260923-z15/15/25531/15119.mvt",
    "/tiles/pm4-20260923-z15/tiles.json",
    "/manifest.json",
    "/glyphs/Noto Sans Regular/0-255.pbf",
    "/glyphs/_faces/NotoSansThai-Regular.ttf",
    "/sprites/v4/light.json",
    "/sprites/v4/light.png",
    "/404.html",
    "/index.html",
]


@dataclass
class Directive:
    """One line inside a rule's indented block."""

    op: str  # "set" or "unset"
    name: str  # header name, original case preserved for display
    value: str = ""  # only meaningful when op == "set"


@dataclass
class Rule:
    """One `_headers` rule: a path pattern plus its ordered directives."""

    pattern: str
    line_no: int
    directives: list[Directive] = field(default_factory=list)


class HeadersParseError(ValueError):
    pass


def parse_headers_file(text: str) -> list[Rule]:
    """Parse `_headers` file contents into an ordered list of Rule.

    Format (https://developers.cloudflare.com/pages/configuration/headers/):
      - blank lines and lines whose first non-whitespace character is `#` are ignored outright.
      - a line that is not indented starts a new rule: the rest of that line is the path pattern.
      - subsequent indented lines belong to the current rule. Each is either `! Name` (unset) or
        `Name: value` (set).
      - a rule ends at the next non-indented, non-comment, non-blank line, or at end of file.
    """
    rules: list[Rule] = []
    current: Rule | None = None
    for i, raw_line in enumerate(text.splitlines(), start=1):
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        is_indented = raw_line[:1] in (" ", "\t")
        if not is_indented:
            current = Rule(pattern=stripped, line_no=i)
            rules.append(current)
            continue
        if current is None:
            raise HeadersParseError(f"line {i}: indented directive before any path pattern")
        if stripped.startswith("!"):
            name = stripped[1:].strip()
            # Tolerate an optional trailing colon/value on an unset line; only the name matters.
            name = name.split(":", 1)[0].strip()
            if not name:
                raise HeadersParseError(f"line {i}: '!' directive with no header name")
            current.directives.append(Directive(op="unset", name=name))
            continue
        if ":" not in stripped:
            raise HeadersParseError(f"line {i}: expected 'Name: value' or '! Name', got {stripped!r}")
        name, value = stripped.split(":", 1)
        current.directives.append(Directive(op="set", name=name.strip(), value=value.strip()))
    return rules


def pattern_to_regex(pattern: str) -> re.Pattern[str]:
    """Compile a Cloudflare `_headers` path pattern to a full-match regex.

    `*` is a splat: it matches any sequence of characters, including `/` -- this repo's own
    `_headers` file already relies on that (`/glyphs/*.pbf` has to reach into a nested
    `glyphs/<font name>/<range>.pbf` path to apply its Content-Type), and it is exactly why
    `/tiles/*` also matches `/tiles/<id>/tiles.json`, not only the real `.mvt` tile files (P1-X41).
    Every other character is matched literally (escaped), so a literal `.` (e.g. in `tiles.json`)
    never accidentally behaves as a regex wildcard.
    """
    segments = pattern.split("*")
    regex_body = ".*".join(re.escape(segment) for segment in segments)
    return re.compile(f"^{regex_body}$")


def matching_rules(rules: list[Rule], path: str) -> list[Rule]:
    return [rule for rule in rules if pattern_to_regex(rule.pattern).match(path)]


@dataclass
class PathReport:
    path: str
    matched_rule_lines: list[int]
    # header name (lowercase) -> list of values it ended up with, in application order.
    # len(values) > 1 means Cloudflare would concatenate them -- the P1-X41 bug.
    header_values: dict[str, list[str]]
    # header name (lowercase) -> original-case name, for display.
    header_display_name: dict[str, str]

    def duplicated_headers(self) -> dict[str, list[str]]:
        return {name: vals for name, vals in self.header_values.items() if len(vals) > 1}


def evaluate_path(rules: list[Rule], path: str) -> PathReport:
    """Replay Cloudflare's rule application for one request path.

    Rules are applied in file order. Within a matching rule, every `!` directive first clears any
    value(s) already accumulated for that header name from earlier matching rules; every `Name:
    value` directive then appends its value to that header's accumulator. A header ends up
    duplicated (and Cloudflare will send a merged/concatenated value) exactly when its accumulator
    has more than one entry once every matching rule has been applied.
    """
    matched = matching_rules(rules, path)
    header_values: dict[str, list[str]] = {}
    header_display_name: dict[str, str] = {}
    for rule in matched:
        for directive in rule.directives:
            key = directive.name.lower()
            header_display_name.setdefault(key, directive.name)
            if directive.op == "unset":
                header_values[key] = []
            else:
                header_values.setdefault(key, []).append(directive.value)
    return PathReport(
        path=path,
        matched_rule_lines=[rule.line_no for rule in matched],
        header_values=header_values,
        header_display_name=header_display_name,
    )


def load_paths_file(path: Path) -> list[str]:
    lines = [line.strip() for line in path.read_text(encoding="utf-8").splitlines()]
    return [line for line in lines if line and not line.startswith("#")]


def lint_one_file(headers_path: Path, representative_paths: list[str]) -> tuple[bool, str]:
    """Returns (ok, report_text) for one `_headers` file."""
    try:
        rules = parse_headers_file(headers_path.read_text(encoding="utf-8"))
    except HeadersParseError as exc:
        return False, f"{headers_path}: PARSE ERROR: {exc}\n"

    lines: list[str] = [f"{headers_path} ({len(rules)} rule(s)):"]
    ok = True
    for test_path in representative_paths:
        report = evaluate_path(rules, test_path)
        dups = report.duplicated_headers()
        if not report.matched_rule_lines:
            lines.append(f"  {test_path} -- no rule matches (nothing to check)")
            continue
        matched_desc = ", ".join(f"line {n}" for n in report.matched_rule_lines)
        if dups:
            ok = False
            for key, values in dups.items():
                display = report.header_display_name[key]
                lines.append(
                    f"  FAIL {test_path} -- header '{display}' set by {len(values)} matching "
                    f"rules ({matched_desc}): would send '{', '.join(values)}'"
                )
        else:
            lines.append(f"  ok   {test_path} -- matched {matched_desc}, no duplicated header")
    return ok, "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    paths_file: Path | None = None
    headers_files: list[str] = []
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--paths-file":
            if i + 1 >= len(argv):
                print("usage: lint-headers.py [--paths-file <file>] <headers-file>...", file=sys.stderr)
                return 2
            paths_file = Path(argv[i + 1])
            i += 2
            continue
        headers_files.append(arg)
        i += 1

    if not headers_files:
        print("usage: lint-headers.py [--paths-file <file>] <headers-file>...", file=sys.stderr)
        return 2

    representative_paths = (
        load_paths_file(paths_file) if paths_file is not None else DEFAULT_REPRESENTATIVE_PATHS
    )

    overall_ok = True
    for file_arg in headers_files:
        headers_path = Path(file_arg)
        if not headers_path.is_file():
            print(f"lint-headers: {headers_path}: not found", file=sys.stderr)
            return 2
        ok, report_text = lint_one_file(headers_path, representative_paths)
        print(report_text, end="")
        overall_ok = overall_ok and ok

    if not overall_ok:
        print(
            "lint-headers: FAIL -- at least one representative path would receive a duplicated "
            "header value from Cloudflare Pages (see FAIL lines above). Fix with '! Header-Name' "
            "detach directives or non-overlapping path patterns.",
            file=sys.stderr,
        )
        return 1
    print("lint-headers: PASS -- no path/header pair is set by two matching rules.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
