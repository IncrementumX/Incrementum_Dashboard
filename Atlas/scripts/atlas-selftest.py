#!/usr/bin/env python3
"""
Atlas/scripts/atlas-selftest.py
---------------------------------
Validates Atlas/ filesystem invariants before Eduardo's morning review.
Run from repo root.

Checks:
  1. Every folder under Atlas/skills/ has a SKILL.md.
  2. Every wiki page linked from Atlas/wiki/index.md exists on disk.
  3. Every position page has the 9 required sections (see SECTION_NAMES).
     (BUILD_PLAN.md says "8 sections" but lists 9 — we check all 9 listed.)
  4. No position page contains an unsourced number: a bare numeric pattern
     (e.g. "42%", "$1.2B", "€580M", "3.5x") not followed within ~120
     characters by a [src: ...] tag.  Template placeholders (<...>) and
     backtick-wrapped tokens are excluded.

Usage:
    python Atlas/scripts/atlas-selftest.py [--verbose]

Exit codes:
    0  All checks passed.
    1  One or more checks failed (issues printed to stdout).
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# ─── repo paths ───────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent.resolve()
ATLAS_ROOT = SCRIPT_DIR.parent
REPO_ROOT = ATLAS_ROOT.parent

SKILLS_DIR = ATLAS_ROOT / "skills"
WIKI_INDEX = ATLAS_ROOT / "wiki" / "index.md"
POSITIONS_DIR = ATLAS_ROOT / "wiki" / "positions"

# The 9 section headings every position page must have.
# (BUILD_PLAN.md says "8 required" but enumerates 9; we check all 9.)
SECTION_NAMES: list[str] = [
    "TL;DR",
    "Thesis",      # "## Thesis / Framing" in templates
    "Evidence",
    "Valuation",
    "Triggers",
    "Sizing",
    "Risks",
    "Related",
    "Log",
]

# Numeric patterns that must be accompanied by a source tag within ~120 chars.
# Matches things like: 42%, $1.2B, €580M, £30bn, 3.5x, 22%, 300bps
NUMERIC_PATTERN = re.compile(
    r"(?<![`<])"            # not preceded by backtick or angle-bracket
    r"(?:"
    r"(?:[\$€£¥₹])\s*\d[\d,.]*(?:\s*[BMKbmk](?:illion|n)?)?"   # $1.2B, €580M
    r"|"
    r"\d[\d,.]+\s*(?:bps|x|%)"                                   # 300bps, 3.5x, 22%
    r")",
    re.IGNORECASE,
)

# A source tag is [src: ...] or [src:...].
SOURCE_TAG_PATTERN = re.compile(r"\[src\s*:", re.IGNORECASE)

# Template placeholders that are NOT real data.
# E.g. `<x%>`, `<xx.xx>`, `<one sentence>` are safe.
PLACEHOLDER_PATTERN = re.compile(r"<[^>]{1,60}>")


# ─── check 1: SKILL.md presence ───────────────────────────────────────────────

def check_skill_files(verbose: bool) -> list[str]:
    """Return list of failure messages for skill folders missing SKILL.md."""
    issues: list[str] = []
    if not SKILLS_DIR.exists():
        return [f"FAIL [check1] skills directory not found: {SKILLS_DIR}"]

    for folder in sorted(SKILLS_DIR.iterdir()):
        if not folder.is_dir():
            continue
        skill_md = folder / "SKILL.md"
        if not skill_md.exists():
            issues.append(
                f"FAIL [check1] Missing SKILL.md in skills folder: {folder.name}"
            )
        elif verbose:
            print(f"  OK  [check1] {folder.name}/SKILL.md")

    return issues


# ─── check 2: wiki index links resolve ────────────────────────────────────────

def extract_wiki_links(index_content: str) -> list[tuple[str, str]]:
    """
    Return (display_text, path) tuples for markdown links in wiki/index.md.
    Only links that look like relative paths into the wiki/ tree.
    Absolute URLs and anchor-only links are skipped.
    """
    link_re = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
    results: list[tuple[str, str]] = []
    for m in link_re.finditer(index_content):
        text, href = m.group(1), m.group(2)
        # Skip anchors, absolute URLs, external
        if href.startswith("#") or href.startswith("http") or href.startswith(".."):
            continue
        results.append((text, href))
    return results


def check_wiki_index(verbose: bool) -> list[str]:
    """Return failure messages for linked wiki pages that don't exist."""
    issues: list[str] = []
    if not WIKI_INDEX.exists():
        return [f"FAIL [check2] wiki/index.md not found: {WIKI_INDEX}"]

    content = WIKI_INDEX.read_text(encoding="utf-8")
    links = extract_wiki_links(content)
    wiki_dir = ATLAS_ROOT / "wiki"

    for text, href in links:
        # href is relative to wiki/index.md, so resolve from wiki/
        target = (wiki_dir / href).resolve()
        if not target.exists():
            issues.append(
                f"FAIL [check2] Dead link in wiki/index.md: [{text}]({href}) → {target}"
            )
        elif verbose:
            rel = target.relative_to(REPO_ROOT)
            print(f"  OK  [check2] [{text}]({href}) → {rel}")

    return issues


# ─── check 3: position page sections ──────────────────────────────────────────

