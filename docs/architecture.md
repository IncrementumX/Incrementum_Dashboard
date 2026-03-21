# Incrementum Dashboard Target Architecture

## Frontend

- GitHub Pages-hosted static frontend
- Plain JavaScript UI, progressively modularized
- Runtime bootstrap that wires:
  - persistence repository
  - UI context persistence
  - share-link resolution
  - market-data gateway
  - backend API client

## Backend

- Supabase Postgres as system of record
- Supabase Storage for uploaded statements and exports
- Supabase Edge Functions for:
  - market data proxying
  - import processing
  - share-link resolution
  - revaluation / NAV rebuild jobs
  - reconciliation helpers

## Provider Layer

- Primary: official market-data provider (recommended: Polygon or Tiingo class)
- Fallback: lower-confidence provider isolated behind server-side adapters
- Manual/snapshot anchors: last-resort fallback only

## Core Engines

- ledger / transaction engine
- valuation / daily NAV engine
- return engine
- benchmark engine
- export engine
- reconciliation engine

## Current Transition Strategy

- Keep the existing working UI and portfolio logic running
- Route persistence and integration concerns through a new runtime layer
- Migrate monolithic `app.js` behavior into modules incrementally rather than rewriting the whole product in one risky jump
