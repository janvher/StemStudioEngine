#!/usr/bin/env python3
"""Generate JSONRPC 2.0 batch message for modifying multiple objects in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc_batch, parse_json_arg, add_session_arg_optional
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC batch message for modifying multiple objects in one call")
add_session_arg_optional(parser)
parser.add_argument("--objects", required=True, help='JSON array of modification definitions. Each item requires "target" and any of: "position", "rotation", "scale", "color", "name", "tag", "objectSettings".')
parser.add_argument("--start-id", type=int, default=1, help="Starting JSONRPC message ID (default: 1)")
args = parser.parse_args()

objects = parse_json_arg(args.objects, "objects")
if not isinstance(objects, list):
    print("Error: --objects must be a JSON array", file=sys.stderr)
    sys.exit(1)
for i, obj in enumerate(objects):
    if "target" not in obj:
        print(f"Error: item {i} is missing required field 'target'", file=sys.stderr)
        sys.exit(1)

print(jsonrpc_batch("modify_object", objects,
    param_keys=["target", "position", "rotation", "scale", "color", "name", "tag", "objectSettings"],
    start_id=args.start_id))
