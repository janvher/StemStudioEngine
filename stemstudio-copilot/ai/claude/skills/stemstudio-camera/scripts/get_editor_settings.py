#!/usr/bin/env python3
"""Fetch editor settings from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

parser = argparse.ArgumentParser(description="Fetch editor settings from Studio 3D")
add_session_args(parser)
parser.add_argument("--category", default=None, help="Settings category filter")
args = parser.parse_args()
output(studio_get("editor-settings", build_params(category=args.category), args.url))
