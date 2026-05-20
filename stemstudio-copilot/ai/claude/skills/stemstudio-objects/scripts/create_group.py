#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for creating a group (empty container) in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, parse_json_arg, build_params, add_transform_args, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for creating a group (empty container)")
parser.add_argument("--name", help="Group name")
add_transform_args(parser)
parser.add_argument("--parent", help="UUID or name of parent object")
parser.add_argument("--object-settings", help='JSON object with optional object settings. Supported keys: isBatchable (bool), isStatic (bool), isSelectable (bool), enableAtStart (bool), visibleByAI (bool), gameVisibility (bool), EnableMorphing (bool). Example: \'{"isStatic": true, "isSelectable": false}\'')
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("create_group", build_params(
    name=args.name,
    position=vec3(args.position), rotation=vec3(args.rotation), scale=vec3(args.scale),
    parent=args.parent,
    objectSettings=parse_json_arg(args.object_settings, "object-settings"),
), args.id))
