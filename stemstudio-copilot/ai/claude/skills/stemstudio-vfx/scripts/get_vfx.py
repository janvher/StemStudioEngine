#!/usr/bin/env python3
"""Get VFX particle emitter details from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, output
import argparse

parser = argparse.ArgumentParser(description="Get VFX particle emitter details from Studio 3D")
add_session_args(parser)
parser.add_argument("--target", required=True, help="UUID or name of the VFX emitter")
args = parser.parse_args()
output(studio_get("get-vfx", {"target": args.target}, args.url))
