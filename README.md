# Incrementum Dashboard

Incrementum Dashboard is evolving from a static local portfolio dashboard into a persistent, modular portfolio platform.

## Current frontend runtime

- GitHub Pages-friendly static frontend
- plain HTML/CSS/JavaScript UI
- modular runtime bootstrap in [`src/`](./src)
- legacy portfolio engine still running in [`app.js`](./app.js) during the migration phase

## New architecture assets

- runtime bootstrap: [`src/bootstrap.js`](./src/bootstrap.js)
- runtime config: [`src/config/runtime-config.js`](./src/config/runtime-config.js)
- backend / persistence / market-data / sharing service boundaries: [`src/services`](./src/services)
- target architecture notes: [`docs/architecture.md`](./docs/architecture.md)
- Supabase schema draft: [`supabase/schema.sql`](./supabase/schema.sql)
- edge-function contract notes: [`supabase/edge-functions/README.md`](./supabase/edge-functions/README.md)

## Product capabilities currently in place

- Dashboard, Transactions, and Summary Returns
- manual ledger plus imported IBKR statement snapshots
- active snapshot restore
- local-first persistence with runtime hooks ready for remote persistence
- benchmark-selection persistence
- statement-aware reconciliation
- transaction-derived NAV history with snapshot fallback anchors
- Excel export (`.xlsx`) generated in the browser

## Planned backend direction

- Supabase Postgres as system of record
- Supabase Storage for raw statement files and exports
- Supabase Edge Functions for:
  - secure market-data access
  - import processing
  - share-link resolution
  - NAV rebuild jobs
  - reconciliation helpers

## How to run

Open `index.html` in your browser.

## Environment placeholders

The runtime expects optional environment values via `window.__INCREMENTUM_ENV__`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_REF`
- `BACKEND_BASE_URL`
- `EDGE_FUNCTIONS_BASE_URL`
- `MARKET_DATA_PRIMARY`
- `MARKET_DATA_FALLBACK`
- `PUBLIC_BASE_URL`

If those are not configured, the app keeps working locally with local persistence fallback.
