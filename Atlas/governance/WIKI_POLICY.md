# Atlas — WIKI_POLICY.md

_How the wiki gets written, read, and cleaned. Adapted from Andrej Karpathy's LLM Wiki pattern (April 2026) + Defileo's implementation notes, tuned for investment research._

The wiki has exactly three operations. No other writes are permitted.

---

## Operation 1 — INGEST

**Owner:** Underwriter.
**Trigger:** A new source lands in `raw/` (filing, transcript, research PDF, briefing, news item), OR Eduardo drops a file and asks Atlas to digest it.

### Steps

1. **Record the raw file.**
   - Ensure the file is under `raw/` at the canonical path (see `SOURCE_POLICY.md` §6).
   - Compute content hash; append to `wiki/log.md` with timestamp + hash + path.

2. **Summarize.**
   - Produce a ≤300-word structured summary of what the source says. No quotes longer than 15 words. Factual only.
   - Identify the **entities touched** (tickers, themes, macro regimes, people, counterparties).

3. **Update entity pages.**
   - For each touched entity, find the canonical page under `wiki/positions/`, `wiki/watchlist/`, `wiki/themes/`, or `wiki/macro/`.
   - If the page doesn't exist and the entity is material → create it. If immaterial → skip and note in `wiki/log.md`.
   - Append a dated entry under the page's "Evidence" section with:
     - A 1–3 sentence claim in the Underwriter's own words.
     - A source tag per `SOURCE_POLICY.md`.
     - A link to the `raw/` file.

4. **Update `wiki/index.md`.**
   - Ensure every new page is linked from the index under the right cluster.
   - If an existing page changed category (e.g., watchlist → position), move its link accordingly.

5. **Append to `wiki/log.md`.**
   - One line: `INGEST <YYYY-MM-DD HH:MM> <source_id> -> [pages touched]` with the task_id.

6. **Dispatch Associate** if the ingest feeds a position-level claim.
   - Write `reviews/<task_id>-draft.md` pointing at the touched pages.
   - Associate reviews per `SOURCE_POLICY.md` §5 and `FRESHNESS.md` §6.

### Rules

- **Never rewrite `raw/`.** It is immutable.
- **Never summarize an entity page from scratch.** Append evidence; let the page accumulate. The wiki gets smarter by accretion, not by regeneration.
- **Quote ≤15 words inline.** Put longer material in `raw/`, not in `wiki/`.

---

## Operation 2 — QUERY

**Owners:** CIO and Underwriter.
**Trigger:** A question is asked — by Eduardo, by CIO to Underwriter, by Underwriter to itself during an assessment.

### Steps

1. **Read `wiki/index.md` first.** The index is the map. If you cannot find the topic in the index, it probably is not yet in the wiki — open an ingest task rather than hallucinating.

2. **Pull relevant pages.** Prefer `wiki/` over `raw/` for synthesis; fall back to `raw/` only when you need a primary quote or a number Straight from the source.

3. **Check freshness** on every number you plan to use (see `FRESHNESS.md`). Refresh if stale.

4. **Synthesize with inline citations.** Every quantitative claim in the answer points back to a `wiki/` page or a `raw/` file path. No naked numbers.

5. **File durable answers back into `wiki/`.**
   - If the question and its answer are likely to recur (any position-level question, any thematic question, any principle), write the Q+A into the appropriate page under `wiki/`.
   - Ephemeral conversational Q&A (e.g., "what time is the call?") stays out of the wiki.

6. **Append to `wiki/log.md`.**
   - `QUERY <YYYY-MM-DD HH:MM> "<question>" -> [pages read] -> [pages written]`.

### Rules

- **No answers without citations.** If you cannot cite, you cannot claim.
- **Prefer wiki over re-deriving.** If the wiki already answers the question, cite the wiki page rather than re-working from `raw/`. The wiki is the distillation; use it.
- **A good answer files itself back.** Do not let a reusable synthesis die in chat.

---

## Operation 3 — LINT

**Owner:** Associate.
**Trigger:** Weekly cron (Sundays), and ad-hoc on every review.

### Checks

1. **Contradictions.**
   - Walk `wiki/positions/**` and `wiki/themes/**`.
   - Identify claims that contradict each other (same metric, same entity, different values with no `superseded-by` chain).
   - Log each to `wiki/contradictions/<YYYY-MM-DD>-<slug>.md` and append a pointer to `agents_context/contradictions.md`.
   - CIO resolves; resolution filed into `wiki/decisions/`.

2. **Orphan pages.**
   - Any page under `wiki/**` not reachable from `wiki/index.md`.
   - Either (a) link it, (b) merge it into a parent page, or (c) delete it with a log entry explaining why.

3. **Stale claims.**
   - Run the freshness check from `FRESHNESS.md` §6. Open refresh tasks.

4. **Missing source tags.**
   - Any quantitative claim in `wiki/` without the `{src, pulled, cred, owner}` tag → issue in `agents_context/issues.md` + entry in `reviews/lint-<date>.md`.

5. **Missing cross-refs.**
   - If page A mentions entity B and B has a wiki page, A must link to B. Fix or flag.

6. **Dead links.**
   - Any `src:` pointer that no longer resolves (file moved, URL rotted). Flag and open a repair task.

### Output

- `reviews/lint-<YYYY-MM-DD>.md` — full lint report with PASS or REJECT per check.
- Append to `wiki/log.md`: `LINT <YYYY-MM-DD> -> <n> issues, <n> fixed, <n> open`.
- Open items land in `agents_context/issues.md`.

### Rules

- **Lint never silently rewrites.** It flags and proposes. Underwriter (or CIO for structural changes) makes the fix.
- **Lint is the reason the wiki doesn't rot.** Skip a week and the cost compounds.

---

## Page conventions

Every wiki page has this skeleton:

```markdown
# <Entity Name> (<ticker if applicable>)

## TL;DR
<3-5 sentences, the current state of the thesis / theme>

## Thesis / Framing
<prose, can grow over time>

## Evidence
<dated append-only entries with source tags>

## Triggers (for positions only)
- Kill-shot: <explicit condition that invalidates the thesis>
- Watch: <conditions that would warrant a re-read>

## Sizing (for positions only)
<current size, rationale, last reviewed date>

## Related
<cross-refs to other wiki pages>

## Log
<page-local history: when it was created, major restructurings>
```

Pages under `wiki/themes/`, `wiki/macro/`, `wiki/principles/` omit Triggers + Sizing.

## Linking

Use relative markdown links: `[BESI](../positions/BESI.md)`. Obsidian renders these natively via the vault view. The dashboard renders them via a build-time transformer.

## File naming

Lowercase tickers for positions/watchlist: `wiki/positions/besi.md`. Hyphenated slugs for themes: `wiki/themes/ai-capex-2026.md`. ISO dates for log-style files: `wiki/decisions/2026-04-17-besi-size-up.md`.
