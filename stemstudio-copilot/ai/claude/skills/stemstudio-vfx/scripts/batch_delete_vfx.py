#!/usr/bin/env python3
"""Generate JSONRPC 2.0 batch message to delete multiple VFX emitters."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc_batch, add_session_arg_optional
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC batch message to delete multiple VFX emitters")
add_session_arg_optional(parser)
parser.add_argument("--targets", nargs="+", required=True, help="VFX emitter names or UUIDs to delete (space-separated)")
parser.add_argument("--start-id", type=int, default=1, help="Starting JSONRPC message ID (default: 1)")
args = parser.parse_args()

print(jsonrpc_batch("delete_vfx", [{"target": t} for t in args.targets], start_id=args.start_id))
