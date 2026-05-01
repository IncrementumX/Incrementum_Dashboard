---
name: atlas-assessment
description: Full Incrementum framework read on a company. 2-4 hours of Underwriter work. Produces a durable wiki/positions/<ticker>.md (or watchlist/<ticker>.md for pre-position names) with thesis, evidence, triggers, sizing logic, contradictions, related themes. Deliverables optionally exported as Word/PPT via docx/pptx skills. Orchestrates atlas-model when quantitative work is required. All output source-tagged, Associate-reviewed, CIO-verdictable.
type: skill
owner: atlas-underwriter
model: claude-opus (deep framework work) + claude-sonnet (auxiliary pulls)
audience: CIO (for verdict) + Eduardo (for conviction)
---

# atlas-assessment — Incrementum framework read

This skill does the Underwriter's deepest work short of a live-position memo. It is the skill that produces a `wiki/positions/<ticker>.md` page you can live-trade off of.

## Scope

**In:** full Incrementum framework across company, industry, macro, valuation, triggers, risk. Durable wiki page. Optional Word/PPT deliverable.

**Out:** intraday monitoring (use `atlas-monitor`), multi-name screens (use `atlas-snapshot` in batch), daily briefings (use `atlas-briefing`).

Typical runtime: 2–4 hours of Underwriter time. If it's going past 6 hours, decompose into sub-tasks.

## Prerequisites

Before running an assessment:
- A snapshot should have preceded this (unless Eduardo explicitly skips). The snapshot's routing note should say "ROUTE TO ASSESSMENT."
- `raw/` should contain: the last 2 10-Ks/20-Fs, last 4 quarterly filings, last 4 earnings call transcripts, any relevant sell-side research Eduardo has forwarded. If these are missing, pull them first and log the ingestion.

## The Incrementum framework

Eduardo's framework (baked into how he thinks about positions). The assessment page MUST cover each of these sections — missing sections = Associate-reject.

### 1. Thesis (the one-pager)

- **TL;DR** (3 lines): why this stock, priced into what, what needs to happen.
- **Central claim** in one sentence. What does Eduardo believe that the market doesn't, and on what time horizon.
- **Setup type**: moonshot/compounder / asymmetric event / hedge. State which and why.

### 2. Evidence (the meat)

Organized into:
- **Secular / structural** (multi-year drivers — secular growth, share gain, structural margin expansion).
- **Cyclical** (short/medium-term catalysts — order book, industry capex cycle, event-specific catalysts).
- **Management / capital allocation** (the jockey — track record of M&A, buybacks, capex discipline, governance).
- **Competitive position** (the moat — structural advantage vs peers, pricing power, switching costs).

Every evidence bullet carries a `[src: ..., pulled: ..., cred: ...]` tag. No exceptions. Target: 15–25 evidence bullets total; more than 40 = you're padding.

### 3. Valuation

- Current multiples: P/E, EV/EBITDA, EV/Sales, P/B (whichever is sector-appropriate) vs peer + vs own 5-year history.
- What is the market pricing (implied growth, margins, or terminal value)?
- What does Atlas think is right (use `atlas-model` for the DCF / SOTP / reverse DCF).
- Upside-base-downside scenarios with probability weights.
- Source for every comp and every input.

### 4. Triggers

Two buckets:

- **Upside triggers** (the "what could make this work" list): next 1–3 earnings prints, specific product launches, regulatory decisions, macro data points. Each trigger has a date (or date range), a metric, and a threshold.
- **Kill-shot triggers** (the "what would make you cut" list): specific falsifiable conditions that would end the position. Must be concrete (numbers + dates), not vibes. A kill-shot rule must be clear enough that a different portfolio manager reading the page in 6 months could check it mechanically.

The kill-shot list is the most important section of a position page. If you can't write 2–4 concrete kill-shot triggers, the thesis is not specific enough to own.

### 5. Sizing

