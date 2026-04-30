# Atlas — SOURCE_POLICY.md

_Every quantitative claim written into `wiki/` must carry a source tag. Associate vetoes the rest._

## 1. The tag

Inline format — put it right next to the value, not in a footnote:

```
EBITDA FY24 €582M [src: BESI_2024_20F.pdf#p41, pulled: 2026-03-12, cred: A, owner: underwriter]
```

Fields:

| Field | Meaning | Required |
|---|---|---|
| `src` | Path under `raw/` OR a versioned URL (archive.org preferred for web). | yes |
| `pulled` | ISO date Atlas pulled the value (YYYY-MM-DD). Not the source-doc date. | yes |
| `cred` | Credibility bucket A / B / C / D. See §2. | yes |
| `owner` | Agent that filed the claim (`cio` / `underwriter` / `associate`). | yes |

For qualitative claims (judgment, interpretation, "management tone"), `src` + `owner` are required; `pulled` + `cred` are optional but recommended.

## 2. Credibility buckets

| Bucket | Examples | Notes |
|---|---|---|
| **A** | SEC/CVM filings, audited financials, company IR, central bank releases, exchange data, Bloomberg terminal pulls. | Primary. Reasoning-grade. |
| **B** | Reputable sell-side (GS, MS, JPM, BBG research), mainstream specialist press (WSJ, FT, Barron's, Valor, Estadão). | Needs cross-check for quantitative claims. |
| **C** | Generalist press, analyst blogs, Substacks with track record, press releases. | OK for context, not as sole source for a position-level claim. |
| **D** | Twitter/X posts, Reddit, anonymous forums, unverified screenshots, Perplexity synthesis without primary link. | Signal only. Never as sole source. Atlas logs but does not reason on these. |

Perplexity output has a documented ~37% fabricated-citation rate (Columbia Journalism Review benchmark). Treat its output as **D until validated**, after which the validated primary source becomes the citation — never Perplexity itself.

## 3. What MUST be tagged

- Every number that enters a valuation, a thesis, a risk-sizing, or a trigger.
- Every management statement quoted or paraphrased in a memo.
- Every macro print referenced in a theme or macro page.
- Every comp multiple.

## 4. What does NOT need a tag

- Definitions, framework descriptions, Druckenmiller quotes from `wiki/principles/`.
- Claude/agent-generated prose explaining what a term means.
- Structure / navigation content in `wiki/index.md`.

## 5. Rejection behavior

Associate runs `source-lint` on every Underwriter write. If it finds:

- A quantitative claim without `src` → **REJECT** with an entry in `reviews/<task_id>-review.md` and an issue in `agents_context/issues.md`.
- A `cred` of C on a position-level claim with no B/A cross-check → **REJECT**, demand cross-check.
- A `cred` of D anywhere in `wiki/positions/` or `wiki/macro/` → **REJECT**.
- A `pulled` date older than the freshness window for that data type (see `FRESHNESS.md`) → **REJECT** with refresh request.

Underwriter reworks. Loop until PASS.

## 6. Source-id conventions

Files under `raw/`:

```
raw/filings/<ticker>/<year>-<form>.pdf           e.g. raw/filings/BESI/2024-20F.pdf
raw/research/<broker>/<ticker>-<YYYYMMDD>.pdf    e.g. raw/research/GS/BESI-20260312.pdf
raw/news/<YYYYMMDD>-<slug>.md                    e.g. raw/news/20260415-besi-capex-cut.md
raw/transcripts/<ticker>-<YYYYMMDD>-<event>.md   e.g. raw/transcripts/BESI-20260124-Q4CC.md
raw/briefings/<YYYYMMDD>.md                      e.g. raw/briefings/20260417.md
```

URLs: prefer `web.archive.org/web/<ts>/<url>` when available. If not, include the live URL and open a task to archive it.

## 6b. Portuguese-language sources

For BR-specific work (Faria Lima names, BCB/CVM/BB prints):

- Valor, Estadão, Pipeline, BJ, NeoFeed → **B** by default.
- BCB / CVM / Tesouro filings → **A**.
- Broker research in Portuguese (BTG, XP, Itaú BBA, BB) → **B**.
- Translate key quotes to English in `wiki/` but keep the original phrase in parentheses when nuance matters.

## 7. Versioning

When a value is revised (e.g., earnings restatement):

- Keep the old tag in place, add `| superseded-by: <new_src_id>` at the end.
- Add a new tagged value below.
- Never silently overwrite a tagged claim. The history of the tag is part of the audit trail.

## 8. Enforcement

Associate's `source-lint` script (to be added under `Atlas/skills/atlas-associate/` in a later sprint) walks `wiki/**`, parses tags, and checks the four rejection rules in §5. Until the script exists, Associate runs the checks by hand on every review.
