#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to create a prefab from a scene object."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to create a prefab from a scene object")
parser.add_argument("--target", required=True, help="Object name or UUID to convert to prefab")
parser.add_argument("--name", help="Optional name for the prefab (defaults to object name)")
parser.add_argument("--no-thumbnail", action="store_true", help="Do not create a thumbnail for the prefab")
add_id_arg(parser)
args = parser.parse_args()
params = build_params(target=args.target, name=args.name)
if args.no_thumbnail:
    params["createThumbnail"] = False
print(jsonrpc("create_prefab", params, args.id))
