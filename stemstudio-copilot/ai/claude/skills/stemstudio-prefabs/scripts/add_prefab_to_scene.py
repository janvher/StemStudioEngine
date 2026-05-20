#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to add a prefab instance to the scene."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to add a prefab instance to the scene")
parser.add_argument("--prefab-id", required=True, help="ID of the prefab to instantiate")
parser.add_argument("--position", nargs=3, type=float, metavar=("X", "Y", "Z"), help="Position as x y z")
parser.add_argument("--name", help="Optional name for the prefab instance")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("add_prefab_to_scene", build_params(id=args.prefab_id, position=vec3(args.position), name=args.name), args.id))
