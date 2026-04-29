# wiki/index.md — content-oriented index

> Karpathy convention (literal): *"content-oriented... each page listed with a link, a one-line summary"*.
>
> Source: [karpathy/llm-wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

This file is the **table of contents of the wiki**. Every page in `philosophy/`, `framework/`, and `teses/` should be listed here with a link and a one-line summary. When a new page is created, append it to the relevant section.

## philosophy/

- [risk-first.md](philosophy/risk-first.md) — Eduardo's core risk framework: signal vs noise, cash as weapon, sizing = knowledge proxy, three themes, tactical toolkit, macro as primary filter. Known gaps: G1–G5.

## framework/

*(empty)*

## teses/

- [gold-liquidity-vs-repricing.md](teses/gold-liquidity-vs-repricing.md) — gold's 2026 drawdown as dollar liquidity event (not thesis failure): mechanism, COVID analog, signals to watch, sizing implication.

## How to update

When adding a page anywhere in `wiki/`:

1. Append a line to the relevant section above:
   ```
   - [<page-title>](<path>) — <one-line summary>
   ```
2. Append an entry to `wiki/log.md` describing the addition.

When deleting or renaming a page, update both this file and `wiki/log.md`.
