# Tooling

## Python Environment

This repo now expects browser and data tooling to run from the project virtualenv:

```powershell
.\.venv\Scripts\python tools\check_data_stack.py
```

Verified packages:

- `playwright`
- `fredapi`
- `yfinance`
- `httpx`
- `beautifulsoup4`
- `trafilatura`
- `python-dotenv`

## Browser Helpers

Open any website:

```powershell
.\.venv\Scripts\python tools\browser_smoke.py https://example.com --title-contains Example
```

Serve the local dashboard:

```powershell
.\.venv\Scripts\python tools\serve_dashboard.py --port 4173
```

Verify the local dashboard and SCOUT tab with Playwright:

```powershell
.\.venv\Scripts\python tools\verify_dashboard.py --port 4173
```

Visible browser run:

```powershell
.\.venv\Scripts\python tools\verify_dashboard.py --port 4173 --headed
```

The dashboard verifier:

- starts a temporary local static server
- opens the dashboard in Playwright
- verifies the page title
- opens the `SCOUT` tab
- waits for:
  - `Macro Snapshot`
  - `Macro Research Cockpit`
  - `Relative Macro Expressions`
  - `Current Interpretation`
  - `RING`
- `AGQ`
- saves a screenshot to `tools/artifacts/dashboard-verify.png`

In sandboxed Codex sessions on Windows, Playwright browser launch may require running outside the sandbox because browser subprocess pipes can fail with `WinError 5`.

## Environment Variables

See `.env.example` for future keys:

- `VALYU_API_KEY`
- `FRED_API_KEY`
- `POLYGON_API_KEY`
- `TIINGO_API_KEY`
- `PLAYWRIGHT_BROWSER`
- `PLAYWRIGHT_HEADED`

Only `FRED_API_KEY` is directly relevant to the planned macro data layer. `yfinance`, `httpx`, `beautifulsoup4`, and `trafilatura` do not require API keys for basic usage.
