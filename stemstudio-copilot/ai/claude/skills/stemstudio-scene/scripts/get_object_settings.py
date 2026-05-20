#!/usr/bin/env python3
"""Fetch settings for a specific object from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch object settings from Studio 3D")
    add_session_args(parser)
    parser.add_argument("--target", required=True, help="Object name or UUID to inspect")
    parser.add_argument("--kind", default=None, help="Optional settings category filter")
    args = parser.parse_args()
    output(studio_get("object-settings", build_params(target=args.target, kind=args.kind), args.url))
