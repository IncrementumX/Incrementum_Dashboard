---
name: incrementum-briefing
description: Generates Eduardo's daily Incrementum market briefing — macro tape wrap-up, top stories from the institutional source set (WSJ Heard on Street, Barron's, FT Lex, Reuters, Bloomberg digest, Valor, Estadão, Pipeline, BrazilJournal, NeoFeed), and portfolio + theme flags. Triggers on: "o briefing de hoje", "briefing", "morning digest", "daily news", "o que aconteceu hoje", "resumo do dia", "run the briefing". Produced by the Underwriter. Output is a structured chat response only — no files written.
metadata:
  author: Incrementum / Atlas Underwriter
  version: 1.0.0
  audience: Eduardo (CIO)
  output: chat response only (no filesystem writes)
  language: Portuguese (BR) — numbers and source URLs in English as-is
---

# incrementum-briefing

Daily market briefing produced by the Underwriter. Runs on demand or every morning. Output is a structured chat response — the CIO reads it, the Atlas agent (when running in the project environment) decides whether to archive it to `wiki/summaries/`.

---

## ARCHITECTURE NOTE

This skill produces **content only**. It does NOT write to any file, wiki, or queue. No `wiki/summaries/`, no `work_queues/monitor.md`. If you are running inside the Atlas project environment, the CIO agent routes the output after reading it. If you are running in Cowork or claude.ai, the output stays in chat.

---

## STEP 0 — CONTEXT CHECK

Before searching, check if the user has provided any of the following in this conversation:

- A date override ("briefing de ontem", "briefing de 2026-04-21") → use that date
- A Bloomberg terminal digest file (HTML/text) dropped into the conversation → treat as Bloomberg source, cred B
- A portfolio list (tickers + thesis) → use for "Posições vivas" in Seção 2

If no date is given, use today's date. If no portfolio is given, Seção 2 renders only the theme flags block (see Seção 2 below).

Do not ask clarifying questions. Start immediately.

---

## STEP 1 — MACRO PULL

Search for the following market closes / intraday levels. Use `web_search`. Prefer Bloomberg, Reuters, MarketWatch, Investing.com, B3/Anbima for the Brazilian instruments.

Instruments to retrieve (closing or most recent available):

| Instrument | Query hint |
|---|---|
| DXY (US Dollar Index) | "DXY dollar index close today" |
| UST 10Y yield | "US 10-year Treasury yield today" |
| WTI Crude Oil | "WTI crude oil price today" |
| Gold (XAU/USD) | "gold price today" |
| Silver (XAG/USD) | "silver price today" |
| DI curto BR (Jan-26 or front DI) | "DI futuro janeiro 2026 B3" or "DI1F26" |
| S&P 500 futures (ES1) or S&P 500 close | "S&P 500 futures today" or "S&P close today" |

For each instrument: record the level and the delta vs the prior close (e.g., `+0.8%`, `-12bp`, `+$18`). If a level cannot be retrieved, mark as `—` and flag in the footer.

---

## STEP 2 — SOURCE PULL

### Reading method — Chrome MCP first, web_search fallback

**If `mcp__Claude_in_Chrome__navigate` and `mcp__Claude_in_Chrome__get_page_text` tools are available** (Cowork with Claude in Chrome extension connected):

1. Get a tab via `mcp__Claude_in_Chrome__tabs_context_mcp` (createIfEmpty: true).
2. For each source, navigate to the URL and read with `get_page_text`. This uses Eduardo's logged-in browser session and bypasses paywalls.
3. If `get_page_text` exceeds the character limit, use `read_page` with `depth: 3` instead.
4. If navigation fails or returns no content, mark in footer and move on.

**If Chrome MCP is NOT available** (claude.ai without extension): use `web_search` with the fallback queries. Paywalled sources will return D-cred or empty — expected. Flag in footer.

---

### EN institucional

