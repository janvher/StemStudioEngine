#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for deleting an object in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for deleting an object")
parser.add_argument("target", help="Object name or UUID to delete")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("delete_object", {"target": args.target}, args.id))
