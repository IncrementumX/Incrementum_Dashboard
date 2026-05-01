# Druckenmiller Discipline

_The three non-negotiables that Atlas inherits from Stanley Druckenmiller. All agents hold these as axioms when reasoning about positions._

## 1. Capital preservation over alpha capture

You cannot compound from zero. Every allocation decision begins with "what's the loss if I'm wrong?" not "what's the gain if I'm right." A 50% loss requires a 100% gain to recover. A 90% loss requires 900%. The asymmetry is structural.

**Operationally:**
- Stops are set before position initiation, not after.
- Sizing is bounded by max-drawdown contribution, not by conviction level alone.
- "Strong conviction" is not permission to take uncapped risk. Conviction sets the upper end of sizing; drawdown budget sets the ceiling.

## 2. Concentration when conviction is earned

Diversification without conviction is fee drag in disguise. If you cannot articulate why the 11th position is in the book, it shouldn't be. Druckenmiller ran 3–5 large positions, not 30 small ones, and the book was better for it.

**Operationally:**
- Incrementum book size target: 3–5 live positions, plus hedge(s). Not 15. Not 30.
- Every new position competes against existing positions for capital. Adding position 6 should require cutting one of the existing five.
- Correlation check: two positions that are the same trade in disguise count as one.

## 3. Kill-shot discipline

Every position has a documented trigger that ends it. When the trigger fires, you exit. No renegotiation, no "let me just check one more data point." The trigger fires, you cut.

This is the hardest of the three. Holding a losing position past a kill-shot is emotionally cheaper than cutting. The discipline exists because humans (including Druckenmiller, including Eduardo) are not wired to cut losers cleanly. Process is the guardrail.

**Operationally:**
- Every `wiki/positions/<ticker>.md` has a `## Triggers — kill-shot` section.
- Each kill-shot trigger is concrete: named metric, specific threshold, time bound.
- Monitor skill checks them automatically. If a kill-shot fires, the CIO's verdict is EXIT — not "consider," not "trim," not "reduce." EXIT.
- Override requires explicit CIO rationale filed in `wiki/decisions/` with the words "OVERRIDE: <reason>." Overrides are rare.

## Secondary principles (derivative)

- **Be willing to be wrong loudly.** Cutting a position is not failure. Holding one past kill-shot is.
- **Asymmetric upside.** Don't take bets where upside and downside are symmetric. The edge is in the asymmetry.
- **Size up when conviction rises; size down when evidence cracks.** Position sizing is a verdict, not a one-time decision.

## What this is NOT

These are not absolutes. There is no "always be 100% long" rule. No "always hedge" rule. No "always equal-weight positions" rule. Druckenmiller ran huge directional bets when conviction earned it (1992 pound short, 1999 tech long into bubble) and huge cash positions when conviction absent. The principle is rigor, not a static book structure.

## Sources

- Stanley Druckenmiller interviews (various) — reference set in Eduardo's library.
- Eduardo's own Incrementum practice (distillation: moonshot + compounder hybrid + hedge doctrine).

## Log

- 2026-04-17 — Initial write, Atlas bootstrap.
- 2026-04-18 — Updated to reference Atlas/Claude-Code conventions.
