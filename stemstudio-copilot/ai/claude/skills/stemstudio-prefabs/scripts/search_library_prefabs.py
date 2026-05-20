#!/usr/bin/env python3
"""Search for prefab assets in the Studio 3D library."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Search for prefab assets in the Studio 3D library")
add_session_args(parser)
parser.add_argument("--phrases", required=True, nargs="+", help="Search phrases")
parser.add_argument("--limit", type=int, default=8, help="Maximum number of results to return (default: 8)")
args = parser.parse_args()

params = [("phrases", phrase) for phrase in args.phrases]
data = studio_get("library-prefabs", params, args.url, timeout=360)
if isinstance(data, dict) and "assets" in data and isinstance(data["assets"], list):
    if len(data["assets"]) > args.limit:
        data["assets"] = data["assets"][:args.limit]
        data["_truncated"] = True
        data["_message"] = f"Showing top {args.limit} results. Use --limit N to see more, or refine search phrases."
output(data)
