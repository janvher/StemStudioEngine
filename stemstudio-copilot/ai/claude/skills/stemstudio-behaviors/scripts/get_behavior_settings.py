#!/usr/bin/env python3
"""Fetch behavior settings for an object from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch behavior settings from Studio 3D")
    add_session_args(parser)
    parser.add_argument("--target", required=True, help="Object name or UUID to inspect")
    parser.add_argument("--behaviorId", default=None, help="Optional specific behavior ID to inspect")
    args = parser.parse_args()
    output(studio_get("behavior-settings", build_params(target=args.target, behaviorId=args.behaviorId), args.url))
