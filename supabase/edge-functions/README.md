# Supabase Edge Functions Contract

Planned functions:

- `market-data-latest`
  - latest prices, benchmarks, FX
- `market-data-history`
  - historical prices and benchmark history
- `import-ibkr`
  - statement parsing, duplicate detection, import diagnostics
- `rebuild-nav`
  - recompute derived daily NAV from ledger + price history
- `create-share-link`
  - issue read-only share tokens
- `resolve-share-link`
  - resolve token to saved portfolio context

All provider-backed calls must happen server-side.
No market-data API keys should ever be exposed to the browser.
