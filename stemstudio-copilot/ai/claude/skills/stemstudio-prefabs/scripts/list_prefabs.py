#!/usr/bin/env python3
"""List all prefabs in the current scene."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

parser = argparse.ArgumentParser(description="List all prefabs in the current scene")
add_session_args(parser)
parser.add_argument("--filter", default=None, help="Name filter for prefabs")
args = parser.parse_args()
output(studio_get("list-prefabs", build_params(filter=args.filter), args.url))
