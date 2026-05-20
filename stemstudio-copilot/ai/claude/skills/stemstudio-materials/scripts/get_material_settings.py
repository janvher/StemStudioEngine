#!/usr/bin/env python3
"""Fetch material settings for an object from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch material settings from Studio 3D")
    add_session_args(parser)
    parser.add_argument("--target", required=True, help="Object name or UUID whose material to inspect")
    args = parser.parse_args()
    output(studio_get("material-settings", {"target": args.target}, args.url))