| Source | URL (Chrome MCP) | Search fallback | Priority |
|---|---|---|---|
| WSJ — Heard on the Street | `https://www.wsj.com/opinion/columns/heard-on-the-street` | `site:wsj.com "Heard on the Street" today` | HIGHEST |
| Barron's | `https://www.barrons.com/market-data` | `site:barrons.com market news today` | HIGH |
| FT — Lex | `https://www.ft.com/lex` | `site:ft.com "Lex" today` | HIGH |
| Reuters | `https://www.reuters.com/markets/` | `site:reuters.com markets today` | MEDIUM |
| Bloomberg | Terminal digest only — do NOT navigate Bloomberg.com | — | CONDITIONAL |

### BR

| Source | URL (Chrome MCP) | Search fallback |
|---|---|---|
| Valor Econômico — capa | `https://valor.globo.com` | `site:valor.globo.com economia today` |
| Valor — Broadcast | `https://valor.globo.com/financas/` | `site:valor.globo.com "Broadcast" today` |
| Estadão Economia | `https://economia.estadao.com.br` | `site:economia.estadao.com.br today` |
| Pipeline | `https://pipelinevalor.globo.com` | `site:pipelinevalor.globo.com today` |
| BrazilJournal | `https://braziljournal.com` | `site:braziljournal.com today` |
| NeoFeed | `https://neofeed.com.br` | `site:neofeed.com.br today` |

### Credibility tagging

Tag every item with `cred: A / B / C / D`:

- **A** — Primary source: company filing, press release, central bank statement, official data (CPI, payrolls, Selic decision).
- **B** — Institutional journalist at Heard on the Street / Lex / Broadcast / Pipeline reporting a named company move with byline. First-hand journalism. Content read via Chrome MCP from a logged-in session is treated as cred B minimum.
- **C** — General journalism (Reuters, Estadão, Valor capa) — reliable but less granular.
- **D** — Aggregated / search-derived / no primary source visible. Flag D-cred items as "needs validation."

---

## STEP 3 — THEME PULL (Seção 2 flags)

Search for news on each of the four active themes. These are standing flags — always present in the briefing regardless of portfolio state.

| Theme | What to look for |
|---|---|
| **Trump** | Executive actions, tariff moves, geopolitical signals from the White House, personnel changes, trade deals / threats |
| **Energia** | Oil & gas prices / OPEC+, US LNG exports, energy policy, renewables (offshore wind, solar policy), grid / electricity demand (data centers), Petrobras |
| **Fiscal americano** | US deficit, debt ceiling, Treasury auctions, fiscal packages in Congress, CBO projections |
| **Hard assets** | Gold, silver, copper, uranium — prices, demand signals (central bank buying, industrial offtake), supply events |

For each theme: one headline + one "why it matters" line + link. If nothing material today, write "Sem sinal relevante hoje."

---

## STEP 4 — POSIÇÕES VIVAS (conditional)

**If Eduardo has provided a portfolio in this conversation:**

For each live position ticker:
1. Search `"<TICKER>" site:wsj.com OR site:reuters.com OR site:valor.globo.com` and variants.
2. Cover: direct company news, peer/supplier/customer news, analyst actions.
3. Tag with `cred: A/B/C/D` and `action: INFO | WATCH | FLAG | KILL-SHOT-RISK`.

Action tag definitions:
- **INFO** — context, no action required.
- **WATCH** — developing situation, monitor daily.
- **FLAG** — material new information; CIO should review thesis.
- **KILL-SHOT-RISK** — news that could directly trigger a kill-shot rule on this position. Surface at the TOP of the portfolio block. Do not bury.

**If no portfolio has been provided:**

Render a placeholder:

```
### Posições vivas
_Aguardando composição do portfolio de Eduardo. Quando fornecida, esta seção cobrirá
cada ticker com notícias diretas, peers/fornecedores/clientes e tags de ação._
```

---

## STEP 5 — COMPOSE OUTPUT

Write the briefing in Portuguese (BR). Numbers, tickers, source URLs remain in their native form. Dates in ISO format (YYYY-MM-DD).

### Output structure (exact)

---

**BRIEFING INCREMENTUM — {YYYY-MM-DD}**
*{HH:MM BRT} | Underwriter*

---

**Wrap-up**

