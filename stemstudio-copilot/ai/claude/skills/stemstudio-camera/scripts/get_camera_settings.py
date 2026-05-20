#!/usr/bin/env python3
"""Fetch camera settings from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch camera settings from Studio 3D")
    add_session_args(parser)
    parser.add_argument("--target", required=True, help="Camera name or UUID to inspect")
    args = parser.parse_args()
    output(studio_get("camera-settings", {"target": args.target}, args.url))
