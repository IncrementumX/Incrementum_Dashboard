# Atlas — Handoff (2026-04-22)

This file captures the exact state of the Atlas build at conversation handoff. If you (Eduardo or a new Claude session) are picking up the thread, read this first.

## Where we left off

We were about to write `incrementum-briefing`. All the architecture questions are resolved; the next tactical step is writing that one SKILL.md file.

## Decisions locked in this conversation

**Skills architecture — simplified.** One family of `incrementum-*` skills, stored in Eduardo's Anthropic account so they sync across Cowork / claude.ai / iOS / Android / Claude desktop. No separate `atlas-*` family in Cowork. Skills produce content only; they do NOT write to the filesystem. Agents (CIO/Underwriter in the Atlas project) are what decide where outputs are archived. This kills the earlier "bi-modal" complexity.

**Skills in scope (4 total).**
1. `incrementum-briefing` — NEW, write first.
2. `incrementum-snapshot` — exists; evolve later with kill-shots + source-tagging.
3. `incrementum-full-assessment` — exists; same evolution.
4. `incrementum-investment-memo` — exists; same evolution.

**Postponed.** `incrementum-monitor` (Eduardo: "mais pra frente" — waits for documented kill-shots on live positions). `incrementum-model` (DCF / comps / reverse-DCF — wait until Eduardo asks).

**Agent constitutions.** `atlas-cio`, `atlas-underwriter`, `atlas-associate` stay in `Atlas/skills/`. They are agents, not output skills. The Associate runs on **Gemini 2.5 Flash** (decision locked). Needs `GEMINI_API_KEY` in env.

## Briefing format (locked, ready to write)

Three blocks:

1. **Wrap-up (top, 4-5 lines).** Tape-language summary of the day. Macro deltas one-liner (DXY, UST 10Y, oil, gold, silver, DI curto BR, S&P futures — number + delta vs yesterday), plus the one narrative threading multiple sources today.

2. **Seção 1 — Notícias dos sites.** Top headlines per source. One headline + one line "why it matters" + link.
   - EN institucional: WSJ (Heard on the Street priority), Barron's, FT (Lex priority), Reuters, Bloomberg (only when Eduardo exports terminal digest).
   - BR: Valor (capa + coluna Broadcast), Estadão Economia, Pipeline, BrazilJournal, NeoFeed.

3. **Seção 2 — Portfolio + flags.**
   - **Posições vivas** — per ticker: direct news, peer/supplier/customer news. Tags: `cred: A/B/C/D`, `action: INFO | WATCH | FLAG | KILL-SHOT-RISK`. (Blocked until Eduardo sends portfolio.)
   - **Flags de temas** — Trump, energia (oil/gas/elétrico), fiscal americano, hard assets (ouro, prata, cobre, urânio). (These replaced the earlier AI capex / US defense / sovereign credit set.)

Footer: timestamp, author (Underwriter), sources consulted, sources that failed (transparency).

Save target path: `/Users/incrementum/.claude/skills/incrementum-briefing/SKILL.md` (same pattern as the 3 existing incrementum-* skills so it syncs to the Anthropic account).

## Pending from Eduardo (blockers for real usage)

1. **Portfolio composition.** Tickers + weights + type (equity/credit/hedge/cash) + one-line thesis per name. Free-text is fine. Needed to populate "Posições vivas" in briefing Seção 2 and all downstream skills.
2. **PARO 3.** BESI/HII/AGQ thesis, sizing, entry, kill-shots — fills `wiki/positions/*.md`. Deferred by Eduardo until architecture is closed.
3. **OpenClaw CIO deploy.** Terminal-level task on the Mac (32GB, 24/7).
4. **Push `feat/atlas` to GitHub.** 7 commits ahead of main on `feat/atlas`, no push yet. Eduardo opens PR when ready.

## Pending infra (I handle)

- Write `incrementum-briefing` SKILL.md (next step).
- Evolve the 3 existing `incrementum-*` skills with: mandatory kill-shots section, mandatory source-tagging `cred: A/B/C/D`. Do NOT rewrite — only add.
- Pre-commit hook: `python3 Atlas/scripts/atlas-selftest.py && node tools/build-atlas-manifest.js`.
- Perplexity API integration for briefing (sprint 2; Claude fallback stub already wired).
- Obsidian vault pointer into `wiki/`.
- Triage the untracked `.claude/` folder at repo root (separate from `Atlas/.claude/`).

## How to resume from a new conversation

Two paths:

**Short bootstrap (if memory is intact):** start the new conversation, say "retomando o Atlas build — le MEMORY.md e Atlas/HANDOFF.md primeiro." The memory index will load, this file will orient you, and you can continue.

**Full bootstrap (if memory didn't carry over, e.g. new machine):** start the new conversation with the text of this file pasted in as the first message, plus any specific ask.

## Key memory files (for context recall)

- `atlas_architecture.md` — 3-agent architecture, Karpathy wiki pattern
- `atlas_stack_decisions.md` — stack choices
- `atlas_skills_architecture.md` — the final simplified skills layout (this conversation)
- `atlas_briefing_spec.md` — exact briefing format (this conversation)
- `atlas_pending_decisions.md` — open asks, Gemini Flash locked as Associate
- `atlas_build_state.md` — infra state as of 2026-04-19

_Last updated: 2026-04-22_
