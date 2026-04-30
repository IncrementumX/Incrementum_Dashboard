#!/usr/bin/env python3
"""
Atlas/scripts/atlas-briefing.py
--------------------------------
Daily briefing runner for the Atlas investment research system.

Usage:
    python Atlas/scripts/atlas-briefing.py [--date YYYY-MM-DD] [--dry-run]

Options:
    --date YYYY-MM-DD   Override the run date (default: today).
    --dry-run           Print the prompt and output path but do not write files.

Behaviour:
    If PERPLEXITY_API_KEY is set  → Perplexity branch (raises NotImplementedError;
                                     clean interface ready for sprint 2 wiring).
    Otherwise                     → Claude fallback branch: loads
                                     Atlas/skills/atlas-briefing/claude-fallback.md,
                                     constructs the prompt, calls the Anthropic SDK
                                     (requires ANTHROPIC_API_KEY), writes output.

Output:
    Atlas/wiki/summaries/<YYYY-MM-DD>-briefing.md
    Appends one line to Atlas/wiki/log.md.

Do NOT run this script during the overnight build pass — it requires live network
access and API keys. This file is scaffold only.
"""

from __future__ import annotations

import argparse
import os
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo  # Python 3.9+

# ─── repo paths ───────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent.resolve()
ATLAS_ROOT = SCRIPT_DIR.parent
REPO_ROOT = ATLAS_ROOT.parent

BRIEFING_QUEUE = ATLAS_ROOT / "work_queues" / "briefing.md"
STATE_FILE = ATLAS_ROOT / "agents_context" / "state.md"
FALLBACK_TEMPLATE = ATLAS_ROOT / "skills" / "atlas-briefing" / "claude-fallback.md"
SUMMARIES_DIR = ATLAS_ROOT / "wiki" / "summaries"
LOG_FILE = ATLAS_ROOT / "wiki" / "log.md"

SAO_PAULO_TZ = ZoneInfo("America/Sao_Paulo")

# ─── task id ──────────────────────────────────────────────────────────────────

def make_task_id(date_str: str) -> str:
    return f"briefing-{date_str}"


# ─── target list parsing ──────────────────────────────────────────────────────

def parse_target_list() -> str:
    """
    Build the target list from work_queues/briefing.md and agents_context/state.md.
    Returns a plain-text block suitable for embedding in a prompt.
    """
    lines: list[str] = []

    # Standing list from briefing.md
    try:
        content = BRIEFING_QUEUE.read_text(encoding="utf-8")
        in_section = False
        for line in content.splitlines():
            if "## Standing target list" in line:
                in_section = True
                continue
            if in_section:
                if line.startswith("##"):
                    break
                if line.strip():
                    lines.append(line.strip())
    except FileNotFoundError:
        lines.append("BESI, HII, AGQ  (default — briefing.md not found)")

    # Watchlist additions from state.md (best-effort)
    try:
        state = STATE_FILE.read_text(encoding="utf-8")
        watchlist_section = False
        for line in state.splitlines():
            if "watchlist" in line.lower() and line.startswith("#"):
                watchlist_section = True
                continue
            if watchlist_section:
                if line.startswith("#"):
                    break
                if line.strip().startswith("-"):
                    lines.append(line.strip())
    except FileNotFoundError:
        pass

    return "\n".join(lines) if lines else "BESI, HII, AGQ"


# ─── perplexity branch ────────────────────────────────────────────────────────

def run_perplexity_branch(date_str: str, target_list: str) -> str:
    """
    Perplexity Agent API branch.

    THIS IS A STUB — sprint 2 implementation.

    When PERPLEXITY_API_KEY is present, this function should:
    1. Import the `openai`-compatible Perplexity client.
    2. Fire one query per target (ticker / theme) using the `sonar` model.
    3. Collect citations and validate each against SOURCE_POLICY.md cred tiers.
    4. Assemble the briefing markdown using the same structure as the
       claude-fallback.md template.
    5. Return the assembled markdown string.

    Interface contract (do not change — this is what atlas-briefing.py calls):
        result: str = run_perplexity_branch(date_str, target_list)

    See Atlas/governance/SOURCE_POLICY.md §2 for cred-tier assignment:
    - Perplexity output without a traceable primary URL → D-cred.
    - Validated primary URL (A/B/C tier) → use the primary as src, not Perplexity.
    """
    raise NotImplementedError(
        "Perplexity branch is not yet implemented (sprint 2). "
        "PERPLEXITY_API_KEY is set but the integration is scaffolded only. "
        "Unset PERPLEXITY_API_KEY to fall back to the Claude branch, or "
        "implement this function when the Perplexity API key is approved."
    )


# ─── claude fallback branch ───────────────────────────────────────────────────

