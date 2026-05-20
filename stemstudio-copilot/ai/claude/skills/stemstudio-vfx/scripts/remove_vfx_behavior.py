#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to remove a behavior from a VFX (Particle Emitter) in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to remove a behavior from a VFX emitter")
parser.add_argument("--target", required=True, help="UUID or name of the VFX emitter")
parser.add_argument("--behaviorIndex", required=True, type=int, help="Index of the behavior to remove (0-based)")
add_id_arg(parser)
args = parser.parse_args()

if args.behaviorIndex < 0:
    print("Error: behaviorIndex must be non-negative", file=sys.stderr)
    sys.exit(1)

print(jsonrpc("remove_vfx_behavior", {"target": args.target, "behaviorIndex": args.behaviorIndex}, args.id))
