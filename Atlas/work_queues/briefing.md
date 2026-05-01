# Atlas — work_queues/briefing.md

_Daily briefing queue. Perplexity Agent API feeds this when wired; until then, manual or Claude web_search._

## Schema

```
### <task_id> — <YYYY-MM-DD> daily briefing
Requested_by: cron | cio | eduardo
Requested_at: <YYYY-MM-DD HH:MM>
Target: list of tickers / themes to cross-reference
Status: queued | in-flight | done | failed
Assigned_to: atlas_underwriter (briefing skill)
Output: wiki/summaries/<YYYY-MM-DD>-briefing.md
```

## Standing target list

Cross-reference every briefing pull against:

- Live positions: BESI, HII, AGQ.
- Active watchlist: (see [`agents_context/state.md`](../agents_context/state.md))
- Active themes: AI capex / advanced packaging, US defense cycle, sovereign credit / reserve regime.

## Source set (when Perplexity is wired)

- English: WSJ, Barron's, FT, Bloomberg terminal export if available.
- BR: Valor, Estadão, Pipeline, BJ, NeoFeed.
- IR: company pages for each live position + top-10 watchlist.
- Sell-side digests: whatever Eduardo forwards that week.

## Queue

_Empty — Perplexity not yet wired, no manual briefing yet._
