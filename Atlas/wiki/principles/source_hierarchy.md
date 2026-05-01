# Source Hierarchy

_Rules for tagging, weighting, and rejecting sources. The Source Policy (`governance/SOURCE_POLICY.md`) is the operational spec. This page is the principle behind it._

## The four buckets

### A — Primary, audited, authoritative

- SEC filings: 10-K, 10-Q, 8-K, 20-F, 6-K, proxy statements (DEF 14A).
- Central bank releases and policy statements (Fed, ECB, BCB, BoJ, BoE, PBoC).
- Company IR pages: confirmed financial statements, confirmed press releases.
- Earnings call transcripts (primary — not a paraphrase).
- Audited rating-agency reports (Moody's, S&P, Fitch) on specific issuers.
- Bloomberg Terminal data for prices, yields, FX (where Eduardo has pulled a snapshot into `raw/`).

A-cred is the gold standard. Anything load-bearing on a position-level thesis should rest on at least one A-cred source.

### B — Reputable secondary

- Major news outlets: WSJ, Barron's, FT, Reuters, Bloomberg news (not terminal).
- Valor Econômico, Estadão, Brazil Journal, Pipeline, NeoFeed.
- Nikkei, Handelsblatt, major European and Asian business press.
- Major sell-side research (bulge-bracket, top-10 boutiques).

B-cred is the common working bucket. News stories, sell-side theses, industry commentary. Reliable but secondary — if a B-cred says something the primary source hasn't confirmed yet, flag the gap.

### C — Useful but specific

- Boutique sell-side and independent research houses.
- Industry analyst firms (Gartner, IDC, SemiAnalysis, TrendForce).
- Trade publications (EETimes, Defense News, Oil & Gas Journal).
- Top-tier Substacks with named authors and verifiable credentials.

C-cred on position-level claims requires an A or B cross-reference. Alone, C is decorative — not load-bearing.

### D — Unvalidated

- Social media (X/Twitter, LinkedIn posts, Reddit).
- Anonymous blogs.
- Perplexity or LLM-generated answers without validated citations (Columbia Journalism Review benchmark: Perplexity shows 37% fabricated citation rate).
- Any source Eduardo has not verified the origin of.

D-cred stays OUT of position pages. Stays in briefing digests as "flagged, needs validation" until cross-referenced to A/B. A D-cred source on a sizing rationale = automatic Associate REJECT.

## Tag format

Every quantitative claim in any Atlas wiki page carries:

```
[src: <file_path_or_url>, pulled: <YYYY-MM-DD>, cred: <A|B|C|D>, owner: <agent>]
```

Example:
```
EBITDA FY24 €582M [src: raw/filings/BESI_2024_20F.pdf#p41, pulled: 2026-03-12, cred: A, owner: underwriter]
```

## Rejection behavior

- **No src tag** → Associate REJECT. The claim doesn't enter the wiki.
- **D-cred on a position page** → Associate REJECT. Must be validated or removed.
- **C-cred alone on a position-level sizing rationale** → Associate REJECT. Needs A/B cross-ref.
- **Src tag points to unreachable file/URL** → Associate REJECT pending repair.
- **Pulled date past FRESHNESS window for source type** → Flag (not auto-reject); Underwriter revalidates.

## Why this exists

Because the single most dangerous failure mode in AI-assisted research is confident fabrication. An LLM will cheerfully cite a 10-Q page that doesn't exist. The source-tagging regime is the structural defense — no claim enters without a verifiable pointer, and the Associate validates. This is why Atlas is different from "I asked ChatGPT."

## Log

- 2026-04-17 — Initial write.
- 2026-04-18 — Added Associate rejection protocol.
