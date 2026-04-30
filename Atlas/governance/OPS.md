# Atlas — OPS.md
_How the system coordinates. Read at session start. Keep this concise and real._

## Source of truth

The **git repo** is the source of truth for system state. Specifically:
- `Atlas/wiki/**` — accumulated knowledge (Karpathy wiki pattern)
- `Atlas/agents_context/state.md` — lightweight index pointing into wiki
- `Atlas/agents_context/decisions.md` — append-only log of CIO verdicts
- `Atlas/work_queues/**` — what's queued, what's in flight, what's blocked

Anything in agent context windows that is not yet persisted to the repo is volatile and can be lost.

## Handoff pattern

CIO → Underwriter → Associate → back to CIO, via files:

1. CIO writes request into `work_queues/analysis.md` with a task ID.
2. Underwriter picks up, works, writes output into `wiki/**` (and optionally `reviews/`).
3. Underwriter dispatches Associate with a review request in `reviews/<task_id>-draft.md`.
4. Associate reviews, writes `reviews/<task_id>-review.md` with PASS or REJECT + issues.
5. If REJECT, Underwriter reworks and loops. If PASS, CIO reads and decides.
6. CIO writes verdict into `agents_context/decisions.md` and `wiki/decisions/<date>-<slug>.md`.

## Work queues

- `work_queues/briefing.md` — daily briefing queue (Perplexity when wired, manual meanwhile)
- `work_queues/analysis.md` — CIO-initiated deep work for Underwriter
- `work_queues/monitor.md` — thesis drift flags from atlas-monitor skill

Each entry: task_id, requested_by, requested_at, target, status, assigned_to.

## Parallelism

When CIO needs two independent pieces of work (e.g., "assess BESI" and "check HII trigger"), it dispatches in parallel. Orchestrator-worker pattern — Anthropic validated +90% quality vs single-agent on multi-hop research.

## Gates (human-in-the-loop)

Eduardo must explicitly approve before:
- Any Word / PPT / PDF output is finalized and named.
- Any push to `main` (all changes go through a PR).
- Any external channel send (email, Slack, Telegram) — not yet wired; when it is, the gate applies.
- Any change to `CLAUDE.md`, `SOURCE_POLICY.md`, `FRESHNESS.md`, `WIKI_POLICY.md`.
- Any new position or new thesis entering `wiki/positions/`.

Never bypass a gate. "Eduardo said X yesterday" is not a bypass — if in doubt, re-ask.

## Failure modes

- **Stale data:** every agent checks freshness before reasoning. See `FRESHNESS.md`.
- **Missing source tag:** Associate rejects. See `SOURCE_POLICY.md`.
- **Contradiction:** Associate logs to `wiki/contradictions/` and to `agents_context/contradictions.md`. CIO decides resolution.
- **Orphan page:** weekly lint finds it. Associate either links or deletes.
- **Lock on wiki file:** happens when two agents edit the same file concurrently. The later writer rebases on the earlier's version, via `git pull --rebase` then re-commit.

## Where each agent lives

| Agent | Host | When |
|---|---|---|
| CIO | OpenClaw on Mac 32GB | 24/7 |
| Underwriter | Claude Code on VS Code (primary, interactive) + OpenClaw (when CIO dispatches) | On-demand |
| Associate | Claude Code on VS Code | On-demand + weekly lint cron |

Eduardo's Dell is primary for his daily work — pulls the repo and reads everything there. The Mac is the always-on engine.

## What lives outside this repo

- Obsidian vault — just a **view layer** pointed at this same repo. Not a second source of truth. Plugins: Git, Dataview, Templater, Web Clipper, Marp.
- Dashboard (`incrementumx.github.io/Incrementum_Dashboard`) — static web view of state. Reads from the repo at build time.
- Models (xlsx) under `docs/models/` — versioned alongside wiki pages that cite them.
