#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for adding an external 3D model to the scene in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, build_params, add_session_arg_optional, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for adding a model to scene")
add_session_arg_optional(parser)
add_id_arg(parser)
parser.add_argument("asset_id", help="Asset ID from the provider")
parser.add_argument("name", help="Name for the model in the scene")
parser.add_argument("provider", choices=["sketchfab", "polyhaven", "meshy", "local"], help="Provider: sketchfab, polyhaven, meshy, or local")
parser.add_argument("download_url", help="Download URL for the model")
parser.add_argument("--position", nargs=3, type=float, metavar=("X", "Y", "Z"), help="Position as x y z")
parser.add_argument("--width", type=float, help="Width of the model (default: 1)")
parser.add_argument("--height", type=float, help="Height of the model (default: 1)")
parser.add_argument("--parent", help="UUID or name of parent object")
args = parser.parse_args()

params = build_params(
    id=args.asset_id, name=args.name, provider=args.provider, downloadUrl=args.download_url,
    position=vec3(args.position), width=args.width, height=args.height, parent=args.parent,
)
print(jsonrpc("add_model_to_scene", params, args.id))
