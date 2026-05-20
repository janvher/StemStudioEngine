#!/usr/bin/env python3
"""Get detailed info about a prefab/stem by ID."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Get detailed info about a prefab/stem by ID")
add_session_args(parser)
parser.add_argument("--prefabId", required=True, help="Prefab ID to retrieve")
args = parser.parse_args()
output(studio_get("get-prefab", {"prefabId": args.prefabId}, args.url))
