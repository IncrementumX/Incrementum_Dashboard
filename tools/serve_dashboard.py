from __future__ import annotations

import argparse
import time

from browser_helpers import run_static_server


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the dashboard locally from the repo root.")
    parser.add_argument("--port", type=int, default=4173, help="Port to bind.")
    args = parser.parse_args()

    with run_static_server(args.port) as url:
        print(f"Serving dashboard at {url}")
        print("Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
