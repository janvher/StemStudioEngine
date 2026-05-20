#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to enable physics on an object."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to enable physics on a 3D object")
parser.add_argument("--target", required=True, help="Object name or UUID")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("enable_physics", {"target": args.target}, args.id))
