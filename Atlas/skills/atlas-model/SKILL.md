---
name: atlas-model
description: Numeric work for Atlas. Comps tables, DCF, reverse-DCF, SOTP, sensitivity analysis, peer-comp scorecards, consensus revision tracking. Base layer is anthropics/financial-services-plugins — always start there, don't build from scratch. Outputs fill the #valuation section of wiki/positions/<ticker>.md + optional Excel artifact in models/<ticker>.xlsx.
type: skill
owner: atlas-underwriter
model: claude-opus (structural design of models) + claude-sonnet (iteration)
base_layer: github.com/anthropics/financial-services-plugins
audience: Underwriter (atlas-assessment orchestrates this)
---

# atlas-model — numeric work

This skill is dispatched by `atlas-assessment` whenever quantitative work is required. It can also be called standalone by the CIO ("rerun the BESI reverse-DCF with updated consensus").

## Do not start from scratch

`anthropics/financial-services-plugins` is vendored at `Atlas/vendor/financial-services-plugins/` (git subtree, inline). The `equity-research` plugin provides the base layer:

| Task | Vendored skill to load first |
|---|---|
| Earnings analysis / post-print memo | `Atlas/vendor/financial-services-plugins/equity-research/skills/earnings-analysis/SKILL.md` |
| Initiating coverage / IC memo skeleton | `Atlas/vendor/financial-services-plugins/equity-research/skills/initiating-coverage/SKILL.md` |
| Earnings preview (pre-print setup) | `Atlas/vendor/financial-services-plugins/equity-research/skills/earnings-preview/SKILL.md` |
| Catalyst-date tracking | `Atlas/vendor/financial-services-plugins/equity-research/skills/catalyst-calendar/SKILL.md` |
| First-pass snapshot / idea generation | `Atlas/vendor/financial-services-plugins/equity-research/skills/idea-generation/SKILL.md` |
| IC memo structure (PE-style cross-check) | `Atlas/vendor/financial-services-plugins/private-equity/skills/ic-memo/SKILL.md` |
| Deal-screening framework | `Atlas/vendor/financial-services-plugins/private-equity/skills/deal-screening/SKILL.md` |

Additional vendor context: `Atlas/vendor/README.md` — describes the full plugin inventory and upgrade procedure.

**Rule:** before writing any model logic yourself, check the vendored skill. If the tool exists, read its SKILL.md and customize on top. If it doesn't exist in the vendor, implement cleanly enough to upstream.

## Tasks this skill handles

### 1. Comps

- Peer set definition (document the "why these peers" reasoning).
- Pull multiples: P/E, EV/EBITDA, EV/Sales, P/B, FCF yield, ROIC (whichever are sector-appropriate). All from primary sources where possible.
- Versus-history (5-year medians, quartiles).
- Versus-peer (current median, dispersion).
- Output: markdown table in `wiki/positions/<ticker>.md#valuation` + optional Excel in `models/<ticker>-comps.xlsx`.

### 2. DCF / reverse-DCF

- Revenue build (by segment, by geography if material).
- Margin build (gross, operating, net).
- Capex / working capital assumptions.
- Discount rate (WACC with its own build — equity beta, credit spread, risk-free rate, weights).
- Terminal value: Gordon vs multiple approach, disclose which.
- Scenarios: bear / base / bull, each with probability weight.
- Reverse-DCF: solve for the growth rate / margin path the current price implies. This is often more useful than forward DCF — it tells you what the market is pricing.
- Output: assumptions table + scenario table in the position page. Excel in `models/<ticker>-dcf.xlsx` if committed.

### 3. SOTP (sum-of-the-parts)

For conglomerates / multi-segment businesses.
- Segment-by-segment valuation with explicit methodology (comp multiple, DCF, book-plus, asset-backed).
- Holding company discount / conglomerate premium.
- Net debt / minority / pension adjustments.
- Output: SOTP table in the position page.

### 4. Sensitivity

- Tornado charts for DCF (which inputs move fair value the most).
- Two-way tables for valuation (growth × margin, WACC × terminal g).
- Outputs: 2–3 clear sensitivity tables in the position page. No 15-dimensional hypercubes — nobody reads those.

### 5. Consensus revision tracking

- Street estimates vs Atlas estimates for revenue, EBITDA, EPS over forward 4 quarters + 2 years.
- Change in street numbers over rolling 3 / 6 / 12 months.
- Flag if street is converging toward Atlas's view (thesis working) or diverging (thesis under pressure).
- Source: FactSet / Bloomberg / sell-side trackers. Where unavailable, use the last 6 sell-side initiations / updates and compute your own.

## Process

1. **Identify the task.** Which of the above is being asked for? Don't do all of them unless the assessment explicitly requested the full package.
2. **Load the relevant plugin.** From `anthropics/financial-services-plugins`. Read the plugin's spec before writing inputs.
3. **Pull inputs.** From `raw/` primarily. Tag every input with `[src: ...]`.
4. **Run.** Execute the plugin. If it fails, check inputs before blaming the plugin.
5. **Sanity-check.** Before committing output to the wiki page:
   - Do the numbers tie to the source documents?
   - Are the assumptions in a plausible band?
   - Does the output answer the question the assessment is asking?
6. **Write output.** Fill the `#valuation` section of `wiki/positions/<ticker>.md`. If Excel committed, path it to `models/<ticker>-<type>.xlsx` and link from the wiki page.
7. **Hand to Associate.** The Associate runs quantitative sanity over everything this skill produces.

## Output format (wiki#valuation section)

```markdown
## Valuation

### Current multiples
| Metric | <Ticker> | Peer median | 5y median self |
|---|---|---|---|
| P/E (NTM) | xx.xx | xx.xx | xx.xx |
| EV/EBITDA (NTM) | xx.xx | xx.xx | xx.xx |
| ... | | | |

Source: [src: ...]

### What's priced in
<Prose: implied growth, margins, terminal. What would you have to believe?>

### Atlas view
<Prose: our estimates, where they differ from street.>

### Scenarios
| Scenario | Prob. | TP | Upside |
|---|---|---|---|
| Bear | 25% | $xx | -xx% |
| Base | 55% | $xx | +xx% |
| Bull | 20% | $xx | +xx% |

### Sensitivities
<1-2 tables.>

### Consensus revisions
<Rolling change table or brief prose if limited.>

[Model artifact: models/<ticker>-dcf.xlsx, last updated <date>.]
```

## Boundaries

1. **Never start from scratch if the plugin exists.** Reinventing is waste.
2. **Every input is source-tagged.** Models whose inputs can't be traced back to primary docs are vapor.
3. **Scenarios must sum to 100% probability.** Catch this before Associate does.
4. **Reverse-DCF is the default for mature names.** Forward DCF has too many inputs to trust on well-covered stocks. Reverse-DCF is more honest — it tells you what market expects.
5. **Never commit Excel models without a wiki page pointing to them.** Orphan Excel files are wiki-lint failures.
6. **Sensitivity tables: 2–3 max.** More is noise.

## End of file
