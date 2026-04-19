# AGQ — ProShares Ultra Silver — position page (HEDGE)

_Seed template — PENDING Eduardo's PARO 3 fill. Numbers, sizing, stops, triggers deliberately blank._

_Last updated: 2026-04-18 (template seed) by Atlas Underwriter._
_Ticker: AGQ (NYSE Arca)._
_Setup type: HEDGE — 2x leveraged silver ETF. Macro cover, not a conviction long._

---

## HEDGE DISCIPLINE

**This is a hedge, not a position.** Rules for hedges per Incrementum doctrine:

1. A hedge does not carry a thesis memo. It carries a hedge rationale.
2. A hedge's "triggers" are de-hedging triggers, not kill-shot triggers in the same sense as a long.
3. A hedge cannot become alpha storytelling. If silver rallies 40% and Eduardo catches himself thinking "maybe this is actually the trade", that is a failure mode — re-read this page.
4. Hedge sizing is calibrated to portfolio beta exposure, not to own-conviction.

## TL;DR (hedge framing)

_3 lines. Eduardo writes._

1. `<what is this hedge covering — likely USD reserve-regime risk / sovereign-credit tail / real-rate reversal>`
2. `<why AGQ specifically — 2x leverage, liquid, cheap convexity vs put options>`
3. `<what de-hedges look like>`

## Rationale

_Why Atlas holds AGQ as a hedge. Likely themes:_
- Sovereign-credit / reserve-regime risk (wiki/themes/sovereign_credit.md when seeded).
- Real-rate reversal scenario (Fed dovish-pivot surprise, fiscal dominance path).
- Cheap convexity — 2x leverage on silver is structurally cheap vs equivalent exposure via options on a multi-quarter horizon.

**What this hedge is NOT:**
- Not a bet that silver "goes up."
- Not a play on inflation specifically (inflation has multiple vectors; silver covers only one).
- Not a diversifier for equity volatility in general.

## Evidence

### Macro context
- `<evidence>` [src: ..., pulled: ..., cred: ...]

### Silver-specific
- `<evidence>` [src: ..., pulled: ..., cred: ...]

### Why AGQ vs alternatives
- _vs SLV (unleveraged): AGQ delivers 2x exposure per dollar deployed → smaller capital commitment for the hedge._
- _vs options: AGQ avoids time decay over multi-quarter horizons; roll cost of 2x ETF lower than rolling puts/calls across expiries for hedge-scale exposures._
- _vs GDX / miners: AGQ tracks spot silver more cleanly; miners add operational risk that dilutes the macro signal._

## De-hedging triggers (NOT kill-shots)

When to REMOVE the hedge, not to cut as a loss:

_Eduardo writes 2-3._
- `<trigger>` — `<condition>` — rationale: hedge no longer needed because `<macro condition resolved>`

Note: a hedge at a loss is a hedge that did its job (underlying risk didn't materialize) — loss on AGQ is offset by the rest-of-book outperforming in the "no risk event" scenario. Don't confuse hedge P&L with position-level thesis breaks.

## Sizing

_Eduardo writes. Must be calibrated against total book beta / drawdown exposure._

- **Hedge size:** `<% of book or $ notional>`
- **2x leverage means:** effective silver exposure ≈ 2 × AGQ $ notional.
- **Entry band:** `<price range>`
- **Roll cadence:** `<monthly | quarterly>` — 2x ETFs have decay in choppy markets; review roll cost quarterly.

## Risks

- **Volatility decay.** 2x leveraged ETFs underperform 2x their underlying in choppy markets due to daily rebalancing. Long-dated exposure drifts.
- **Silver-specific dislocations.** Industrial-demand cycle (solar, electronics) can dominate macro signal in short periods.
- **Hedge-to-alpha drift.** Biggest operational risk is Eduardo reclassifying this as a view trade. Monitor for this in the CIO's quarterly review.

## Related

- Themes: [`../themes/sovereign_credit_reserve_regime.md`](../themes/sovereign_credit_reserve_regime.md) _(pending seed)_
- Principles: [`../principles/druckenmiller_discipline.md`](../principles/druckenmiller_discipline.md)

## Log

- 2026-04-18 — Template seeded. PARO 3 pending — Eduardo writes sizing, de-hedge triggers, entry band.
