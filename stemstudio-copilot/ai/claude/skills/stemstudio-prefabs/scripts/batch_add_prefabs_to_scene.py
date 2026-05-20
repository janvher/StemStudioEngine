#!/usr/bin/env python3
"""Generate JSONRPC 2.0 batch message to add multiple prefab instances to the scene."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import parse_json_arg, build_params, add_session_arg_optional
import argparse
import json

parser = argparse.ArgumentParser(description="Generate JSONRPC batch message to add multiple prefab instances to the scene")
add_session_arg_optional(parser)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--prefab-id", help="Prefab ID to spawn multiple times (use with --positions)")
mode.add_argument("--operations", help='JSON array for full control per instance: [{"id":"prefab_abc","position":{"x":0,"y":0,"z":0},"name":"Enemy1"}]')
parser.add_argument("--positions", help='JSON array of positions for repeated prefab spawning (use with --prefab-id)')
parser.add_argument("--names", nargs="+", help="Optional names for each instance (same order as --positions)")
parser.add_argument("--start-id", type=int, default=1, help="Starting JSONRPC message ID (default: 1)")
args = parser.parse_args()

operations = []
if args.operations:
    operations = parse_json_arg(args.operations, "operations")
    if not isinstance(operations, list):
        print("Error: --operations must be a JSON array", file=sys.stderr)
        sys.exit(1)
else:
    if not args.positions:
        print("Error: --positions is required when using --prefab-id", file=sys.stderr)
        sys.exit(1)
    positions = parse_json_arg(args.positions, "positions")
    names = args.names or []
    for i, pos in enumerate(positions):
        op = {"id": args.prefab_id, "position": pos}
        if i < len(names):
            op["name"] = names[i]
        operations.append(op)

messages = []
for i, op in enumerate(operations):
    prefab_id = op.get("id")
    if not prefab_id:
        print(f"Error: item {i} missing 'id'", file=sys.stderr)
        sys.exit(1)
    params = build_params(id=prefab_id, position=op.get("position"), name=op.get("name"))
    messages.append({"jsonrpc": "2.0", "method": "add_prefab_to_scene", "params": params, "id": args.start_id + i})

print(json.dumps(messages))
