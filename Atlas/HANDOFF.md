# Atlas — Handoff (2026-04-23)

This file captures the exact state of the Atlas build at conversation handoff. If you (Eduardo or a new Claude session) are picking up the thread, read this first.

## Where we left off

Dashboard redesign planned. All decisions locked. Ready to execute. No code changes made yet — Eduardo asked for suggestions first, approved them, then asked to save context before continuing.

## Decisions locked in this conversation (2026-04-23)

### Dashboard Redesign

**Tab structure — 3 tabs:**

1. **Book** (replaces "Dashboard" + "Summary Returns" + "Transactions")
   - Portfolio positions including **options/PUTs** (currently broken — PUTs don't show)
   - P&L, allocation, NAV
   - Attribution by asset (from old Summary Returns — DO NOT lose this)
   - Transaction history (from old Transactions tab — keep the ledger view)
   - **Remove** the manual "Add Transaction" form (Eduardo never used it)
   - IBKR import stays

2. **Atlas** (cockpit — replaces the current metadata-only Atlas tab)
   - Briefing do dia (renders `incrementum-briefing` output) at the top
   - Active theme flags (Trump, energia, fiscal americano, hard assets) with visual status
   - Position notes from wiki (ticker + thesis + kill-shots)
   - Agent activity log

3. **Scout** (stays — with automatic data refresh)
   - Keep all functionality (macro regime, relative value, strategy lab)
   - Fix GitHub Actions: `FRED_API_KEY` needs to be added as a repository secret
   - Data is 21 days stale (last refresh: 2026-04-02) — workflow configured but never ran
   - Scout data sanity check: code is solid, no hardcoded dates, defensive fallbacks

**Theme:** Light / minimalist. Replace dark glassmorphism (#11151c bg) with white/off-white, clean borders, strong typography (keep DM Sans). Bloomberg Terminal meets Notion — dense info, visually light.

**PUTs / Options fix:** Current model treats everything as equity (shares × price). Needs:
- Instrument type field (equity vs option)
- Strike, expiry, contract multiplier (100)
- Market value = contracts × price × multiplier
- P&L considering premium paid

### Skills architecture (from 2026-04-22 — unchanged)

One family of `incrementum-*` skills, stored in Eduardo's Anthropic account. Skills produce content only; they do NOT write to the filesystem. Agents (CIO/Underwriter) decide where outputs are archived.

**Skills in scope (4 total):**
1. `incrementum-briefing` — DONE (268 lines, fully spec'd)
2. `incrementum-snapshot` — exists; evolve later with kill-shots + source-tagging
3. `incrementum-full-assessment` — exists; same evolution
4. `incrementum-investment-memo` — exists; same evolution

**Postponed:** `incrementum-monitor`, `incrementum-model` — wait until Eduardo asks.

**Agent constitutions:** `atlas-cio`, `atlas-underwriter`, `atlas-associate` stay in `Atlas/skills/`. Associate runs on Gemini 2.5 Flash.

## Portfolio Context

**Two fronts:**
1. **Hard Assets** — Gold, silver, copper, uranium. Thesis: USD weakening + fiscal deterioration + inflation + central bank buying + supply deficits across all four commodities.
2. **AI Era Winners** — Details TBD from Eduardo.

**Eduardo has PUTs in the book that don't appear in the dashboard.** This is a priority fix.

### Thesis source files (on Eduardo's machine — NOT in the repo)

- `C:\Users\eduar\OneDrive\Incrementum\Incrementum Book\Macro Thoughts\Incrementum (Macro Thoughts) - 2025 12 15.docx` — Main hard assets thesis (gold, silver, copper, uranium). 30+ pages covering US fiscal problem, dollar weakening, gold as NPSOV, silver industrial demand + undervaluation, copper electrification, uranium nuclear energy. Written Sep-Dec 2025. Eduardo says it's **outdated** but provides the foundational logic.
- `C:\Users\eduar\OneDrive\Incrementum\Incrementum Book\Macro Thoughts\Macro Thoughts - 2025 10 12.docx` — Earlier version of the same thesis.
- `C:\Users\eduar\OneDrive\Incrementum\Templates\Incrementum Investment Framework.docx` — Comprehensive company analysis template (P&L, balance sheet, cash flow, governance, valuation, credit framework, industry assessment).
- `C:\Users\eduar\OneDrive\Incrementum\Templates\Incrementum Fundamentals.docx` — Company fundamentals template.
- `C:\Users\eduar\OneDrive\Incrementum\Templates\XLS\` — Model templates (Avibras, BRAX, Incrementum Model Template).

### Key thesis pillars (from Macro Thoughts Dec 2025)

**Gold:** NPSOV, hedge against USD fiscal risk, central bank buying (gold > treasuries in reserves for first time since 1996), production flat, "gold wins either way" in US fiscal dilemma. Downside risk: deflationary AI boom that pulls US out of debt spiral.

**Silver:** Correlated with gold but more convex, undervalued relative to gold (ratio), structural supply deficit, industrial demand (solar panels, EV batteries, electronics).

**Copper:** Electrification of emerging economies + energy transition, China = 50% of demand, few new mining projects (>10 year ramp-up), supply deficit projected.

**Uranium:** Nuclear energy growth (440 reactors operating, 60 under construction), demand 175mm lbs/yr vs production 150mm lbs, 40% enrichment capacity in Russia, utilities uncovered post-2026 contracts, possible "panic buying" 2026-27. Price insensitive buyers.

**Macro backdrop:** US debt/GDP 120%, deficit >6% GDP, debt spiral (interest cost > nominal growth), Fed constrained (can't hike like Volcker — debt/GDP was 30% in 1979), Powell mandate ends May 2026 → dovish replacement possible, DXY weakening, yield curve steepening.

## Pending from Eduardo (blockers)

1. **Portfolio composition.** Tickers + weights + type (equity/credit/option/hedge/cash) + thesis per name. **Including the PUTs.**
2. **AI Era Winners** front — tickers and thesis. Eduardo mentioned this is the second front but hasn't shared details.
3. **PARO 3.** BESI/HII/AGQ thesis, sizing, entry, kill-shots.
4. **OpenClaw CIO deploy.** Terminal-level task on the Mac.
5. **Push `feat/atlas` to GitHub.** Eduardo opens PR when ready.
6. **Financial dataset** — Eduardo just installed it on his Claude. Integration TBD.

## Pending infra (I handle — next conversation)

- [ ] **Dashboard redesign:** Book tab + Atlas cockpit tab + theme light/minimalist
- [ ] **PUTs/options in portfolio:** Fix data model + rendering
- [ ] **Scout auto-refresh:** Add `FRED_API_KEY` as GitHub repo secret, verify workflow runs
- [ ] Evolve 3 existing `incrementum-*` skills with kill-shots + source-tagging (deferred — Eduardo said "não agora")
- [ ] Pre-commit hook: `python3 Atlas/scripts/atlas-selftest.py && node tools/build-atlas-manifest.js`
- [ ] Perplexity API integration (sprint 2)
- [ ] Obsidian vault pointer into `wiki/`
- [ ] Triage untracked `.claude/` at repo root

## Context preservation concern

Eduardo is frustrated that Claude chat loses context between conversations. The dashboard redesign addresses this — the Atlas tab becomes the cockpit where briefings, position notes, and agent outputs are visualized. The wiki (`Atlas/wiki/`) is the persistence layer. Long-term: Claude chat should ask "salvo isso na wiki?" after producing analysis — requires project instructions on claude.ai.

## How to resume

Start the new conversation, say: **"retomando o dashboard redesign — le Atlas/HANDOFF.md primeiro."**

Then execute the pending infra checklist above, starting with the dashboard redesign (theme + tabs + PUTs fix).

## Key memory files

- `atlas_architecture.md` — 3-agent architecture, Karpathy wiki pattern
- `atlas_stack_decisions.md` — stack choices
- `atlas_skills_architecture.md` — final simplified skills layout
- `atlas_briefing_spec.md` — exact briefing format
- `atlas_pending_decisions.md` — open asks, Gemini Flash locked as Associate
- `atlas_build_state.md` — infra state as of 2026-04-19

_Last updated: 2026-04-23_
