#!/usr/bin/env python3
"""Fetch object details from the 3D Studio API."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch object details from the 3D Studio API")
    add_session_args(parser)
    parser.add_argument("--target", required=True, help="Object name or UUID to get")
    args = parser.parse_args()
    output(studio_get("object", {"target": args.target}, args.url))
