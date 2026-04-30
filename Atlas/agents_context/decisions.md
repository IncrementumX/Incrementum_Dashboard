# Atlas — decisions.md

_Append-only log of CIO verdicts. Newest at the bottom. One entry per verdict. Never edit a past entry — write a new entry if the view changes._

_Each verdict also has a full companion page under `wiki/decisions/<YYYY-MM-DD>-<slug>.md`. This file is the tail; the wiki page is the detail._

## Schema

```
### <YYYY-MM-DD> <ticker-or-theme> — <verdict>
Task: <task_id>
Driver: <one-line thesis or trigger that forced the verdict>
Sizing: <pre → post, if relevant>
Companion: wiki/decisions/<YYYY-MM-DD>-<slug>.md
```

Verdict values: `PASS` (take position / size up), `WATCH` (promote to watchlist / hold), `REJECT` (pass / trim / exit), `HOLD` (no change, thesis still valid).

---

## Log

_2026-04-17 — Atlas governance bootstrapped. No verdicts yet. First entries come after PARO 3 (seeding the three live positions with their existing thesis, sizing, and triggers)._
