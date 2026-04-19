# Open Harness, Open Memory

_Harrison Chase's principle (April 2026), adopted verbatim by Atlas. The memory system and the agent harness are both portable — neither is locked to a single model or a single runtime._

## The principle

An AI-first research operation should be buildable, migratable, and auditable without requiring a specific LLM provider or a specific orchestration framework. Two decoupled commitments:

**Open harness.** The orchestration layer (how agents talk to each other, how work queues are dispatched, how skills are invoked) is specified in plain-text configuration (`AGENT_REGISTRY.yaml`, `OPS.md`, skill folders). Any harness that can read filesystem + call an LLM API can run Atlas. Today that harness is Claude Code + OpenClaw. Tomorrow it could be a custom Python runner, or a different vendor's agent platform.

**Open memory.** The durable artifacts (wiki pages, raw sources, decisions log, work queues, agent context) are plain markdown + plain data files, version-controlled in git. No vector DB that only one vendor's SDK can read. No proprietary notebook format. No closed-API-only knowledge graph. If Atlas needed to migrate from Claude to Gemini/Llama tomorrow, the wiki, the decisions, the principles, the governance — all of it comes along.

## Why this matters

Vendor lock-in in AI is the new SaaS lock-in. Every model provider would prefer you to keep your memory inside their ecosystem — their long-context windows, their retrieval APIs, their fine-tuning endpoints. The moment your operation depends on that infrastructure, migrating costs exponentially more than staying.

For a research operation meant to accumulate over years, this is catastrophic. The wiki in year 3 is the single most valuable asset Atlas produces. It cannot be held hostage to a model provider's pricing schedule or API deprecation cycle.

## What this means operationally

### For memory

- Everything durable goes to `wiki/` as markdown.
- `raw/` holds source files (PDFs, HTML snapshots, transcripts) as files, not as embeddings.
- `agents_context/` is plain text.
- `governance/` is plain text.
- `work_queues/` is plain text.
- All committed to git.
- If a vector index becomes useful (via `qmd` MCP), it is an index OVER the markdown, not a replacement for it. Drop the index → rebuild from markdown.

### For harness

- Each agent's identity lives in `skills/atlas-<agent>/SKILL.md` — plain markdown.
- The orchestration rules live in `governance/OPS.md` + `governance/AGENT_REGISTRY.yaml` — plain YAML/markdown.
- Skill specifications (`skills/atlas-<skill>/SKILL.md`) are plain markdown.
- If Claude Code is retired tomorrow, a migration runner reads the same files and runs the same skills against a different model.

### For agents

- Agents are **not** allowed to write outside `wiki/`, `raw/`, `agents_context/`, `work_queues/`, `reviews/`, `docs/`, `models/`. No hidden scratch space tied to a provider's memory feature.
- Agents should not depend on model-specific features (Anthropic tool use format, Gemini function-calling syntax) for anything load-bearing. If they do, wrap the dependency behind a thin adapter.
- Agents should read and write as if the next agent in the chain is a different model family. This is the anti-echo-chamber doctrine.

## Why "Open" not "Portable"

Portable implies effort to move. Open implies the system is never locked in to begin with. Atlas aspires to Open — at every design choice, the bias is toward the plainest, most widely-readable representation, even at small ergonomic cost.

## The Karpathy alignment

Karpathy's LLM Wiki pattern (April 2026) arrives at the same conclusion from a different angle: filesystem-based markdown is a better memory system than any vector-DB-over-chunks design, because it accumulates. The `wiki/` folder grows more valuable over time; a vector index does not, because it has no semantic structure the human (or a different model) can read and edit.

Atlas adopts the Karpathy pattern precisely because it IS the open-memory pattern made operational.

## What would violate this principle

- A position page that lives only in a Claude artifact, not in the repo.
- A decisions log stored as a vector-DB entry with no markdown shadow.
- A skill whose system prompt lives only in the Claude Code config, not in `skills/atlas-<skill>/SKILL.md`.
- A memory file marked "do not commit" because it contains provider-specific formatting.

Any of the above → Associate flags in weekly lint. Eduardo resolves.

## Log

- 2026-04-17 — Initial write.
- 2026-04-18 — Added Karpathy alignment + violation examples.
