# Scout Tab

## V1 Focus

Scout is now centered on a macro-conditioning and regime-testing research stack, not just simple asset correlations.

The first visible cockpit prioritizes:

- `RING`
- `AGQ`
- `GLD`
- `TIP`
- `TLT`
- `UUP`

with optional second-wave coverage for:

- `COPX`
- `URA`

## Macro Inputs In V1

The V1 macro layer treats these as first-class explanatory variables:

- `DGS10` - U.S. 10Y nominal yield
- `DFII10` - U.S. 10Y real yield
- `T10YIE` - 10Y breakeven inflation
- `T10Y2Y` - 10s2s curve slope
- `T5YIFR` - 5y5y forward inflation expectations
- `DXY` - broad dollar proxy

The architecture is designed to extend later to:

- 2Y yield
- Fed policy proxies
- credit spreads
- yield volatility
- growth / liquidity proxies

## How The PDF Shapes The Design

The `151 Trading Strategies` PDF is used here as conceptual structure, naming, and categorization, not as a plug-and-play trade list.

- Fixed-income, inflation, and rates sections shape the yield, breakeven, and curve decomposition logic.
- FX sections inform dollar and cross-market conditioning.
- ETF and cross-asset sections support expression selection across instruments.
- Global macro framing supports the regime-classification layer.
- Appendix backtesting concepts inform the standardized conditional-backtest presentation.

## What Works Now

- `SCOUT` is integrated in the main nav.
- Macro Snapshot is visible in the UI.
- RING and AGQ are first-class research panels.
- Additional panels are included for GLD, TIP, TLT, UUP, COPX, and URA.
- Macro-conditional return backtests are wired into the UI.
- Relative macro comparisons are visible, such as:
  - `RING vs GLD`
  - `RING vs TIP`
  - `AGQ vs GLD`
  - `AGQ vs UUP`
  - `TIP vs TLT`
  - `GLD vs TLT`
- Composite regime states are surfaced as:
  - favorable
  - unfavorable
  - mixed
  - low-confidence
- Transparent score components and portfolio linkage are displayed.

## Important Modeling Choices

- `DFII10` is treated as a first-class driver for precious-metals-related assets.
- `AGQ` is modeled as a path-dependent 2x daily vehicle, not a clean unlevered metal proxy.
- `RING` is treated as a miner-equity expression, not a pure gold tracker.
- Relative comparisons are used to distinguish which macro expression historically worked better in a given regime.

## Data Honesty

Current V1 status:

- `simulated`: macro stack and asset behavior are deterministic simulated series for architecture and UI validation
- `live` / `delayed`: reserved for future provider-backed macro and asset ingestion
- `research-only`: still used for strategy families where execution realism is not yet supported

## What Needs External Data

To move this macro stack beyond simulated V1, the next additions are:

1. live macro series ingestion for nominal yields, real yields, breakevens, curve, and inflation expectations
2. provider-backed asset history for Scout assets
3. corporate actions / deal feeds for event-driven modules
4. futures curves and options surfaces for term-structure and volatility work
5. credit and spread proxies for richer macro stress classification

## Recommended Next Step

The next highest-value improvement is to connect real macro time series and real asset history into the existing regime engine without changing the UI contract.
