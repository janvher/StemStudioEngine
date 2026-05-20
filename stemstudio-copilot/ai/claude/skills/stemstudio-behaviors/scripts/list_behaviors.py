#!/usr/bin/env python3
"""List all available behaviors in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

parser = argparse.ArgumentParser(description="List all available behaviors in Studio 3D")
add_session_args(parser)
parser.add_argument("--filter", default=None, help="Name filter for behaviors")
parser.add_argument("--target", default=None, help="Object name or UUID to list behaviors for")
args = parser.parse_args()
output(studio_get("list-behaviors", build_params(filter=args.filter, target=args.target), args.url))
