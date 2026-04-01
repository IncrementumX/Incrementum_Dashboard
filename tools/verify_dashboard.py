from __future__ import annotations

import argparse
from pathlib import Path

from browser_helpers import REPO_ROOT, browser_session, parse_common_browser_args, run_static_server


def main() -> None:
    parser = parse_common_browser_args("Serve and verify the local dashboard with Playwright.")
    parser.add_argument("--port", type=int, default=4173, help="Local port to use for the dashboard server.")
    parser.add_argument("--screenshot", default="tools/artifacts/dashboard-verify.png", help="Screenshot path relative to repo root.")
    args = parser.parse_args()

    screenshot_path = (REPO_ROOT / args.screenshot).resolve()
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)

    with run_static_server(args.port) as url:
        print(f"Local dashboard URL: {url}")
        with browser_session(args.browser, args.headed, args.timeout_ms) as (_, page):
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle")

            title = page.title()
            print(f"Title: {title}")
            if "Incrementum Dashboard" not in title:
                raise AssertionError(f"Unexpected title: {title}")

            page.get_by_role("button", name="Scout").click()
            page.locator("#scout-tab").wait_for(state="visible")
            page.get_by_role("heading", name="Macro Snapshot").wait_for()
            page.get_by_role("heading", name="Macro Research Cockpit").wait_for()
            page.get_by_role("heading", name="Relative Macro Expressions").wait_for()
            page.get_by_role("heading", name="Current Interpretation").wait_for()
            page.get_by_role("heading", name="RING", exact=True).wait_for()
            page.get_by_role("heading", name="AGQ", exact=True).wait_for()

            page.screenshot(path=str(screenshot_path), full_page=True)
            print(f"Screenshot: {screenshot_path}")
            print("Dashboard verification completed successfully.")


if __name__ == "__main__":
    main()
