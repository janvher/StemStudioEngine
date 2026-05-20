#!/usr/bin/env python3
"""Search for 3D models and assets from external providers."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Search for 3D models and assets from external providers")
    add_session_args(parser)
    parser.add_argument("--prompt", required=True, help="Search prompt describing the desired asset (e.g., 'medieval sword' or 'fantasy character')")
    parser.add_argument("--provider", choices=["sketchfab", "polyhaven", "meshy"], help="Provider to search from: 'sketchfab', 'polyhaven', 'meshy'")
    parser.add_argument("--limit", type=int, default=8, help="Maximum number of results to return (default: 8)")
    args = parser.parse_args()

    data = studio_get("external-assets", build_params(prompt=args.prompt, provider=args.provider), args.url, timeout=360)
    if isinstance(data, dict):
        truncated = False
        total = 0
        for key in ("assets", "data", "results"):
            if key in data and isinstance(data[key], list):
                total += len(data[key])
                if len(data[key]) > args.limit:
                    data[key] = data[key][:args.limit]
                    truncated = True
        data["totalResults"] = total
        if truncated:
            data["_truncated"] = True
            data["_message"] = f"Showing top {args.limit} results. Use --limit N to see more, or refine search prompt."
    output(data)
