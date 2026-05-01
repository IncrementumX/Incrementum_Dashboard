# Seed Prompt for Claude Code (overnight Atlas build)

_Copy the block below and paste into Claude Code in VS Code after opening the `Incrementum` folder. This is the single prompt that kicks off the overnight build._

---

```
You are Claude Code running inside VS Code with the Incrementum repo open at
/Users/incrementum/Documents/Claude/Projects/Incrementum on branch feat/atlas.

Your job for this session is to execute the Atlas overnight build plan. The full
instructions are in Atlas/BUILD_PLAN.md — read that file IN FULL before touching
anything.

Before you start any execution:
1. Read Atlas/BUILD_PLAN.md completely.
2. Read Atlas/governance/CLAUDE.md completely.
3. Read Atlas/governance/AGENT_REGISTRY.yaml.
4. Read Atlas/governance/OPS.md, SOURCE_POLICY.md, FRESHNESS.md, WIKI_POLICY.md.
5. Read Atlas/skills/atlas-cio/SKILL.md, atlas-underwriter/SKILL.md, atlas-associate/SKILL.md.
6. Skim Atlas/wiki/principles/*.md.
7. Skim Atlas/wiki/positions/{besi,hii,agq}.md so you understand the template shape (do NOT fill them).

Hard rules for this overnight session:

- Do NOT fabricate investment data. No numbers, prices, thesis claims for BESI, HII, or AGQ.
  Those fields are Eduardo's to fill (PARO 3). Your job is infrastructure, not analysis.
- Do NOT push to GitHub. Commit to feat/atlas only. Eduardo merges in the morning.
- Do NOT modify governance files (Atlas/governance/*). They went through alignment.
- Do NOT merge to main under any circumstance.
- If you discover a governance contradiction, file it to Atlas/agents_context/issues.md
  as severity: blocker, and move on to the next priority. Don't get stuck.

Execute priorities in order as listed in BUILD_PLAN.md:
  1. git hygiene — clear stale lock, commit what's already staged, delete obsolete
     IncrementumOS_Build_Plan.md at repo root.
  2. vendor anthropic/financial-services-plugins as subtree.
  3. Claude Code agent teams config (.claude/config.yaml) + Atlas/README.md.
  4. dashboard /atlas tab (atlas-manifest.json builder + UI).
  5. atlas-briefing runner scaffold (no API keys — stub Perplexity branch).
  6. atlas-selftest.py + run it + fix flags.

Commit after each priority. Small, scoped commits. Every message prefixed with
feat(atlas): | chore(atlas): | fix(atlas):.

When done, append a summary section to Atlas/BUILD_PLAN.md under a
"## Completed overnight 2026-04-19" heading. List what shipped, what's open,
and any issues raised for Eduardo.

Work quietly until finished. Do not ask clarifying questions — if something is
ambiguous, pick the option that best aligns with the existing governance files
and document the call in the commit message. If you truly cannot proceed, file
to Atlas/agents_context/issues.md and skip to the next priority.

Start now.
```

---

## How to use this prompt

1. Install Claude Code in VS Code if not done (Extensions → search "Claude Code" → install Anthropic one).
2. Sign in to Claude Code with your Anthropic account.
3. File → Open Folder → `/Users/incrementum/Documents/Claude/Projects/Incrementum`.
4. Open the Claude Code panel.
5. Set approval mode to **Auto-approve all** (otherwise it will stop every 2 minutes asking you to confirm tool use).
6. Keep the Mac awake:
   - System Settings → Lock Screen → "Turn display off when inactive: Never"
   - Plug in to power
   - (Optional but safer) open Terminal and run: `caffeinate -dimsu` — leave that terminal open all night.
7. Copy the prompt block above (the text inside the fenced code block) into the Claude Code input and send.
8. Sleep.

In the morning: check `Atlas/BUILD_PLAN.md` bottom for the completion summary, skim new commits on `feat/atlas`, and triage anything in `Atlas/agents_context/issues.md`.

## If the pre-step (git lock) fails

Before starting Claude Code, run once in a terminal:
```
cd /Users/incrementum/Documents/Claude/Projects/Incrementum
rm -f .git/HEAD.lock .git/index.lock
git checkout feat/atlas
```

That resolves the stale lock from an earlier session. Claude Code can't clear it because the sandbox protects `.git/`; you do it natively in ~2 seconds.
