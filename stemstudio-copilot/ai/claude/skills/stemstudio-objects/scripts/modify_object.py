#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for modifying an object in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, parse_json_arg, build_params, add_transform_args, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for modifying an object")
parser.add_argument("target", help="Object name or UUID to modify")
add_transform_args(parser)
parser.add_argument("--color", help="New hex color (e.g., #00ff00)")
parser.add_argument("--name", help="New name")
parser.add_argument("--tag", action="append", help="Tag to add to the object. Repeat for multiple tags.")
parser.add_argument("--object-settings", help='JSON object with optional object settings. Supported keys: isBatchable (bool), isStatic (bool), isSelectable (bool), enableAtStart (bool), visibleByAI (bool), gameVisibility (bool), EnableMorphing (bool). Example: \'{"isStatic": true, "isSelectable": false}\'')
add_id_arg(parser)
args = parser.parse_args()
tag = None
if args.tag:
    tag = args.tag[0] if len(args.tag) == 1 else args.tag

print(jsonrpc("modify_object", build_params(
    target=args.target,
    position=vec3(args.position), rotation=vec3(args.rotation), scale=vec3(args.scale),
    color=args.color, name=args.name, tag=tag,
    objectSettings=parse_json_arg(args.object_settings, "object-settings"),
), args.id))
