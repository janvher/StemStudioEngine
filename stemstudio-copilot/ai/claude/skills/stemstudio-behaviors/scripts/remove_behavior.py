#!/usr/bin/env python3
"""Call Studio 3D REST API to remove a behavior from the system."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_delete, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Remove a behavior from Studio 3D via REST API")
add_session_args(parser)
parser.add_argument("--behaviorId", required=True, help="Behavior ID to remove")
args = parser.parse_args()
output(studio_delete("remove-behavior", {"behaviorId": args.behaviorId}, args.url))
