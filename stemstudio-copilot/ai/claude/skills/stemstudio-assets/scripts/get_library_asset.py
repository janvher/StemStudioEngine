#!/usr/bin/env python3
"""Fetch detailed library asset metadata from the Studio 3D API."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Fetch detailed metadata for a library asset")
add_session_args(parser)
parser.add_argument("--assetId", required=True, help="Library asset ID")
args = parser.parse_args()

output(studio_get("asset", {"assetId": args.assetId}, args.url))
