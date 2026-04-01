from __future__ import annotations

import importlib


MODULES = [
    ("playwright", "playwright"),
    ("fredapi", "fredapi"),
    ("yfinance", "yfinance"),
    ("httpx", "httpx"),
    ("beautifulsoup4", "bs4"),
    ("trafilatura", "trafilatura"),
    ("python-dotenv", "dotenv"),
]


def main() -> None:
    failures = 0
    for label, module_name in MODULES:
        try:
            importlib.import_module(module_name)
            print(f"{label}: OK")
        except Exception as exc:
            failures += 1
            print(f"{label}: ERR - {type(exc).__name__}: {exc}")

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
