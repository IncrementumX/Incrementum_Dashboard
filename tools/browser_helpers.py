from __future__ import annotations

import argparse
import contextlib
import http.server
import json
import os
import socketserver
import threading
import time
from pathlib import Path

from dotenv import load_dotenv
from fredapi import Fred
import pandas as pd
from playwright.sync_api import Browser, Page, Playwright, sync_playwright
import yfinance as yf


REPO_ROOT = Path(__file__).resolve().parents[1]
SCOUT_CACHE_TTL_SECONDS = 900
SCOUT_PAYLOAD_CACHE: dict[str, object] = {"payload": None, "timestamp": 0.0}
FRED_SERIES = ["DGS10", "DFII10", "T10YIE", "T10Y2Y", "T5YIFR"]
ASSET_TICKERS = {
    # Cross-asset reference + macro proxies
    "RING": "RING",
    "AGQ": "AGQ",
    "GLD": "GLD",
    "TIP": "TIP",
    "TLT": "TLT",
    "UUP": "UUP",
    "COPX": "COPX",
    "URA": "URA",
    "DXY": "DX-Y.NYB",
    "SPY": "SPY",
    "VIX": "^VIX",
    "SLV": "SLV",
    "SIL": "SIL",
    # Current portfolio holdings (US-listed)
    "URNM": "URNM",
    "META": "META",
    "MU": "MU",
    "OIH": "OIH",
    "USO": "USO",
    "IBKR": "IBKR",
    # Current portfolio holdings (international: IBKR symbol -> Yahoo ticker)
    "IVN": "IVN.TO",     # Ivanhoe Mines, Toronto
    "ENR": "ENR.DE",     # Siemens Energy AG, Frankfurt
    "HY9H": "HYQ.DE",    # Hypoport SE, Frankfurt
}

load_dotenv(REPO_ROOT / ".env")


def parse_common_browser_args(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--headed", action="store_true", help="Launch a visible browser window instead of headless mode.")
    parser.add_argument("--browser", default="chromium", choices=["chromium", "firefox", "webkit"], help="Browser engine to use.")
    parser.add_argument("--timeout-ms", type=int, default=15000, help="Playwright action timeout in milliseconds.")
    return parser


def launch_browser(playwright: Playwright, browser_name: str, headed: bool) -> Browser:
    browser_type = getattr(playwright, browser_name)
    return browser_type.launch(headless=not headed)


def new_page(browser: Browser, timeout_ms: int) -> Page:
    page = browser.new_page(viewport={"width": 1440, "height": 1200})
    page.set_default_timeout(timeout_ms)
    return page


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


@contextlib.contextmanager
def run_static_server(port: int = 4173):
    handler = make_dashboard_handler()
    server = ReusableTCPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        wait_for_local_server(f"http://127.0.0.1:{port}/index.html")
        yield f"http://127.0.0.1:{port}/index.html"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def wait_for_local_server(url: str, timeout_seconds: int = 10) -> None:
    import urllib.request

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2):
                return
        except Exception:
            time.sleep(0.25)
    raise TimeoutError(f"Timed out waiting for local server at {url}")


@contextlib.contextmanager
def browser_session(browser_name: str, headed: bool, timeout_ms: int):
    with sync_playwright() as playwright:
        browser = launch_browser(playwright, browser_name, headed)
        try:
            page = new_page(browser, timeout_ms)
            yield browser, page
        finally:
            browser.close()


def make_dashboard_handler():
    class DashboardHandler(QuietHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

        def do_GET(self):
            if self.path.startswith("/__scout_data__"):
                self._serve_scout_data()
                return
            super().do_GET()

        def _serve_scout_data(self) -> None:
            try:
                payload = get_scout_payload()
                body = json.dumps(payload).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:
                body = json.dumps({"error": str(exc)}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

    return DashboardHandler


def get_scout_payload() -> dict:
    now = time.time()
    cached_payload = SCOUT_PAYLOAD_CACHE.get("payload")
    cached_at = float(SCOUT_PAYLOAD_CACHE.get("timestamp") or 0.0)
    if cached_payload and now - cached_at < SCOUT_CACHE_TTL_SECONDS:
        return cached_payload  # type: ignore[return-value]

    load_dotenv(REPO_ROOT / ".env", override=False)
    fred_api_key = os.getenv("FRED_API_KEY", "").strip()

    start_date = "2015-01-01"
    macro_payload = {}
    fred_sources = {}
    for code in FRED_SERIES:
        series, source = fetch_fred_series(code, start_date, fred_api_key)
        factor = 100 if code == "T10Y2Y" else 1
        fred_sources[code] = source
        macro_payload[code] = [
            {"date": index.strftime("%Y-%m-%d"), "value": float(value) * factor}
            for index, value in series.items()
            if value == value
        ]

    ticker_list = list(dict.fromkeys(ASSET_TICKERS.values()))
    history = yf.download(
        tickers=ticker_list,
        start=start_date,
        auto_adjust=False,
        progress=False,
        group_by="ticker",
        threads=False,
    )
    asset_payload = {}
    for symbol, ticker in ASSET_TICKERS.items():
        asset_payload[symbol] = extract_ticker_history(history, ticker)
        if not asset_payload[symbol]:
            raise RuntimeError(f"No history returned for {symbol} ({ticker}).")

    payload = {
        "source": "real-fred-yfinance",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "startDate": start_date,
        "meta": {
            "fredKeyConfigured": bool(fred_api_key),
            "fredSeriesSources": fred_sources,
        },
        "macro": macro_payload,
        "assets": asset_payload,
    }
    SCOUT_PAYLOAD_CACHE["payload"] = payload
    SCOUT_PAYLOAD_CACHE["timestamp"] = now
    return payload


def fetch_fred_series(code: str, start_date: str, fred_api_key: str):
    if fred_api_key:
        try:
            fred = Fred(api_key=fred_api_key)
            series = fred.get_series(code, observation_start=start_date).dropna()
            if not series.empty:
                return series, "fredapi"
        except Exception:
            pass

    frame = pd.read_csv(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={code}")
    frame = frame.rename(columns={frame.columns[0]: "date", frame.columns[1]: "value"})
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["value"] = pd.to_numeric(frame["value"], errors="coerce")
    frame = frame.dropna()
    frame = frame[frame["date"] >= pd.Timestamp(start_date)]
    source = "csv-fallback-with-key" if fred_api_key else "csv-fallback-no-key"
    return frame.set_index("date")["value"], source


def extract_ticker_history(history, ticker: str) -> list[dict[str, float | str]]:
    frame = None
    if hasattr(history, "columns") and getattr(history.columns, "nlevels", 1) > 1:
        if ticker in history.columns.get_level_values(0):
            frame = history[ticker]
    elif hasattr(history, "columns"):
        frame = history

    if frame is None or frame.empty:
        return []

    price_column = "Adj Close" if "Adj Close" in frame.columns else "Close"
    series = frame[price_column].dropna()
    return [
        {"date": index.strftime("%Y-%m-%d"), "value": float(value)}
        for index, value in series.items()
        if value == value
    ]
