#!/usr/bin/env python3
"""Generate JSONRPC 2.0 batch message for deleting multiple objects from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc_batch, add_session_arg_optional
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC batch message for deleting multiple objects in one call")
add_session_arg_optional(parser)
parser.add_argument("targets", nargs="+", help="Object names or UUIDs to delete (space-separated)")
parser.add_argument("--start-id", type=int, default=1, help="Starting JSONRPC message ID (default: 1)")
args = parser.parse_args()

print(jsonrpc_batch("delete_object", [{"target": t} for t in args.targets], start_id=args.start_id))
