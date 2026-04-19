# Kill-Shot Doctrine

_What a kill-shot trigger is, what it is NOT, and how to write one that actually triggers an exit._

## Definition

A **kill-shot trigger** is a concrete, falsifiable condition whose occurrence ends a position. When it fires, the CIO verdicts EXIT, the Underwriter closes the trade, the position page is moved to `wiki/decisions/closed/`.

It is not a soft warning. It is not a "reassess" signal. It is the end of the position.

## What makes a kill-shot trigger valid

**1. Concrete.** Named metric, specific threshold, specific time bound.

❌ "If the thesis breaks."
✅ "If hybrid bonding share of BESI new orders falls below 12% for two consecutive quarters."

❌ "If management loses credibility."
✅ "If the CEO or CFO departs within 12 months of thesis initiation without a pre-announced successor."

**2. Falsifiable.** A different portfolio manager reading the page in 6 months could mechanically check whether it has fired. No subjective judgment required to read the trigger.

❌ "If AI demand slows."
✅ "If TSMC CoWoS capex guide for year+1 is revised down by more than 15% in a single report."

**3. Time-bound.** Either a specific date range or a specific cadence (per quarter, per report).

❌ "If earnings disappoint."
✅ "If reported quarterly EBITDA misses Atlas base case by more than 20% for 2 of 3 consecutive quarters."

**4. Written BEFORE pain.** The trigger is written at position initiation, not retrofitted after a drawdown. Writing a kill-shot after the position is hurting is rationalization in disguise.

## How many

Every live position has 2–4 kill-shot triggers. Fewer than 2 = thesis not specific enough. More than 4 = tripwire salad; the position will hit one spuriously and get cut for noise.

Good structure:
- **1–2 fundamental kill-shots** (business-state-dependent, per above).
- **1 price / drawdown kill-shot** (e.g., "position drawdown from entry exceeds 25% with no named catalyst, or exceeds 35% with named catalyst").
- **0–1 macro kill-shot** if the thesis is macro-sensitive (e.g., "10y Treasury yield above 6% for 30 trading days triggers reassessment of small-cap defense allocation").

## What a kill-shot is NOT

- **Not a stop loss line.** Stop loss is one kind of kill-shot — price-based. But kill-shots include fundamental conditions that have nothing to do with price.
- **Not a trimming signal.** If the trigger says "trim 20%", it's a sizing rule, not a kill-shot. Kill-shots are binary: fire → exit.
- **Not a buy signal in reverse.** A kill-shot ends a position. It does not imply going short. Shorting is a separate thesis.
- **Not a thesis-refresh trigger.** Refresh triggers go in `## Triggers — upside` or in FRESHNESS cadence. Kill-shots end the book exposure.

## When a kill-shot fires

Per Monitor skill protocol:

1. `atlas-monitor` detects the fire. Writes `Severity: critical` to `work_queues/monitor.md`.
2. Mirrors to `agents_context/issues.md` as `Severity: blocker`.
3. CIO reviews same session. Default verdict: EXIT.
4. Underwriter writes the exit note to `wiki/decisions/<YYYY-MM-DD>-<ticker>-exit.md`.
5. Position page moves from `wiki/positions/` to `wiki/decisions/closed/`.
6. Log entry: `DECISION <timestamp> EXIT <ticker> kill-shot <trigger_name>`.

## Override protocol

Overriding a kill-shot fire is rare and requires explicit CIO rationale filed in `wiki/decisions/` with the words "OVERRIDE: <reason>." Rationales that do NOT justify an override:
- "The move is probably technical."
- "I want to give it another quarter."
- "I just spoke to IR and they reassured me."

Rationales that might justify an override:
- "The data source used to compute the trigger has a documented error (e.g., vendor correction pending)."
- "The trigger condition nominally fired but under a corporate event (e.g., reclassification) that the trigger didn't contemplate; rewrite the trigger, don't hold the position on a technicality."

Overrides are logged. Multiple overrides on the same position = sign of thesis decay. Associate should flag in weekly lint.

## Why this is hard

The emotional cost of cutting a loser is higher than the emotional cost of holding through pain. That's why this is a doctrine. It exists precisely because humans are bad at cutting cleanly. Atlas imposes the discipline because Eduardo, like everyone else, would hold too long if the system let him.

## Log

- 2026-04-17 — Initial write.
- 2026-04-18 — Added override protocol and "why this is hard" rationale.
