#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for moving an object to a different parent in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for moving an object to a different parent")
parser.add_argument("target", help="Object name or UUID to move")
parser.add_argument("parent", help="UUID or name of new parent object (use 'null' for scene root)")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("move_object", {"target": args.target, "parent": None if args.parent == "null" else args.parent}, args.id))
