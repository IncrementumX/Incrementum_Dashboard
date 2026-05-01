# Atlas — FRESHNESS.md

_Before reasoning on a value, check `date_pulled`. If it is older than the revalidation cadence for that data type, refresh first. Stale data is the #1 failure mode of agentic research._

## 1. Revalidation cadence

| Data type | Max staleness before re-pull is required | Who refreshes |
|---|---|---|
| **Spot price, FX, intraday quote** | 1 trading day (intraday: 15 min for active reasoning) | Underwriter at session start |
| **Consensus estimates** | 7 days | Underwriter on query |
| **Street target prices** | 14 days | Underwriter on query |
| **Implied vol, options chain** | 1 trading day | Underwriter on query |
| **Credit spreads, CDS** | 3 trading days | Underwriter on query |
| **Macro prints (CPI, NFP, GDP, BCB Focus)** | Use latest print; re-pull on known release dates | Briefing skill |
| **Central bank minutes / dot plot** | Until superseded by the next meeting | Briefing skill |
| **Company filings (10-Q, 10-K, 20-F, ITR, DFP)** | Until superseded by the next filing | Underwriter on query; Briefing flags new filings |
| **Management guidance** | Valid until next earnings call or explicit company update | Monitor skill flags any update |
| **Broker research (initiation, model update)** | 30 days for model numbers; older is "historical context" | Underwriter on query |
| **Sell-side consensus rating mix** | 14 days | Underwriter on query |
| **Peer comps (multiples)** | 7 days for active comparison; 30 days as background | Underwriter on query |
| **Thesis-critical KPIs (user-defined per position)** | Defined in each `wiki/positions/<ticker>.md` "triggers" section | Monitor skill |

## 2. How to check

Every tagged claim in `wiki/` has a `pulled:` date per `SOURCE_POLICY.md`. Before reasoning:

1. Compute `today - pulled`.
2. Compare against the row above for that data type.
3. If `today - pulled` > cadence → **refresh before using**. Do not reason on the stale value.
4. Update the tag with the new `pulled` date and new value if it changed.

If refresh is not possible in-session (source paywalled, broker login required, Eduardo-only credential), mark the claim with `[STALE: needs-refresh <YYYY-MM-DD>]` inline and log the refresh task to `work_queues/analysis.md`. Do not strip the tag.

## 3. Freshness at session start

Every agent, every session, before doing work:

1. Read `agents_context/state.md`.
2. For every live position referenced in `state.md`, glance at the last `pulled` dates in `wiki/positions/<ticker>.md`.
3. If any position's price / estimates / KPIs are stale per §1, open a refresh task before doing any new analysis on that name.

## 4. Stale-thesis detection

Monitor skill runs daily and flags:

- Price move > 1.5σ vs. 60-day realized vol without a corresponding note in `wiki/log.md`.
- New filing, 8-K-equivalent, or material press release on a position-name not yet ingested.
- Consensus estimate revision > 3% on EPS or revenue vs. last ingested consensus.
- Any of the position's named triggers tripped.

Flags land in `work_queues/monitor.md`. CIO triages.

## 5. What stays "fresh forever"

- Principles in `wiki/principles/`.
- Historical events (filings, prints, rate decisions) that have already happened — they don't get stale, they just get contextualized by newer data.
- Decisions in `wiki/decisions/` — they are a snapshot of CIO reasoning at a point in time. Do not edit retroactively. Write a new decision if the view changes.

## 6. Enforcement

Associate's weekly lint:

- Walks `wiki/positions/**` and `wiki/macro/**`.
- For each tagged claim, checks `pulled` against §1.
- Stale claims → entry in `agents_context/issues.md` with a refresh task for Underwriter.

On any single-task review, Associate spot-checks freshness for claims that drive the memo's conclusion. Stale driver → **REJECT**.
