from __future__ import annotations

from browser_helpers import browser_session, parse_common_browser_args


def main() -> None:
    parser = parse_common_browser_args("Open a URL in Playwright and optionally assert the title.")
    parser.add_argument("url", help="URL to open.")
    parser.add_argument("--title-contains", default="", help="Optional title substring assertion.")
    args = parser.parse_args()

    with browser_session(args.browser, args.headed, args.timeout_ms) as (_, page):
        page.goto(args.url, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        title = page.title()
        print(f"Opened: {args.url}")
        print(f"Title: {title}")
        if args.title_contains and args.title_contains not in title:
            raise AssertionError(f"Expected title to contain '{args.title_contains}', got '{title}'.")


if __name__ == "__main__":
    main()
