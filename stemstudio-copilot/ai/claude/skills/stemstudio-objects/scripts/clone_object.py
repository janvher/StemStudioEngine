#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for cloning an object in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for cloning an object")
parser.add_argument("target", help="Object name or UUID to clone")
parser.add_argument("--position", nargs=3, type=float, metavar=("X", "Y", "Z"), help="Position for cloned object as x y z")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("clone_object", build_params(target=args.target, position=vec3(args.position)), args.id))
