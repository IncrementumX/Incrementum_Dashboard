# Atlas — work_queues/monitor.md

_Thesis-drift flags from the atlas-monitor skill. Anything that could move a position from live → watch → reject._

## Schema

```
### <flag_id> — <ticker or theme> — <YYYY-MM-DD HH:MM>
Trigger: <which triggering rule from FRESHNESS.md §4 fired>
Observed: <the data point that tripped the rule, with source tag>
Severity: critical | high | medium | low
Recommended: <one-liner: refresh / re-read / kill-shot review>
Status: open | triaged | closed
CIO action: <blank until CIO triages>
```

`critical` means: a documented kill-shot trigger for a live position fired. CIO reviews same session.
`high` / `medium` / `low` are priority hints for weekly review.

## Open flags

_None yet — Atlas in bootstrap phase._

## Closed tail (last 10)

_None yet._
