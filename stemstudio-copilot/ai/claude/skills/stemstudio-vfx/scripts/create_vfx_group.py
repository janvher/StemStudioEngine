#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to create a VFX group (particle effect container) in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, parse_json_arg, build_params, add_transform_args, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to create a VFX group")
parser.add_argument("--name", required=True, help="VFX group name")
add_transform_args(parser)
parser.add_argument("--parent", help="UUID or name of parent object")
parser.add_argument("--preset", help="VFX preset name (e.g., fire, smoke, sparks)")
parser.add_argument("--config", help="JSON string of VFX configuration")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("add_vfx", build_params(
    name=args.name,
    position=vec3(args.position), rotation=vec3(args.rotation), scale=vec3(args.scale),
    parent=args.parent, preset=args.preset, config=parse_json_arg(args.config, "config"),
), args.id))