- Recommended % of book, given:
  - Incrementum concentration doctrine (book has 3–5 positions total).
  - Risk budget / max drawdown stops.
  - Correlation with existing positions (don't accidentally run two names that are the same trade in disguise).
- Entry band (price range for initiation).
- Stop loss (price, % drawdown, or fundamental).
- Scaling plan (single-lot vs layered).

The Associate will quant-sanity this. Be ready to defend with arithmetic.

### 6. Risks / contradictions

- Top 3–5 risks that are not already in the kill-shot list (i.e., risks that won't automatically trigger an exit but could still hurt).
- Internal contradictions: places where your evidence cuts against itself. Name them. Do not hide them — the Associate will find them, and the CIO will respect you more for surfacing them first.
- Links to `wiki/contradictions/` where applicable.

### 7. Related

- Themes this position plays into (`wiki/themes/<theme>.md` links).
- Related positions / watchlist names (if this is a sister position).
- Source documents (all A-cred primaries used).

### 8. Log (on the page itself)

Append-only. Every update to the page logs a line: `<YYYY-MM-DD> — <change> — [task_id]`. This gives the CIO a view of how the thesis has evolved.

## Process

1. **Check prerequisites.** Raw sources present? Snapshot complete? If not, back up.
2. **Read in full.** Read the last 2 annual filings, last 4 quarterly filings, last 4 transcripts, any dropped sell-side. Take notes in `reviews/<task_id>-notes.md` (Underwriter scratch, not for wiki).
3. **Build the model.** Dispatch `atlas-model` if quant-heavy (DCF, SOTP, reverse-DCF, peer comp table). The model output lands in `wiki/positions/<ticker>.md#valuation` section.
4. **Write the page.** Follow the 8-section structure above. Every claim tagged.
5. **Self-check against the framework.** Does every section exist? Are kill-shots concrete? Does the sizing have arithmetic?
6. **Stage for Associate review.** Move to `reviews/<task_id>-review.md` equivalent. Update `work_queues/analysis.md` status to `review`.
7. **Address Associate feedback.** Fix issues. Re-stage.
8. **Deliver to CIO.** The CIO verdicts. Page is filed at `wiki/positions/<ticker>.md` (if PASS/WATCH) or `wiki/watchlist/rejected/<ticker>-<YYYY-MM-DD>.md` (if REJECT).
9. **Log.** `INGEST <timestamp> <task_id> assessment-<ticker> -> positions/<ticker>.md`.

## Optional: Word/PPT export

If Eduardo or the CIO requests a formal memo:
- Word: use `docx` skill. Output goes to `docs/memos/<YYYY-MM-DD>-<ticker>.docx`.
- PPT: use `pptx` skill. Output goes to `docs/ic-preps/<YYYY-MM-DD>-<ticker>.pptx`.
- Incrementum aesthetic: light palette (#FAFAF7 bg, #0F1A2E text, #6889B4 accent), serif headings where supported, no emoji, source set bottom of every doc.
- Export is DERIVATIVE — the wiki page is source of truth. If the Word doc and the wiki page diverge, the wiki wins.

## Boundaries

1. **Every section of the framework must appear.** Missing sections = Associate-reject = rework.
2. **Every quant claim must be source-tagged.** No exceptions, not even "back of envelope." Label BOTE as BOTE explicitly and source the inputs.
3. **Kill-shot triggers must be concrete.** "If the thesis breaks" is not a kill-shot. "If hybrid bonding share of BESI new orders falls below 12% for two consecutive quarters" is a kill-shot.
4. **Never skip Associate review for live positions.** Watchlist names can skip if the CIO pre-approves a lighter review cycle. Positions cannot.
5. **Never deliver a Word/PPT memo without also writing the wiki page.** The wiki page is source of truth. Everything else is derivative.
6. **Maximum 8 hours of Underwriter time.** If it's bigger, break into sub-assessments.

## End of file
