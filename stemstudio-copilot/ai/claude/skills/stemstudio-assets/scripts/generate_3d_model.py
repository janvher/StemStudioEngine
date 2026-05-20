#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for creating a 3D model from text in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, build_params, add_session_arg_optional, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for 3D model generation")
parser.add_argument("prompt", help="Description of the 3D model to generate")
parser.add_argument("--name", help="Name for the generated model")
parser.add_argument("--position", nargs=3, type=float, metavar=("X", "Y", "Z"), help="Position as x y z")
parser.add_argument("--parent", help="UUID or name of parent object")
add_session_arg_optional(parser)
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("generate_3d_model", build_params(
    prompt=args.prompt, name=args.name, position=vec3(args.position), parent=args.parent,
), args.id))
