#!/usr/bin/env python3
"""Search for assets in the 3D Studio API."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Search for assets in the 3D Studio API using search phrases")
    add_session_args(parser)
    parser.add_argument("--phrases", required=True, nargs="+", help="Search phrases that describe the desired asset (e.g., --phrases sword medieval weapon iron)")
    parser.add_argument("--limit", type=int, default=8, help="Maximum number of results to return (default: 8)")
    parser.add_argument("--type", default=None, help="Filter by asset type (e.g. model, texture, audio)")
    args = parser.parse_args()

    params = [("phrases", phrase) for phrase in args.phrases]
    if args.type is not None:
        params.append(("type", args.type))
    data = studio_get("assets", params, args.url, timeout=360)
    if isinstance(data, dict) and "assets" in data and isinstance(data["assets"], list):
        if len(data["assets"]) > args.limit:
            data["assets"] = data["assets"][:args.limit]
            data["_truncated"] = True
            data["_message"] = f"Showing top {args.limit} results. Use --limit N to see more, or refine search phrases."
    output(data)