def run_claude_branch(date_str: str, target_list: str, dry_run: bool = False) -> str:
    """
    Claude fallback branch.

    Loads Atlas/skills/atlas-briefing/claude-fallback.md to get the prompt
    template, substitutes date / time / target_list, then calls the Anthropic
    SDK claude-sonnet model (per AGENT_REGISTRY.yaml: Underwriter uses Sonnet
    for briefing/monitor tasks).

    Requires ANTHROPIC_API_KEY in the environment.
    """
    if not FALLBACK_TEMPLATE.exists():
        raise FileNotFoundError(
            f"Fallback template not found: {FALLBACK_TEMPLATE}\n"
            "Expected at Atlas/skills/atlas-briefing/claude-fallback.md"
        )

    template_text = FALLBACK_TEMPLATE.read_text(encoding="utf-8")

    # Extract the user prompt block (between the triple-backtick fences)
    import re
    match = re.search(r"```\n([\s\S]+?)\n```", template_text)
    if not match:
        raise ValueError(
            "Could not find the user-prompt template block in claude-fallback.md. "
            "Expected a fenced code block (``` ... ```) containing the user prompt."
        )
    user_prompt_template = match.group(1)

    # Extract system prompt (section after "## System prompt (paste as-is)")
    sys_match = re.search(
        r"## System prompt \(paste as-is\)\s*\n([\s\S]+?)(?=\n---|\n##)",
        template_text,
    )
    system_prompt = sys_match.group(1).strip() if sys_match else (
        "You are the Atlas Underwriter for Incrementum. Follow SOURCE_POLICY.md."
    )

    now_sp = datetime.now(SAO_PAULO_TZ)
    time_str = now_sp.strftime("%H:%M")

    user_prompt = (
        user_prompt_template
        .replace("{date}", date_str)
        .replace("{time}", time_str)
        .replace("{target_list}", target_list)
    )

    if dry_run:
        print("=== DRY RUN — system prompt ===")
        print(system_prompt[:400], "…" if len(system_prompt) > 400 else "")
        print("\n=== DRY RUN — user prompt (first 600 chars) ===")
        print(user_prompt[:600], "…" if len(user_prompt) > 600 else "")
        return f"# Briefing — {date_str}\n\n_DRY RUN — no API call made._\n"

    # Check for API key before importing
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY not set. Export it before running atlas-briefing.py, "
            "or use --dry-run to preview the prompt without making an API call."
        )

    try:
        import anthropic  # type: ignore[import]
    except ImportError:
        raise ImportError(
            "anthropic SDK not installed. Run: pip install anthropic\n"
            "Or: pip install -r Atlas/scripts/requirements.txt"
        )

    client = anthropic.Anthropic(api_key=api_key)
    print(f"Calling Claude (claude-sonnet-4-6) for {date_str} briefing…", flush=True)

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    return message.content[0].text


# ─── write output ─────────────────────────────────────────────────────────────

def write_briefing(date_str: str, content: str, dry_run: bool = False) -> Path:
    """Write briefing to wiki/summaries/<date>-briefing.md. Returns the path."""
    out_path = SUMMARIES_DIR / f"{date_str}-briefing.md"
    if dry_run:
        print(f"\n=== DRY RUN — would write to: {out_path} ===")
        return out_path

    SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")
    print(f"Briefing written → {out_path}")
    return out_path


def append_log(date_str: str, task_id: str, out_path: Path, dry_run: bool = False) -> None:
    """Append one INGEST line to wiki/log.md."""
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    rel_path = out_path.relative_to(ATLAS_ROOT)
    log_line = f"INGEST {now_utc} {task_id} briefing-{date_str} -> {rel_path} + monitor flags (0)\n"

    if dry_run:
        print(f"\n=== DRY RUN — would append to wiki/log.md ===\n{log_line}")
        return

    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(log_line)
    print(f"Log appended → {LOG_FILE}")


# ─── main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Atlas daily briefing runner.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
            Examples:
              python Atlas/scripts/atlas-briefing.py
              python Atlas/scripts/atlas-briefing.py --dry-run
              python Atlas/scripts/atlas-briefing.py --date 2026-04-20

            Environment variables:
              PERPLEXITY_API_KEY   If set, uses Perplexity branch (sprint 2 stub).
              ANTHROPIC_API_KEY    Required for Claude fallback branch.
        """),
    )
    parser.add_argument(
        "--date",
        default=datetime.now(SAO_PAULO_TZ).strftime("%Y-%m-%d"),
        help="Override run date (YYYY-MM-DD). Default: today in America/Sao_Paulo.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print prompt and output path; do not write files or call APIs.",
    )
    args = parser.parse_args()

    date_str: str = args.date
    dry_run: bool = args.dry_run
    task_id = make_task_id(date_str)

    print(f"atlas-briefing — date={date_str} dry_run={dry_run} task={task_id}")

    target_list = parse_target_list()
    print(f"Target list:\n{target_list}\n")

    perplexity_key = os.environ.get("PERPLEXITY_API_KEY")

    try:
        if perplexity_key:
            print("PERPLEXITY_API_KEY detected — using Perplexity branch.")
            content = run_perplexity_branch(date_str, target_list)
        else:
            print("No PERPLEXITY_API_KEY — using Claude fallback branch.")
            content = run_claude_branch(date_str, target_list, dry_run=dry_run)
    except NotImplementedError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except (FileNotFoundError, ValueError, EnvironmentError, ImportError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    out_path = write_briefing(date_str, content, dry_run=dry_run)
    append_log(date_str, task_id, out_path, dry_run=dry_run)

    if not dry_run:
        print(f"\nDone. Briefing at: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
