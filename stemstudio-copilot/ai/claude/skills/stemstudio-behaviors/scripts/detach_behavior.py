#!/usr/bin/env python3
"""Call Studio 3D REST API to detach a behavior from a 3D object."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_post, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Detach a behavior from a 3D object via Studio 3D REST API")
add_session_args(parser)
parser.add_argument("--target", required=True, help="Object name or UUID")
parser.add_argument("--behaviorId", required=True, help="Behavior ID to detach")
args = parser.parse_args()
output(studio_post("detach-behavior", {"target": args.target, "behaviorId": args.behaviorId}, args.url))
