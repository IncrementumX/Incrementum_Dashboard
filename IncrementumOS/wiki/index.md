# wiki/index.md — content-oriented index

> Karpathy convention (literal): *"content-oriented... each page listed with a link, a one-line summary"*.
>
> Source: [karpathy/llm-wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

This file is the **table of contents of the wiki**. Every page in `framework/`, `macro/`, `assets/`, and `portfolio/` should be listed here with a link and a one-line summary. When a new page is created, append it to the relevant section.

## framework/

Investment principles, mental models, checklists, and operational rules.

- [risk-first.md](framework/risk-first.md) — Eduardo's core risk framework: signal vs noise, cash as weapon, sizing = knowledge proxy, three themes, tactical toolkit, macro as primary filter. Known gaps: G1–G5.
- [sizing-rules.md](framework/sizing-rules.md) — *(stub)* position sizing rules and thresholds (G4).
- [short-criteria.md](framework/short-criteria.md) — *(stub)* short entry codification (G3).
- [portfolio-risk-limits.md](framework/portfolio-risk-limits.md) — *(stub)* portfolio-level loss limits and drawdown thresholds (G2 — critical gap).
- [entry-exit-checklist.md](framework/entry-exit-checklist.md) — *(stub)* entry and exit checklist.
- [signals-registry.md](framework/signals-registry.md) — *(stub)* registry of tracked market signals.

## macro/

Time-sensitive macro analyses with a clear macroeconomic driver.

- [gold-liquidity-vs-repricing.md](macro/gold-liquidity-vs-repricing.md) — gold's 2026 drawdown as dollar liquidity event (not thesis failure): mechanism, COVID analog, signals to watch, sizing implication.
- [worldview.md](macro/worldview.md) — macro worldview: dollar system rupture, three core themes (metals/commodities, geopolitics, AI disruption), falsifier conditions, Hormuz precedent, Eduardo's investment lens.

## assets/

Coverage and thesis per asset/sector. Flat — one file per asset.

- [gold.md](assets/gold.md) — gold as NPSOV: dollar debasement hedge, CB reserve accumulation (~1,000t/yr), Bessent revaluation mechanism, miner optionality, four macro scenarios.
- [silver.md](assets/silver.md) — *(stub)* silver thesis and coverage.
- [copper.md](assets/copper.md) — *(stub)* copper thesis and coverage.
- [uranium.md](assets/uranium.md) — uranium supply-structural deficit: 175 Mlb demand vs ~150 Mlb production, 440+ reactors, 40% enrichment in Russia, contracting cycle, Eduardo's re-entry framework.
- [energy-tech.md](assets/energy-tech.md) — *(stub)* energy and tech thesis and coverage.
- [semis.md](assets/semis.md) — AI infrastructure bet: memory as binding constraint, HBM cycle, BESI positioning, Citrini thesis; note: Eduardo's first-person thesis is a known open item.

## portfolio/decisions/

Tactical portfolio decisions — both execute and don't-follow. Naming: `YYYY-MM-DD-asset-action.md`.

*(empty — decisions logged here as they occur)*

## How to update

When adding a page anywhere in `wiki/`:

1. Append a line to the relevant section above:
   ```
   - [<page-title>](<path>) — <one-line summary>
   ```
2. Append an entry to `wiki/log.md` describing the addition.

When deleting or renaming a page, update both this file and `wiki/log.md`.
