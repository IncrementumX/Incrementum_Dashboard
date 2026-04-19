---
name: atlas-snapshot
description: Fast first-read on a company. 15-20 minutes of work. Answers "is this worth deeper work?" Output is either a structured chat response (when Eduardo wants a fast scan) or a wiki/watchlist/<ticker>.md page (when the CIO says "file it"). Not a full assessment — that's atlas-assessment. Follows Incrementum snapshot format and light visual standards.
type: skill
owner: atlas-underwriter
model: claude-sonnet
audience: Eduardo (fast reads) + CIO (routing input)
---

# atlas-snapshot — 15-minute first look

A snapshot answers one question: **is this company worth 2–4 hours of Underwriter time on a full assessment?**

It is not a memo. It is not a model. It is a structured first read — enough to let the CIO decide PASS-to-watchlist, REJECT, or ROUTE-TO-ASSESSMENT.

## When to use

- Eduardo says: "give me a snapshot of X", "quick read on X", "first look at X", "what is X doing", "screen X", "overview of X".
- CIO routes a watchlist candidate for first-pass screening.

## When NOT to use

- If Eduardo wants a full framework read → use `atlas-assessment`.
- If the ticker is already live in `wiki/positions/` → use `atlas-monitor` instead (refresh), not snapshot.
- If Eduardo wants a Word doc → start with snapshot, then hand to `atlas-assessment` if it clears the bar.

## Inputs

- Ticker.
- (Optional) Specific angle Eduardo flagged ("check their China exposure", "what's the hybrid bonding story").
- Current state of `wiki/` — you MUST check whether the company is already in `watchlist/` or `positions/` before running. If it is, this is a refresh, not a new snapshot.

## Process

### Phase 1 — identity (3 min)

From company IR + most recent filing summary:
- What does the company sell? (one sentence, no jargon)
- Where does it sell it? (geographic mix, end-market mix)
- Who are the 2–3 named competitors?
- Last reported revenue, last reported EBIT / EBITDA, last reported net income, shares out.
- Market cap, EV, net cash/debt position.

Source: latest 10-K / 20-F / annual report. Tag everything. This is A-cred work.

### Phase 2 — why it matters (5 min)

- What is the central debate on this name? Look at 2–3 recent sell-side initiations or street reports to identify the consensus and the points of divergence.
- What is priced in today (forward multiples vs peer / vs own history)?
- What are the 1–2 things that would move the stock materially?

Source: sell-side notes if Eduardo has any dropped in `raw/research/`, otherwise Claude web_search on the name + analyst commentary + recent earnings call transcript (check raw/transcripts/).

### Phase 3 — Incrementum fit (4 min)

Does this name fit one of Eduardo's book types?
- **Moonshot / compounding hybrid** (BESI-style): secular inflection + identifiable narrative moment.
- **Asymmetric event** (HII-style, specific catalyst cycle, mispriced backlog/cash conversion).
- **Hedge** (AGQ-style, commodity/beta/macro cover).
- **None of the above** → likely REJECT.

Flag incompatibilities with Incrementum doctrine:
- Regulatory/legal overhangs with unpriced tail (biotech, hot regulated sectors).
- Accounting uncertainty (complex rev-rec, roll-ups).
- Governance red flags (controlling shareholder extraction, opaque RPTs).

### Phase 4 — triggers (3 min)

- What event in the next 2–4 months would resolve the key debate (earnings, product launch, regulatory decision, macro data)?
- What would make you CUT even without owning (early kill-shot thought)?

### Phase 5 — verdict routing

Deliver a recommendation to the CIO:

- **ROUTE TO ASSESSMENT** — this is worth 2–4 hours of Underwriter time. Assessment will produce a durable `wiki/positions/<ticker>.md` page with triggers, sizing logic, full evidence.
- **PARK IN WATCHLIST** — interesting but not ripe. File a `wiki/watchlist/<ticker>.md` with the snapshot content + a trigger-to-action ("revisit if X happens").
- **REJECT** — not a fit. Brief rationale. Archive in `wiki/watchlist/rejected/<ticker>-<YYYY-MM-DD>.md`. Revisit only on material new info.

## Output formats

### Format A — chat response (fast mode)

When Eduardo says "quick read" in chat, deliver a structured response directly, using Incrementum snapshot formatting (tables where helpful, prose where prose reads better, serif feel, no emoji). At the bottom, state the routing recommendation.

### Format B — wiki watchlist page

When the CIO says "file it", write to `wiki/watchlist/<ticker>.md` using this schema:

```markdown
# <Ticker> — <Company> — watchlist

_Last snapshot: <YYYY-MM-DD> by atlas-snapshot._
_Routing: PARK | ROUTE TO ASSESSMENT | REJECT_

## TL;DR
3 lines max.

## Identity
<Phase 1 content>

## Central debate
<Phase 2 content>

## Incrementum fit
<Phase 3 content>

## Triggers
<Phase 4 content>

## Revisit trigger (if PARK)
The one thing that would move this to "run a full assessment."

## Sources
- [src: <path>, pulled: <date>, cred: A]
- [src: <path>, pulled: <date>, cred: B]
```

Append to `wiki/log.md`:
```
INGEST <timestamp> <task_id> snapshot-<ticker> -> watchlist/<ticker>.md
```

## Boundaries

1. **No recommendations to buy.** A snapshot never issues a PASS. It routes. The CIO decides PASS/WATCH/REJECT.
2. **No fabricated comps.** If you can't find peer data in 15 minutes, say so. Don't make it up.
3. **No sizing work.** Sizing is an assessment-level task, not snapshot.
4. **Max output length** — chat: ≤ 800 words. Wiki watchlist page: ≤ 1500 words. If it's longer, you are doing an assessment, and you should say so and route.
5. **Stay within 15–20 minutes of wall-clock work.** If you need more, hand off to `atlas-assessment`.

## End of file
