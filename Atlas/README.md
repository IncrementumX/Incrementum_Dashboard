# Atlas

Atlas is Incrementum's 3-agent investment research system. It turns raw information into conviction-weighted decisions the way a disciplined, Druckenmiller-style PM would — not to produce volume.

**Owner:** Eduardo (Incrementum). All position verdicts, policy changes, and pushes to `main` require his explicit approval.

---

## Agents

| Agent | Role | Model | Host |
|---|---|---|---|
| `atlas_cio` | Team lead. Makes PASS / WATCH / REJECT / HOLD verdicts. Orchestrates. | claude-opus-4-6 | OpenClaw on Mac (24/7) |
| `atlas_underwriter` | Deep research. Owns the 5 skills. Produces memos, wiki pages, models. | claude-opus-4-6 (memo) / claude-sonnet-4-6 (daily) | Claude Code VS Code + OpenClaw |
| `atlas_associate` | QA. Validates source tagging, quant sanity, weekly lint. Has veto power. | claude-haiku-4-5 | Claude Code VS Code |

There are exactly three agents. Never introduce a fourth without a governance change.

---

## How to launch (Agent Teams mode)

Requires **Claude Code v2.1.91+**.

```bash
# Set the flag before launching Claude Code
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Then open the repo in VS Code / start Claude Code CLI from the repo root
claude
```

The agent topology is declared in `Atlas/.claude/config.yaml`. Each agent loads its own `SKILL.md` at session start, then reads `governance/CLAUDE.md` and the files listed in `governance/CLAUDE.md §8`.

---

## Folder structure

```
Atlas/
  governance/           # Operating rules — do not edit without Eduardo's approval
    CLAUDE.md           # Keystone. Every agent reads this at session start.
    AGENT_REGISTRY.yaml # Model assignments, veto rules, coordination pattern.
    OPS.md              # Handoff flow: CIO → Underwriter → Associate → CIO.
    SOURCE_POLICY.md    # Source tagging rules. Associate enforces.
    FRESHNESS.md        # Revalidation cadence per data type.
    WIKI_POLICY.md      # Ingest / Query / Lint operations.
  skills/               # Agent + skill definitions (SKILL.md per folder)
    atlas-cio/
    atlas-underwriter/
    atlas-associate/
    atlas-briefing/
    atlas-snapshot/
    atlas-assessment/
    atlas-model/
    atlas-monitor/
  wiki/                 # LLM-maintained knowledge base (Karpathy wiki pattern)
    index.md            # Content catalog — every wiki page is linked from here
    log.md              # Append-only operation log
    positions/          # Active theses: besi.md, hii.md, agq.md
    principles/         # Druckenmiller doctrine, source hierarchy, kill-shot, etc.
    ...
  raw/                  # Immutable source collection — never edit, only append
    filings/
    research/
    news/
    transcripts/
    briefings/
  agents_context/       # Lightweight live-state layer
    state.md            # What's live right now
    decisions.md        # CIO verdict log
    issues.md           # Open issues
  work_queues/          # Task dispatch (briefing, analysis, monitor)
  reviews/              # Underwriter ↔ Associate review artifacts
  vendor/               # Vendored third-party plugins (git subtree)
    financial-services-plugins/   # anthropics/financial-services-plugins
    README.md           # Vendor inventory and upgrade instructions
  scripts/              # Automation scripts
    atlas-briefing.py   # Daily briefing runner
    atlas-selftest.py   # Filesystem invariant validator
    README.md           # Cron setup instructions
  .claude/
    config.yaml         # Agent Teams topology declaration
```

---

## Key env vars

| Var | Value | Purpose |
|---|---|---|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | `1` | Enables multi-agent dispatch. Required for the 3-agent structure to activate. |
| `PERPLEXITY_API_KEY` | your key | Optional. Enables the Perplexity branch of `atlas-briefing.py`. Without it, the script falls back to Claude's own web search. |

---

## Governance

**What requires Eduardo's explicit approval:**
- Any push to `main` (all work goes through PRs on `feat/*`).
- Any new position or thesis entering `wiki/positions/`.
- Any change to files in `governance/`.
- Any external channel send (email, Slack, Telegram) once wired.
- Any Word / PPT / PDF output finalized for distribution.

**What agents do autonomously:**
- Ingest raw sources into `wiki/` with source tags.
- Run the daily briefing and monitor skills.
- Run weekly lint (Associate).
- Draft assessments and memos for CIO review.
- Open issues in `agents_context/issues.md`.

---

## Running the self-test

```bash
cd /path/to/Incrementum
python Atlas/scripts/atlas-selftest.py
```

Expected output: `All checks passed.` or a list of issues to fix before Eduardo's morning review.

---

## Running the briefing scaffold (once PERPLEXITY_API_KEY lands)

```bash
# With Perplexity:
export PERPLEXITY_API_KEY=your_key
python Atlas/scripts/atlas-briefing.py

# Without (falls back to Claude web search):
python Atlas/scripts/atlas-briefing.py
```

Output goes to `Atlas/wiki/summaries/YYYY-MM-DD-briefing.md` and a line is appended to `Atlas/wiki/log.md`.

---

## Current status (as of 2026-04-19)

- P1: Governance, 8 SKILL.md files, 5 principles, 3 position templates — **done** (commit 3079c47).
- P2: Vendor `anthropics/financial-services-plugins` — **done** (commit 675d678).
- P3: Agent Teams config + this README — **done** (this commit).
- P4–P6: Dashboard tab, briefing scaffold, self-test — in progress this session.
- PARO 3: Eduardo fills BESI/HII/AGQ thesis, sizing, kill-shots — **pending Eduardo**.

---

_Atlas is built on the Karpathy LLM Wiki pattern. Memory is markdown in git — portable across any LLM, readable by Obsidian, renderable by the dashboard._
