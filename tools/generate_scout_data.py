"""
Generate scout-data.json for GitHub Pages static deployment.
Fetches real FRED + Yahoo Finance data and writes a slimmed JSON file.
Run via GitHub Actions daily, or locally with: python tools/generate_scout_data.py
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fredapi import Fred
import pandas as pd
import yfinance as yf

REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")

FRED_SERIES = ["DGS10", "DFII10", "T10YIE", "T10Y2Y", "T5YIFR"]
ASSET_TICKERS = {
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
}
START_DATE = "2015-01-01"
# Keep last N observations to keep file size manageable (<1.5MB)
MAX_OBSERVATIONS = 1500


def fetch_fred_series(code: str, start_date: str, fred_api_key: str):
    if fred_api_key:
        try:
            fred = Fred(api_key=fred_api_key)
            series = fred.get_series(code, observation_start=start_date).dropna()
            if not series.empty:
                return series, "fredapi"
        except Exception as exc:
            print(f"  FRED API failed for {code}: {exc}")

    try:
        frame = pd.read_csv(
            f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={code}"
        )
        frame = frame.rename(columns={frame.columns[0]: "date", frame.columns[1]: "value"})
        frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
        frame["value"] = pd.to_numeric(frame["value"], errors="coerce")
        frame = frame.dropna()
        frame = frame[frame["date"] >= pd.Timestamp(start_date)]
        source = "csv-fallback-with-key" if fred_api_key else "csv-fallback-no-key"
        return frame.set_index("date")["value"], source
    except Exception as exc:
        print(f"  CSV fallback failed for {code}: {exc}")
        return pd.Series(dtype=float), "failed"


def extract_ticker_history(history, ticker: str) -> list:
    frame = None
    if hasattr(history, "columns") and getattr(history.columns, "nlevels", 1) > 1:
        if ticker in history.columns.get_level_values(0):
            frame = history[ticker]
    elif hasattr(history, "columns"):
        frame = history

    if frame is None or frame.empty:
        return []

    price_column = "Adj Close" if "Adj Close" in frame.columns else "Close"
    if price_column not in frame.columns:
        return []
    series = frame[price_column].dropna()
    return [
        {"date": index.strftime("%Y-%m-%d"), "value": float(value)}
        for index, value in series.items()
        if value == value
    ]


def slim(series: list) -> list:
    return series[-MAX_OBSERVATIONS:]


def main() -> None:
    fred_api_key = os.getenv("FRED_API_KEY", "").strip()
    print(f"FRED API key: {'configured' if fred_api_key else 'NOT configured'}")

    # 1. Fetch macro series
    print("Fetching FRED macro series...")
    macro_payload: dict = {}
    fred_sources: dict = {}
    for code in FRED_SERIES:
        print(f"  {code}...", end=" ")
        series, source = fetch_fred_series(code, START_DATE, fred_api_key)
        factor = 100 if code == "T10Y2Y" else 1
        fred_sources[code] = source
        macro_payload[code] = slim([
            {"date": index.strftime("%Y-%m-%d"), "value": float(value) * factor}
            for index, value in series.items()
            if value == value
        ])
        print(f"{len(macro_payload[code])} obs [{source}]")

    # 2. Fetch asset price history
    print("Fetching Yahoo Finance asset prices...")
    ticker_list = list(dict.fromkeys(ASSET_TICKERS.values()))
    history = yf.download(
        tickers=ticker_list,
        start=START_DATE,
        auto_adjust=False,
        progress=False,
        group_by="ticker",
        threads=False,
    )

    asset_payload: dict = {}
    for symbol, ticker in ASSET_TICKERS.items():
        rows = extract_ticker_history(history, ticker)
        asset_payload[symbol] = slim(rows)
        print(f"  {symbol}: {len(asset_payload[symbol])} obs")

    payload = {
        "source": "real-fred-yfinance",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "startDate": START_DATE,
        "meta": {
            "fredKeyConfigured": bool(fred_api_key),
            "fredSeriesSources": fred_sources,
        },
        "macro": macro_payload,
        "assets": asset_payload,
    }

    output_path = REPO_ROOT / "scout-data.json"
    with open(output_path, "w") as f:
        json.dump(payload, f, separators=(",", ":"))

    size_kb = output_path.stat().st_size // 1024
    print(f"\nscout-data.json written: {size_kb} KB")
    print(f"Generated at: {payload['generatedAt']}")


if __name__ == "__main__":
    main()
