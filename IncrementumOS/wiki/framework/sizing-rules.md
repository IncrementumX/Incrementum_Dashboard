# sizing-rules.md
*IncrementumOS / wiki / framework*
*Last reviewed: 2026-05-03*

---

## G4 — Position Sizing Rules

**Philosophy:** Sizing is a function of conviction, not of diversification targets. The book has no mandatory position count and no theme concentration ceiling. Flexibility is a feature, not a gap. Risk control enters via per-asset stops and the portfolio-level loss limit (see risk-first.md), not via percentage caps on individual positions.

---

### Three-Tier Position Structure

#### Tier 1 — Core / High Conviction

| Parameter | Rule |
|-----------|------|
| Definition | Positions where Eduardo has high conviction in the investment thesis |
| NAV ceiling | None |
| Sizing mechanism | Conviction-driven. Eduardo sizes as large as thesis warrants. |
| Risk control | Per-asset stop parameters, defined individually per position (pending dedicated session) |
| Theme concentration | No formal ceiling. Book maintains full flexibility. |

> **Note:** The absence of a NAV ceiling is intentional and reflects the Druckenmiller-style philosophy of concentrated bets where edge is real. Risk is managed through stop discipline and the Level 2 review protocol (risk-first.md), not through position size caps.

---

#### Tier 2 — Moonshots / Low-to-Medium Conviction

| Parameter | Rule |
|-----------|------|
| Definition | Positions with asymmetric upside where conviction is developing or thesis is early-stage |
| NAV range | 5–10% per position |
| Sizing mechanism | Conviction-driven within the tier. Higher conviction → toward 10%. Lower conviction → toward 5%. |
| Risk control | Per-asset stop parameters. Sized to accept total loss without impairing the book. |

> **Design intent:** The 5–10% band acknowledges that moonshots carry binary outcomes. Sizing within the band is Eduardo's judgment call per position — no formula.

---

#### Tier 3 — Tactical / Hedge

| Parameter | Rule |
|-----------|------|
| Definition | Short-dated positions, hedges, and tactical expressions with defined exits |
| NAV ceiling | 40% of NAV (gross notional) across all Tier 3 positions combined |
| Sizing mechanism | Sized as % of NAV in notional terms |
| Stop discipline | All Tier 3 positions carry a defined stop. Stops are tighter for higher-volatility instruments. Stop defined at entry, no exceptions. |
| Leverage instruments | Notional is gross — a 2× ETP (e.g., AGQ) at 10% NAV counts as 10% against the 40% ceiling, regardless of effective exposure |

> **On leveraged instruments within Tier 3:** Gross notional is the accounting unit for the 40% ceiling. Eduardo is aware that effective exposure for leveraged ETPs exceeds notional. Tighter stops on higher-vol instruments partially compensate for this — but position-level effective exposure should be noted when reviewing the hedge book.

---

### Gross Exposure

| State | Rule |
|-------|------|
| Current | No leverage active. Gross exposure = long book + Tier 3 notional. |
| When leverage activated | Ceiling up to 200% gross exposure. Structure (long/short balance, correlation framework, hedge ratios) to be defined in a dedicated session before activation. |

> Leverage is a legitimate tool. It requires a defined structure before it is activated — not after. When Eduardo decides to run leverage, a dedicated iteration with the Associate precedes execution.

---

### Per-Asset Stop Parameters

**Status: pending dedicated session.**

Stop levels are defined per position, per tier, reflecting each asset's volatility profile, liquidity, and thesis horizon. The framework above sets the sizing boundaries; the stop session populates the risk parameters within those boundaries.

Assets pending stop definition: RING, URNM, IVN, BESI, ASMI, copper exposure, any active Tier 3 positions.

---

### What This Framework Does NOT Do

- It does not impose diversification. Concentration is a tool, not a problem to be solved.
- It does not set theme-level ceilings. A 70%+ metals book is a valid expression of macro conviction, not a violation.
- It does not override Eduardo's judgment on any individual position. The tiers provide a shared language for discussing and reviewing the book — they are not constraints on decision-making.
- It does not replace the per-asset stop session. Sizing rules and stop rules are complementary; neither is complete without the other.

---

*Append sizing decisions and tier reclassifications to `agents_context/decisions.md` as they occur.*
