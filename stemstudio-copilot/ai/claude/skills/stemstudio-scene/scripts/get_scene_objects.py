#!/usr/bin/env python3
"""Fetch scene objects from the 3D Studio API."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch scene objects from the 3D Studio API")
    add_session_args(parser)
    parser.add_argument("--filter", default=None, help="Name filter for scene objects (optional)")
    args = parser.parse_args()
    params = {"filter": args.filter} if args.filter else {}
    output(studio_get("objects", params, args.url))
