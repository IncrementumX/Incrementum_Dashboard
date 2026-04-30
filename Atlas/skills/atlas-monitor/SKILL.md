---
name: atlas-monitor
description: Thesis-drift detection on live positions. Reads wiki/positions/*.md, checks the page's kill-shot triggers + freshness windows against today's data (price, consensus, filings, news). Writes flags to work_queues/monitor.md. Runs after every briefing digest, after any sell-side update Eduardo drops, and on-demand when CIO asks. Critical severity = documented kill-shot fired — CIO reviews same session.
type: skill
owner: atlas-underwriter
model: claude-sonnet
audience: CIO (consumes monitor flags for kill-shot decisions)
---

# atlas-monitor — thesis-drift detection

Monitor is the operation that keeps live positions honest. Without it, a thesis lingers long past its validity. With it, kill-shots fire on time.

## Trigger conditions

Monitor runs:
1. **After every `atlas-briefing`** — the briefing digests news, monitor cross-checks against live-position trigger rules.
2. **On Underwriter ingest** — whenever a new filing, sell-side note, or major news item is ingested into `raw/` with potential position impact.
3. **On CIO request** — "refresh my monitor on BESI" type queries.
4. **On scheduled freshness sweep** — weekly, checks whether any source on a live-position page has aged past its FRESHNESS revalidation window.

## Inputs

- `agents_context/state.md` — which positions are live.
- `wiki/positions/*.md` for each live position — the kill-shot triggers, freshness windows, thresholds.
- Latest data sources:
  - Price (last close + intraday if available — tag `cred: A` if primary exchange feed).
  - Consensus estimates (street aggregates from sell-side notes in `raw/research/` — tag `cred: B`).
  - Recent filings (primary — `cred: A`).
  - Recent news (from briefing output — tag source appropriately).
- `governance/FRESHNESS.md` for revalidation schedules.

## The 4 triggering rule families

(Per `governance/FRESHNESS.md` §4.)

### Family 1 — price-based

If today's close moves > 1.5σ (trailing 60-day) vs benchmark (QQQ for tech, DXJ for Japan, AMLP for energy, etc.), raise a flag. If the move is directional with a named catalyst (earnings, filing, news item), link the catalyst. If unexplained, mark severity HIGH — unexplained gaps are often the tell.

### Family 2 — fundamental / filing-based

New 10-Q / 20-F / 8-K / 6-K / press release filed since last monitor run on the ticker. Check:
- Does the filing contain any data point that updates a number on the position page? (Revenue, margin, backlog, guidance, etc.)
- Does it contain anything that would trigger a documented kill-shot rule?

Severity: HIGH for any kill-shot-relevant filing. MEDIUM otherwise.

### Family 3 — consensus revisions

Has street NTM consensus moved > 3% in either direction for revenue or EPS since last monitor run? If so, flag. Large revision = thesis pressure (in either direction).

Severity: MEDIUM unless the move directly crosses a kill-shot threshold.

### Family 4 — source / freshness

Any source on the position page whose `pulled` date is past the FRESHNESS revalidation window for its type. Flag for Underwriter to refresh.

Severity: LOW (unless the stale source is the sole support for a kill-shot trigger, in which case HIGH).

## Output: `work_queues/monitor.md`

Use the schema already defined in the file header. Every flag gets:
- `flag_id` (timestamp-based).
- `ticker or theme`.
- `Trigger` (which rule fired).
- `Observed` (the data point with source tag).
- `Severity`.
- `Recommended` (refresh / re-read / kill-shot review).
- `Status` (open — CIO closes once triaged).

### Critical severity protocol

If a CRITICAL flag fires (documented kill-shot trigger on a live position):
1. Write to `work_queues/monitor.md` with `Severity: critical`.
2. Write to `agents_context/issues.md` with `Severity: blocker` — forces CIO attention.
3. If the CIO has notifications wired (future Telegram bridge), push a notification.
4. Do NOT auto-close. Wait for CIO explicit review and verdict.

The CIO's response on a critical flag is almost always: EXIT. Not "consider." Not "trim." The kill-shot discipline is the point of the system.

## Process

1. Read `agents_context/state.md` → list of live positions.
2. For each live position:
   - Read `wiki/positions/<ticker>.md` → list of kill-shot triggers + freshness windows.
   - Pull latest price, consensus, filing status.
   - Cross-check against the 4 rule families.
   - For any hit, draft a flag.
3. Write all flags to `work_queues/monitor.md`.
4. Escalate CRITICALs per protocol.
5. Append to `wiki/log.md`: `MONITOR <timestamp> <task_id> -> <N flags> (crit: X, high: Y, med: Z, low: W)`.

## Boundaries

1. **Never close a CRITICAL flag without CIO action.** Only the CIO closes kill-shot fires, with an explicit EXIT or EXPLICIT OVERRIDE verdict (override is rare and must be documented).
2. **Never fabricate a price or consensus move.** If primary data isn't available, say so — do not approximate.
3. **Never skip a run just because nothing looks interesting.** A monitor run with zero flags is a valid output — it records that the position was checked. Log it anyway.
4. **Never fire a CRITICAL on untagged data.** CRITICAL flags are kill-shot-tier — the data supporting them must be A/B cred.
5. **Never run monitor on positions not in `state.md`.** The source of truth for live is `state.md`.

## End of file
