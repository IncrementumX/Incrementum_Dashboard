# Atlas — BUILD_PLAN.md

_Overnight build plan. Intended to be read by Claude Code after Eduardo hands off. Written 2026-04-18 by Atlas Cowork agent. Assume the reader is Claude Code in VS Code with the Incrementum repo open at `/Users/incrementum/Documents/Claude/Projects/Incrementum` on branch `feat/atlas`._

## Your identity in this build

You are Claude Code running inside VS Code. You are the execution layer. The three Atlas agents (CIO / Underwriter / Associate) are architectural roles defined in `Atlas/skills/atlas-<agent>/SKILL.md` — when this build is deployed, those roles will be separately instantiated via the Agent Teams flag or via OpenClaw. For this overnight build pass, **YOU are doing the Underwriter's work of implementing the skaffolding**. You are not performing investment research. You are building the system.

## What is already done (read these first)

Before touching anything:

1. Read `Atlas/governance/CLAUDE.md` — keystone file. If anything you're about to do conflicts with it, stop.
2. Read `Atlas/governance/AGENT_REGISTRY.yaml` — model assignments, veto rules, coordination pattern.
3. Read `Atlas/governance/OPS.md` — handoff flow.
4. Read `Atlas/governance/SOURCE_POLICY.md` — A/B/C/D tagging.
5. Read `Atlas/governance/FRESHNESS.md` — revalidation cadence.
6. Read `Atlas/governance/WIKI_POLICY.md` — ingest/query/lint operations.
7. Read `Atlas/skills/atlas-cio/SKILL.md` — "alma" of the CIO.
8. Read `Atlas/skills/atlas-underwriter/SKILL.md` and `atlas-associate/SKILL.md`.
9. Read `Atlas/wiki/principles/*.md` — Druckenmiller, source, kill-shot, cadence, open harness.
10. Glance at `Atlas/wiki/positions/{besi,hii,agq}.md` — templates only. The thesis + sizing fields are blank on purpose. Do NOT fill them. That is Eduardo's PARO 3.

## What you are NOT doing tonight

- **NOT writing thesis content for BESI/HII/AGQ.** Templates are seeded. Eduardo fills the numbers. Filling them yourself = fabrication = catastrophic.
- **NOT running investment research.** No live analysis of any ticker tonight. Infra only.
- **NOT merging to main.** Commit to `feat/atlas`. Eduardo opens the PR.
- **NOT modifying governance files.** Those went through alignment. Amendments = Eduardo-approved.

## What you ARE doing tonight (ordered by priority)

### Priority 1 — git hygiene (first 10 min)

1. Clear stale lock: `rm /Users/incrementum/Documents/Claude/Projects/Incrementum/.git/HEAD.lock` if it still exists.
2. Confirm branch: `git branch --show-current`. Expected: `feat/atlas` (or switch to it; it exists already).
3. `git status` — expect `Atlas/` as untracked or modified, `IncrementumOS_Build_Plan.md` (old) at root.
4. `git add Atlas/`
5. `git commit -m "feat(atlas): complete PARO 2 — 8 SKILL.md files, 5 principles, position templates"`
6. Delete the old `IncrementumOS_Build_Plan.md` at repo root (`git rm IncrementumOS_Build_Plan.md`) — replaced by `Atlas/BUILD_PLAN.md` which is versioned inside the Atlas folder. Commit separately.
7. Do NOT push yet. Eduardo approves pushes.

### Priority 2 — integrate anthropic/financial-services-plugins (1-2 hrs)

Ref: `Atlas/skills/atlas-model/SKILL.md` lists this as the base layer for all numeric work.

1. Clone into `Atlas/vendor/financial-services-plugins/` as a subtree (preferred over submodule — keeps content inline for `qmd` indexing later):
   ```
   git subtree add --prefix=Atlas/vendor/financial-services-plugins \
     https://github.com/anthropics/financial-services-plugins.git main --squash
   ```
2. If subtree fails (empty repo, access, etc.), fall back to: clone into a temp dir, copy the plugin folders into `Atlas/vendor/financial-services-plugins/`, commit.
3. Write `Atlas/vendor/README.md` documenting: why this is here, what gets pulled in, how `atlas-model` invokes it, how to upgrade (periodic re-sync).
4. Update `Atlas/skills/atlas-model/SKILL.md` with concrete references to the vendored path.
5. Commit: `feat(atlas): vendor anthropic/financial-services-plugins`.

### Priority 3 — Agent Teams config (30 min)