{4-5 lines of tape-language summary. Lead with the one narrative threading multiple sources today — the "story of the day." Second line: macro dashboard on one line:
`DXY {level} ({delta}) · UST10Y {yield}% ({delta}bp) · WTI ${price} ({delta}%) · Gold ${price} ({delta}%) · Silver ${price} ({delta}%) · DI Jan-26 {rate}% ({delta}bp) · S&P {level} ({delta}%)`
Close with the key implication for a BR-based investor.}

---

**Seção 1 — Notícias dos sites**

**WSJ — Heard on the Street**
> {Headline}
> {One line: why it matters.} [link] `cred: B`

**Barron's**
> {Headline}
> {Why it matters.} [link] `cred: C`

**FT — Lex**
> {Headline}
> {Why it matters.} [link] `cred: B`

**Reuters**
> {Headline}
> {Why it matters.} [link] `cred: C`

**Bloomberg** *(omit if terminal digest not provided)*
> {Headline}
> {Why it matters.} [terminal or link] `cred: B`

---

**Valor Econômico — Capa**
> {Headline}
> {Why it matters.} [link] `cred: C`

**Valor — Broadcast**
> {Headline}
> {Why it matters.} [link] `cred: B`

**Estadão Economia**
> {Headline}
> {Why it matters.} [link] `cred: C`

**Pipeline**
> {Headline}
> {Why it matters.} [link] `cred: B`

**BrazilJournal**
> {Headline}
> {Why it matters.} [link] `cred: C`

**NeoFeed**
> {Headline}
> {Why it matters.} [link] `cred: C`

---

**Seção 2 — Portfolio + Flags**

**Posições vivas**
{Render per-ticker blocks if portfolio provided. Otherwise render the placeholder from Step 4.}

**Flags de temas**

🇺🇸 **Trump**
> {Headline} — {Why it matters.} [link] `cred: {X}`

⚡ **Energia**
> {Headline} — {Why it matters.} [link] `cred: {X}`

💸 **Fiscal americano**
> {Headline} — {Why it matters.} [link] `cred: {X}`

🪨 **Hard assets**
> {Headline} — {Why it matters.} [link] `cred: {X}`

---

*Gerado: {YYYY-MM-DD HH:MM BRT}*
*Fontes consultadas: {comma-separated list of sources that returned results}*
*Fontes sem resultado / inacessíveis: {any source that failed or returned nothing — transparency is non-negotiable}*
*Dados de mercado: {sources used for macro levels}*

---

---

## CONSTRAINTS

1. **Never surface a claim without a source tag.** If the source can't be named, the claim doesn't run.
2. **Never write to any file.** This skill produces a chat response only. No exceptions.
3. **Never search Bloomberg.com freely.** Paywalled and search results are unreliable. Only use Bloomberg if Eduardo drops a terminal export into the conversation.
4. **Never skip the footer.** The "sources that failed" line is not optional — it tells Eduardo what he didn't see today.
5. **Never fabricate a level or a delta.** If a macro instrument can't be retrieved, write `—` and list it in the footer.
6. **Never expand the theme list.** The four themes (Trump, energia, fiscal americano, hard assets) are fixed until Eduardo changes them. Do not add AI capex, defense, or sovereign credit unless explicitly instructed.
7. **D-cred items** must be flagged as "needs validation." They do not get promoted without a cred upgrade from the user.
8. **KILL-SHOT-RISK items** surface at the TOP of the portfolio block, ahead of INFO/WATCH/FLAG items. Do not bury them.
9. **Keep the wrap-up to 4-5 lines.** If you can't say it in 4-5 lines, you don't understand it yet.

---

## FUTURE WIRING (sprint 2+)

- Perplexity Agent API (`PERPLEXITY_API_KEY`) as the pull engine — faster, structured source-set queries.
- Telegram bot push of the wrap-up block to Eduardo's phone when the briefing is ready.
- Atlas CIO agent archives the briefing to `wiki/summaries/<YYYY-MM-DD>-briefing.md` after reading (handled by the agent, not this skill).

---