def check_position_sections(verbose: bool) -> list[str]:
    """Return failure messages for position pages missing required sections."""
    issues: list[str] = []
    if not POSITIONS_DIR.exists():
        return [f"FAIL [check3] positions directory not found: {POSITIONS_DIR}"]

    position_files = [
        f for f in sorted(POSITIONS_DIR.glob("*.md"))
        if f.name != ".gitkeep"
    ]

    if not position_files:
        if verbose:
            print("  --  [check3] No position files found (nothing to check).")
        return issues

    for pos_file in position_files:
        content = pos_file.read_text(encoding="utf-8")
        missing: list[str] = []
        for section in SECTION_NAMES:
            # Match "## <section>" with optional suffix (e.g. "## Thesis / Framing")
            pattern = re.compile(r"^##\s+" + re.escape(section), re.IGNORECASE | re.MULTILINE)
            if not pattern.search(content):
                missing.append(section)

        if missing:
            issues.append(
                f"FAIL [check3] {pos_file.name}: missing sections: {', '.join(missing)}"
            )
        elif verbose:
            print(f"  OK  [check3] {pos_file.name}: all {len(SECTION_NAMES)} sections present.")

    return issues


# ─── check 4: unsourced numbers in position pages ─────────────────────────────

def is_in_placeholder(text: str, match_start: int) -> bool:
    """True if the numeric match is inside a template placeholder `<...>`."""
    # Check the surrounding ~30 chars for angle-bracket wrapping
    window = text[max(0, match_start - 30): match_start + 30]
    return bool(PLACEHOLDER_PATTERN.search(window))


def is_in_backtick(text: str, match_start: int, match_end: int) -> bool:
    """True if the numeric match is inside a backtick-quoted span."""
    # Find the preceding backtick and check if it's still open
    before = text[max(0, match_start - 200): match_start]
    after = text[match_end: match_end + 200]
    return before.count("`") % 2 == 1 or after.count("`") % 2 == 1


def has_nearby_source_tag(text: str, match_end: int, lookahead: int = 180) -> bool:
    """True if a [src: ...] tag appears within `lookahead` chars after the match."""
    window = text[match_end: match_end + lookahead]
    return bool(SOURCE_TAG_PATTERN.search(window))


def check_unsourced_numbers(verbose: bool) -> list[str]:
    """
    Return failure messages for position pages that contain bare numeric
    patterns without an adjacent source tag.

    Exclusions:
    - Numbers inside template placeholders: `<x%>`, `<xx.xx>`, etc.
    - Numbers inside backtick spans.
    - Numbers in the ## Log section (historical notes, not claims).
    - Numbers in comment lines starting with '_' (italicised notes).
    """
    issues: list[str] = []
    if not POSITIONS_DIR.exists():
        return issues

    position_files = [
        f for f in sorted(POSITIONS_DIR.glob("*.md"))
        if f.name != ".gitkeep"
    ]

    for pos_file in position_files:
        content = pos_file.read_text(encoding="utf-8")

        # Strip out the ## Log section — historical notes are allowed bare numbers
        log_section_re = re.compile(r"^##\s+Log.*$", re.IGNORECASE | re.MULTILINE)
        log_match = log_section_re.search(content)
        check_content = content[: log_match.start()] if log_match else content

        flagged_lines: list[str] = []

        for m in NUMERIC_PATTERN.finditer(check_content):
            start, end = m.start(), m.end()
            matched_val = m.group(0)

            # Skip placeholders
            if is_in_placeholder(check_content, start):
                continue

            # Skip backtick-quoted spans
            if is_in_backtick(check_content, start, end):
                continue

            # Skip lines that are italicised notes (start with '_' after stripping)
            line_start = check_content.rfind("\n", 0, start) + 1
            line_text = check_content[line_start: check_content.find("\n", end)]
            if line_text.lstrip().startswith("_") and line_text.rstrip().endswith("_"):
                continue

            # Check for a source tag within the next 180 chars
            if not has_nearby_source_tag(check_content, end, lookahead=180):
                # Report once per line to avoid noise
                line_num = check_content[:start].count("\n") + 1
                snippet = line_text.strip()[:100]
                flag = f"  line {line_num}: '{matched_val}' — {snippet}"
                if flag not in flagged_lines:
                    flagged_lines.append(flag)

        if flagged_lines:
            issues.append(
                f"FAIL [check4] {pos_file.name}: potential unsourced numbers ({len(flagged_lines)}):"
            )
            for flag in flagged_lines[:10]:  # cap at 10 to avoid noise
                issues.append(f"       {flag}")
            if len(flagged_lines) > 10:
                issues.append(f"       … and {len(flagged_lines) - 10} more")
        elif verbose:
            print(f"  OK  [check4] {pos_file.name}: no unsourced numbers detected.")

    return issues


# ─── main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Atlas filesystem invariant validator.",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print passing checks too, not just failures.",
    )
    args = parser.parse_args()
    verbose: bool = args.verbose

    print("atlas-selftest — running checks…\n")

    all_issues: list[str] = []

    print("Check 1: skill folders have SKILL.md")
    issues = check_skill_files(verbose)
    all_issues.extend(issues)
    print(f"  → {len(issues)} issue(s)\n")

    print("Check 2: wiki/index.md links resolve")
    issues = check_wiki_index(verbose)
    all_issues.extend(issues)
    print(f"  → {len(issues)} issue(s)\n")

    print("Check 3: position pages have required sections")
    issues = check_position_sections(verbose)
    all_issues.extend(issues)
    print(f"  → {len(issues)} issue(s)\n")

    print("Check 4: no unsourced numbers in position pages")
    issues = check_unsourced_numbers(verbose)
    all_issues.extend(issues)
    print(f"  → {len(issues)} issue(s)\n")

    if all_issues:
        print("─" * 60)
        print(f"ISSUES ({len(all_issues)} total):")
        for issue in all_issues:
            print(issue)
        print("─" * 60)
        return 1
    else:
        print("All checks passed.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