Ref: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` on Claude Code v2.1.91+ enables the 3-agent structure.

1. Create `Atlas/.claude/config.yaml` (or whatever the current Claude Code v2.1.91+ config format is — check latest docs at docs.claude.com/claude-code).
2. Declare the 3 agents by referencing their `SKILL.md` files.
3. Declare the Underwriter's 5 skills.
4. Document the env var requirement in `Atlas/README.md` (write a README for Atlas itself — separate from the repo-root README).
5. Commit: `feat(atlas): agent teams config + Atlas README`.

### Priority 4 — dashboard `/atlas` tab (2-3 hrs)

Ref: `incrementumos_architecture.md` memory — light palette (#FAFAF7 bg, #0F1A2E text, #6889B4 accent, #70757C support gray), agent state cards, work queue viewer, decisions log, activity feed.

The existing dashboard lives at repo root (`index.html`, `app.js`, `styles.css`). Add an `/atlas` route/tab without breaking the existing experience.

1. Add a nav entry to `index.html` or wherever the tab structure lives.
2. Build an `atlas.html` (or equivalent component depending on the existing architecture — inspect `app.js` to see what pattern is in use).
3. Data: the tab reads the filesystem (or a built JSON manifest) derived from:
   - `Atlas/agents_context/state.md` → positions, pending tasks.
   - `Atlas/work_queues/*.md` → queues.
   - `Atlas/wiki/log.md` → recent activity.
   - `Atlas/agents_context/decisions.md` → decisions.
4. Since the dashboard is a static site (GitHub Pages per the repo structure), you may need a build step that parses `Atlas/` into a JSON manifest the page loads. Write `tools/build-atlas-manifest.js` to produce `atlas-manifest.json`.
5. Style per the light palette. No dark mode tonight.
6. Commit in stages — manifest builder first, then tab UI.

### Priority 5 — atlas-briefing runner scaffold (1 hr)

Ref: `Atlas/skills/atlas-briefing/SKILL.md`. Perplexity Agent API is postponed to sprint 2 — tonight just scaffold the runner so it's ready for when the API key lands.

1. Create `Atlas/scripts/atlas-briefing.py` (or .ts — pick based on existing repo patterns).
2. Structure:
   - Read `Atlas/work_queues/briefing.md` for target list.
   - `if os.environ.get('PERPLEXITY_API_KEY'):` use Perplexity branch (stub — raise NotImplemented but leave clean interface).
   - `else:` use `atlas-briefing/claude-fallback.md` instructions — a prompt template Claude Code can run via its own web-search-capable model.
   - Write output to `Atlas/wiki/summaries/<YYYY-MM-DD>-briefing.md`.
   - Append to `wiki/log.md`.
3. Add a simple cron snippet to `Atlas/scripts/README.md` showing how to schedule it on Mac (launchd or crontab) for when Eduardo deploys to OpenClaw.
4. Do NOT run it tonight. Just the scaffold.

### Priority 6 — telemetry & self-test (30 min)

1. Write `Atlas/scripts/atlas-selftest.py` that validates the filesystem invariants:
   - Every skill folder has a SKILL.md.
   - Every wiki page linked from `wiki/index.md` exists.
   - Every position page has the 8 required sections (TL;DR, Thesis, Evidence, Valuation, Triggers, Sizing, Risks, Related, Log).
   - No position page has a fabricated number (heuristic: look for patterns like `\d+%` or `\$\d+` without an adjacent source tag).
2. Run it. Fix anything it flags. Commit.

## If you get stuck

- **If you discover a governance contradiction:** stop, file to `Atlas/agents_context/issues.md` with `Severity: blocker`, skip to the next priority, flag for Eduardo's morning review.
- **If a URL or repo you need isn't accessible:** don't fabricate content. Stub the integration with a clear TODO comment referencing `agents_context/issues.md`.
- **If you're about to write anything speculative about BESI/HII/AGQ:** STOP. Those are Eduardo's. Your job tonight is infra, not analysis.
- **If `anthropic/financial-services-plugins` doesn't exist or is private:** commit a stub `vendor/financial-services-plugins/README.md` explaining what would go there. Flag in issues.

## Commit discipline

- Small, scoped commits. One commit per priority block, or per logical sub-step.
- Every commit message starts with `feat(atlas):`, `chore(atlas):`, or `fix(atlas):`.
- No force-pushes, no history rewrites.
- All work on `feat/atlas`.

## When you're done

1. Append to `Atlas/wiki/log.md` a summary of what you built tonight.
2. Update `Atlas/BUILD_PLAN.md` (this file) by appending a `## Completed overnight 2026-04-19` section listing what actually shipped vs what's still open.
3. Commit.
4. Leave the CLI idle. Do NOT push to GitHub. Eduardo merges.

## Morning handoff note to Eduardo

Include in the final log entry:
- "X of 6 priorities shipped."
- Any issues filed to `agents_context/issues.md` that need his attention.
- Reminder: PARO 3 is still his — seed the BESI/HII/AGQ thesis + sizing + kill-shots.

---

Good work. Build clean.

— Atlas Cowork agent, handing off to Claude Code at 2026-04-18.
