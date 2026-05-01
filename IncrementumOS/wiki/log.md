# wiki/log.md — append-only record

> Karpathy convention (literal): *"append-only record of what happened and when"*.
>
> Source: [karpathy/llm-wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

Append-only. Never edit past entries. New entries go at the **bottom**.

Format:

```
## YYYY-MM-DD

- <action> — <one-line description>
```

---

## 2026-04-28

- created — `wiki/index.md` (Karpathy convention: content-oriented index)
- created — `wiki/log.md` (this file; Karpathy convention: append-only record)
- created — `IncrementumOS/raw/` with `articles/`, `papers/`, `data/` subfolders (Karpathy "raw sources" layer)
- updated — `governance/CLAUDE.md` with "Operations" section (Ingest / Query / Lint)

## 2026-04-29

- created — `wiki/philosophy/risk-first.md` v1.1 (Eduardo's core risk framework; synthesized from @incrementum-associate session 2026-04-27/29; approved by Eduardo 2026-04-29)
- updated — `wiki/index.md` (added risk-first.md to philosophy/ section)
- ingested — `raw/articles/_substack.com_Gold Is Not Failing.md` → `wiki/teses/gold-liquidity-vs-repricing.md` (TSCS analysis: gold decline as dollar liquidity event driven by Hormuz/energy emergency, not thesis repricing; signals to watch: Brent-Dubai spread, Singapore gasoil crack, MOVE-VIX divergence, GDXJ relative performance)
- updated — `wiki/index.md` (added gold-liquidity-vs-repricing.md to teses/ section)

## 2026-04-29 (restructure)

- restructured — wiki taxonomy: `philosophy/` → `framework/`, `teses/` → `macro/`, new `assets/` (flat), new `portfolio/decisions/`
- moved — `wiki/philosophy/risk-first.md` → `wiki/framework/risk-first.md`
- moved — `wiki/teses/gold-liquidity-vs-repricing.md` → `wiki/macro/gold-liquidity-vs-repricing.md`
- created stubs — `framework/`: sizing-rules.md, short-criteria.md, portfolio-risk-limits.md, entry-exit-checklist.md, signals-registry.md
- created stubs — `macro/`: worldview.md
- created stubs — `assets/`: gold.md, silver.md, copper.md, uranium.md, energy-tech.md, semis.md
- created — `portfolio/decisions/` (tactical decisions folder, naming: YYYY-MM-DD-asset-action.md)
- removed — all README.md files from wiki/; navigation via index.md only
- updated — `wiki/index.md` (full restructure: new sections framework/, macro/, assets/, portfolio/decisions/)

## 2026-04-30

- cleanup — removed legacy empty dirs `wiki/philosophy/` and `wiki/teses/` (leftover after 2026-04-29 taxonomy restructure; never had committed content)

## 2026-05-01

- promoted — `wiki/assets/gold.md` stub → v3-final (NPSOV thesis: CB accumulation ~1,000t/yr, Bessent revaluation, miner optionality, four macro scenarios)
- promoted — `wiki/assets/silver.md` stub → v3 (dual monetary+industrial role: GSR 88x→60x avg, China strategic designation 2026-01-01, 800 Moz cumulative deficit, EV/solar demand)
- promoted — `wiki/assets/copper.md` stub → v2 (industrial backbone of energy transition: structural deficit, China demand, supply inelasticity; Eduardo conviction at building tier)
- promoted — `wiki/assets/uranium.md` stub → v3-final (supply-structural deficit: 175 Mlb demand vs ~150 Mlb production, 440+ reactors, 40% enrichment Russia, contracting cycle)
- promoted — `wiki/assets/semis.md` stub → v2 (AI infrastructure bet: memory as binding constraint, HBM cycle, BESI positioning, Citrini thesis)
- promoted — `wiki/macro/worldview.md` stub → v3 (macro worldview: dollar system rupture, three core themes, falsifier conditions, Hormuz precedent, AI disruption)
- updated — `wiki/index.md` (all six asset/macro entries updated from stubs to full one-line summaries)
mac-test Fri May  1 12:55:14 -03 2026
