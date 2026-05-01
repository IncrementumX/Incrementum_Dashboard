---
status: v1
created: 2026-04-29
updated: 2026-05-01
---

# Portfolio Risk Limits

> Synthesized from @incrementum-associate session, 2026-05-01.
> Primary audience: incrementum-analista and incrementum-associate agents.
> Status: v1 — approved by Eduardo on 2026-05-01.

## Current State (as of 2026-05-01)

The book is unlevered. Cash allocation is approximately 25% of NAV. Individual position
stops exist and are enforced. Portfolio-level loss limits are not yet formally defined —
this is Gap G2 from risk-first.md.

Operating behavior to date has been intuitive and effective: Eduardo has demonstrated the
ability to reduce gross exposure ahead of known macro risk events (Iran escalation,
geopolitical tail scenarios). This pattern — acting before the market prices the risk —
is a core behavioral edge that formal rules must preserve, not constrain.

## Tiered Governance Framework

### Tier 1 — Unlevered, cash ≥ 15% NAV (current state)

No portfolio-level hard stop required. Individual position stops govern drawdown. Principles:

- Cash is an active position, not a residual. Holding cash when macro risk/reward is
  unclear is a valid expression of conviction.
- Stops on individual positions are non-negotiable and defined at entry.
- A correlated drawdown across multiple positions is a signal to revisit macro regime
  characterization, not necessarily to act mechanically.
- No formal portfolio drawdown threshold at this tier. Governance is principle-based.

**High-beta position handling (URNM, BESI, IVN, and similar):** Significant intraday and
daily volatility is expected. Volatility alone is not a signal. The distinction:

- *Noise*: Price move driven by beta, macro sentiment, or a pro-thesis event temporarily
  misread by the market. No action required on the thesis. A partial stop may be used as
  a capital reallocation tool — reducing exposure to reenter lower — without implying
  thesis abandonment.
- *Signal*: Thesis breach. A development that materially changes the investment case.
  Full review required; position may be exited.

Example: uranium falls 5% on a day with a pro-re-escalation Iran event. This is noise.
A partial stop with a defined reentry level lower is the appropriate tool — not a thesis exit.

Risk management in this tier is evaluated per-asset, not via a portfolio-wide formula.
Each position has its own volatility profile and thesis sensitivity — applying a uniform
drawdown rule across high-beta and low-beta names would generate false signals.

### Tier 2 — Unlevered, cash < 15% NAV

Increased monitoring warranted. Before reducing cash below this level:

- Macro regime characterization must be intact (no material reversal of worldview pillars).
- Each new position must have a defined stop and defined max sizing per knowledge level.
- Aggregate correlated exposure to a single stress scenario (dollar stress, risk-off) must
  be explicitly assessed, even if not formally capped.

No hard portfolio stop at this tier, but the correlation gap (G1) must be acknowledged
explicitly in any sizing decision.

### Tier 3 — Levered book (future state)

Formal, quantitative portfolio-level rules required before leverage is initiated. Minimum
requirements before running levered:

- Dashboard real-time access operational.
- Correlation framework built and integrated into sizing decisions.
- Portfolio-level drawdown threshold defined as a % of NAV (TBD — requires correlation data).
- Intraday gap protection protocol defined: if a single position gaps more than [X]% in
  one session, a partial reduction rule applies (stop partial, reentry at defined lower
  level, thesis intact).
- Aggregate daily loss limit defined: if total portfolio marks down more than [Y]% in one
  session, trading is paused and regime characterization is reviewed.

X and Y are explicitly undefined until dashboard access and correlation data are available.
Leaving them blank is intentional — arbitrary numbers would be worse than an acknowledged gap.

## What This Document Does Not Cover

- Correlation-aware sizing (G1) — deferred to dashboard build.
- Specific drawdown thresholds at Tier 3 — deferred to correlation framework.
- Forced-selling diagnostic (referenced in worldview.md) — deferred to entry-exit-checklist.md.

## Design Principle

Formal rules must be tight enough to protect capital and loose enough not to constrain the
behavioral edge that has generated returns. Premature precision is a risk — a rule that
looks rigorous but is built on the wrong inputs is worse than an acknowledged gap.
