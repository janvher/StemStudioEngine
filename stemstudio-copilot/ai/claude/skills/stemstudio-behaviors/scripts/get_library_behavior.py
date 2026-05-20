#!/usr/bin/env python3
"""Fetch a behavior asset from the local library by asset ID."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Fetch a behavior asset from the local library by asset ID")
add_session_args(parser)
parser.add_argument("--assetId", required=True, help="Asset ID of the behavior")
args = parser.parse_args()
output(studio_get("library-behavior", {"assetId": args.assetId}, args.url))
