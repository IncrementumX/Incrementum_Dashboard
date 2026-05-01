# Incrementum Review Cadence

_The review rhythm. Daily, weekly, monthly. Each cadence has a different question it answers._

## Daily (market day)

**Question:** what changed overnight / in today's session that matters to the book?

**Ritual:**
1. CIO reads `wiki/summaries/<today>-briefing.md` (produced by `atlas-briefing` at 07:00 São Paulo).
2. CIO reads `work_queues/monitor.md` — any new flags?
3. CIO reads `agents_context/issues.md` — any blockers?
4. If any CRITICAL flag on a live position fired → same-session review, possible kill-shot verdict.
5. Otherwise: note the day, log any HIGH flags for next review.

**Runtime:** 10–20 minutes for the CIO in a quiet market. 30–60 minutes on a day with material news.

## Weekly (Sunday evening, São Paulo)

**Question:** is each position still the position we thought it was? Is the wiki clean?

**Ritual:**
1. Underwriter runs `atlas-monitor` on full freshness sweep — surfaces stale sources.
2. Associate runs weekly wiki lint (contradictions, orphans, stale claims, missing source tags).
3. CIO reviews each live position page: does the TL;DR still describe what we own? Are kill-shots still valid?
4. CIO reviews the watchlist: are there names ripe to escalate to assessment? Names to reject?
5. Decisions filed in `wiki/decisions/<YYYY-MM-DD>-weekly-review.md`.

**Runtime:** 1.5–3 hours. Non-negotiable. Skipping weekly review is how theses decay unnoticed.

## Monthly (first Sunday of month)

**Question:** is the framework itself still right? Are the themes we care about still the right themes?

**Ritual:**
1. CIO re-reads `wiki/principles/`. Anything that feels wrong? File an amendment proposal for Eduardo.
2. CIO re-reads `wiki/themes/`. Any theme that's played out? Any new theme worth a dedicated page?
3. CIO reviews `governance/SOURCE_POLICY.md` and `governance/FRESHNESS.md` — any source class that's been systematically wrong? Any freshness window that's been too loose or too tight?
4. Underwriter reviews `skills/` — any skill that's been underused / broken / duplicative?
5. Amendments proposed to Eduardo. He approves or rejects. Approved ones get filed.

**Runtime:** 2–4 hours. Can be skipped 1–2 times per year (Christmas, vacation) but not more.

## Quarterly (per position)

**Question:** if I were initiating this position today from scratch, would I still initiate it?

**Ritual:**
1. Each live position gets a fresh assessment-level re-read. Underwriter runs `atlas-assessment` with `task: refresh` on the ticker.
2. Compare the refreshed thesis against the current page. Material divergences → edit the page + log.
3. Re-derive sizing. Is the position still the right % of book? If the thesis is the same but smaller than originally sized, size up. If the thesis has leaked conviction, size down or close.
4. CIO verdict on each: HOLD / SIZE UP / SIZE DOWN / EXIT.

**Runtime:** 2–4 hours per position, per quarter. For a 3-position book, that's ~10 hours per quarter of dedicated review.

## Annual (January)

**Question:** did Atlas, as a system, do what it was supposed to do this year?

**Ritual:**
1. Underwriter produces an annual performance review, including: P&L attribution per position, hit rate on kill-shots (did they fire on time?), hit rate on watchlist-to-position conversions, Associate rejection rate + hit rate.
2. CIO writes an annual note on process failures — not just outcome failures. Did we hold past a kill-shot? Did we miss a briefing for weeks? Did the Associate let something through that was later wrong?
3. Eduardo reviews both and proposes structural changes for the coming year.

## What this cadence is not

- Not a reporting schedule to an outside party. Atlas is internal.
- Not a trading schedule. Trades are triggered by kill-shots / catalysts / PASS verdicts, not by review dates.
- Not a rigid checklist to complete mechanically. The cadences are questions, not tasks. If the question has no material answer this week, the review is short.

## Log

- 2026-04-17 — Initial write.
- 2026-04-18 — Added quarterly and annual tiers.
