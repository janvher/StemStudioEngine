#!/usr/bin/env python3
"""Fetch a scene-level setting category from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch scene-level setting from Studio 3D")
    add_session_args(parser)
    parser.add_argument("--category", default=None, help="Setting category (default: all)")
    args = parser.parse_args()
    output(studio_get("scene-setting", build_params(category=args.category), args.url))
