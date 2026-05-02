---
status: v1
created: 2026-04-29
updated: 2026-05-01
---

# Sizing Rules

> Synthesized from @incrementum-associate session, 2026-05-01.
> Primary audience: incrementum-analista and incrementum-associate agents.
> Status: v1 — approved by Eduardo on 2026-05-01.
> Resolves: Gap G4 (risk-first.md)

## 1. Core Principle

Sizing is a knowledge proxy. Position size must be proportional to verified conviction,
not to expected return or opportunity urgency. Missing an opportunity from insufficient
conviction is an explicitly acceptable outcome.

## 2. Sizing Tiers

| Tier | Knowledge state | Max size (% NAV) |
|---|---|---|
| Watchlist | Thesis hypothesis only | 0% |
| Seed | Partial thesis + identifiable asymmetry | ≤2% |
| Small-asymmetric | Partial thesis + M&A / catalyst optionality | ≤5% |
| Core | Full research, verified conviction | ≤15% |
| High-conviction concentrated | Extensive research, primary macro theme | >15%, no stated cap |

The high-conviction concentrated tier requires the IncrementumOS research process
(associate QA + analista output) to have been completed. There is no numerical cap at
this tier by design — Druckenmiller-style concentration is the target when conviction
warrants it.

## 3. Two Entry Logics

### 3a. Investigate, Then Invest

Default mode. Conviction is built gradually via macro reading, bottom-up research, and
catalyst identification before any position is initiated. Applicable when: the thesis
requires full understanding of the business before sizing makes sense (e.g., complex
industrials, credit).

Tier progression: Watchlist → Seed → Small-asymmetric → Core → High-conviction.
Each step up requires a discrete increase in verified knowledge, not passage of time.

### 3b. Invest, Then Investigate

Exception mode. A small position (Seed or Small-asymmetric) is initiated before full
research is complete when two conditions are simultaneously met:

1. **Identifiable asymmetry**: the payoff structure is favorable even without full
   valuation work — e.g., M&A optionality, structural moat not yet priced, macro
   catalyst that makes the option cheap.
2. **Partial thesis**: enough is understood about the business to know *why* the
   asymmetry exists, even if the magnitude is unquantified.

The initial position under this logic is a placeholder, not a conviction bet. It does not
graduate to a higher tier until the IncrementumOS research process confirms the thesis.
The position can be held at Seed/Small-asymmetric indefinitely while investigation
proceeds. It is cut if investigation actively contradicts the partial thesis.

## 4. Tier Upgrade Criteria (Resolves G4)

A position may move to the next tier only when the following conditions are met:

**Seed → Small-asymmetric**: asymmetry is better defined; at least one pillar of the
thesis is verified via primary sources (IR, SEC filings, CVM/B3).

**Small-asymmetric → Core**: IncrementumOS research process completed (analista
output produced, associate QA passed). Key questions in the thesis are answered, not
merely identified. Macro context is not adverse to the position.

**Core → High-conviction concentrated**: thesis has survived at least one adverse
market event or contradicting data point without being invalidated. Eduardo has
independent conviction — not derived solely from IncrementumOS output.

There is no time minimum between tiers. There is no automatic upgrade — each
transition is a discrete decision.

## 5. Sizing Under Opportunity Pressure

The "invest then investigate" mode exists precisely to handle opportunity pressure
without violating the knowledge proxy principle. If a setup looks asymmetric but
conviction is incomplete, the correct response is Seed entry — not Core entry justified
by urgency. Urgency is not a sizing input.

## 6. Interaction with portfolio-risk-limits.md

Tier caps are per-position maximums. They do not override concentration limits at the
portfolio level defined in portfolio-risk-limits.md. When two high-conviction positions
are correlated, combined exposure is the binding constraint.

## 7. Cash as Active Weapon

Cash is not a residual. Maintaining dry powder (≥15% NAV per portfolio-risk-limits.md
Tier 1) is a prerequisite for acting on new asymmetric setups. A position is never sized
up by drawing below the cash floor — if the book is full, the choice is rotation, not
leverage.
