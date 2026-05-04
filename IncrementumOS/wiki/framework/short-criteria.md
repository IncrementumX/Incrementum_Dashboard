# short-criteria.md
*IncrementumOS / wiki / framework*
*Last reviewed: 2026-05-03*

---

## G3 — Short Entry Criteria

**Philosophy:** Eduardo shorts catalysts, not valuations. A valid short has a specific, pre-identified event that forces market recognition of a thesis within a defined timeframe.

**Iron rule:** Every short position has a defined stop. No exceptions.

---

### Catalyst Validity Test

All three conditions must be satisfied before entering a short:

**1. Pre-identified.**
The catalyst must be articulable *before* entry — not reconstructed after the market has already moved. If the thesis can only be explained post-hoc, it was not analysis; it was storytelling.

**2. Falsifiable with a deadline.**
- Earnings / announcement catalysts: maximum 3-month horizon.
- Regulatory or cycle catalysts: maximum 6-month horizon.
- No open-ended shorts. A short without a deadline is a structural view masquerading as a trade.

**3. Asymmetric timing cost.**
The expected move on catalyst materialization must exceed: (a) borrow cost for the holding period, plus (b) estimated risk of short squeeze. If these costs are high, the catalyst must be commensurately large — or sizing must be reduced.

---

### What Does NOT Qualify as a Catalyst

The following are context, not catalysts. They do not justify entry on their own:

- "The stock is expensive" — valuation is not a catalyst.
- "The sector is deteriorating" — macro sector weakness without a specific forcing event.
- "Fundamentals are weakening" — deterioration without a mechanism that forces market recognition.
- Any argument that has no implicit deadline.

---

### Short Types

#### Tactical Short

| Attribute | Specification |
|-----------|--------------|
| Catalyst | Specific event with short horizon (weeks to 3 months) |
| Sizing | Per sizing-rules.md — see tactical/hedge tier |
| Stop | Defined at entry. No exceptions. |
| Exit rule | Close when catalyst materializes **OR** when deadline passes — win, loss, or scratch. |
| Management | Minimal. Set the trade, manage the stop, execute the exit rule. |

**Anchor example — META (2024):**
Short entered ahead of earnings on thesis of below-consensus results. Earnings delivered below expectations. Market recognized. Covered at +15% above cost. Exit trigger: catalyst materialized and market confirmed. Not: price target. Not: stop hit. Catalyst-driven discipline throughout.

#### Structural Short

| Attribute | Specification |
|-----------|--------------|
| Thesis | Multi-quarter deterioration with sequential catalysts |
| Sizing | Per sizing-rules.md — up to structural short ceiling |
| Stop | Defined at entry. Active management thereafter. |
| Management | If position goes 10% against: pull thesis, re-examine. Second 10% against (cumulative ~20%): begin covering. |
| Frequency | Rare. Reserved for high-conviction, well-researched ideas only. |

The distinction from tactical: in a structural short, Eduardo manages through intermediate moves if thesis holds. In a tactical short, the exit rule is mechanical — catalyst + deadline.

---

### Exit / Cover Hierarchy

When any of the following occur, Eduardo covers in the order listed:

1. **Catalyst materialized + market recognized** → close. Win, loss, or scratch.
2. **Catalyst materialized + market did not recognize within 10 business days** → close. The thesis may be right but the timing is wrong; the trade is over.
3. **Catalyst will not materialize within the original timeframe** → close before deadline expires.
4. **Pre-defined stop hit** → close. No exceptions for tactical shorts. For structural shorts: re-examine thesis first, then decide.
5. **Correlated long moves adversely on fundamentals** → review the pair. If the long thesis has changed, the short may no longer serve its original hedging function.

---

### Sizing Considerations for Shorts

Shorts are never sized purely by conviction. Sizing reflects all of the following:

- **Borrow cost:** High borrow compresses the expected return. Size down accordingly.
- **Liquidity:** Illiquid names carry squeeze risk. Smaller size for lower liquidity.
- **Correlation with long book:** A short that hedges an existing long gets sized relative to that long exposure, not independently.
- **Tail risk of unlimited upside:** Unlike longs, shorts have asymmetric loss potential. This structurally limits sizing for any single short.

A high-conviction short with poor borrow structure gets *smaller* sizing, not larger.

---

### What This Framework Does NOT Do

This framework does not convert Eduardo's judgment about market structure, sentiment, and timing into a mechanical ruleset. The catalyst criteria are guardrails — they ensure every short has a thesis. They do not replace judgment about *when* to pull the trigger, *how* to read the tape, or *whether* the risk/reward is acceptable at a given moment.

Subjectivity in execution is preserved. The framework eliminates entry without thesis, entry without deadline, and entry without stop. Everything else is Eduardo's call.

---

*Append short trade reviews to `agents_context/decisions.md` after each close — catalyst confirmed or not, why exit was triggered, what held and what didn't.*
