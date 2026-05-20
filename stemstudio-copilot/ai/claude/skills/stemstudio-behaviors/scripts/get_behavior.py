#!/usr/bin/env python3
"""Fetch detailed info about a specific behavior from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Fetch detailed info about a specific behavior from Studio 3D")
add_session_args(parser)
parser.add_argument("--behaviorId", required=True, help="Behavior ID to retrieve")
args = parser.parse_args()
output(studio_get("get-behavior", {"behaviorId": args.behaviorId}, args.url))
