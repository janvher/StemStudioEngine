#!/usr/bin/env python3
"""Generate JSONRPC 2.0 batch message to set physics configuration for multiple objects."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import parse_json_arg, add_session_arg_optional
import argparse
import json

parser = argparse.ArgumentParser(description="Generate JSONRPC batch message to set physics configuration for multiple objects")
add_session_arg_optional(parser)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--targets", nargs="+", help="Object names or UUIDs to apply the same physics config to (use with --config)")
mode.add_argument("--operations", help='JSON array for per-object configs. Field is "ctype" (NOT "bodyType"). ctype values are PascalCase ("Static"|"Dynamic"|"Kinematic"). Shape values are lowercase friendly names. Example: [{"target":"Box1","config":{"shape":"box","ctype":"Dynamic","mass":5}},{"target":"Floor","config":{"shape":"box","ctype":"Static"}}]')
parser.add_argument("--config", help='Physics config JSON applied to all targets (required with --targets)')
parser.add_argument("--start-id", type=int, default=1, help="Starting JSONRPC message ID (default: 1)")
args = parser.parse_args()

operations = []
if args.operations:
    operations = parse_json_arg(args.operations, "operations")
    if not isinstance(operations, list):
        print("Error: --operations must be a JSON array", file=sys.stderr)
        sys.exit(1)
else:
    if not args.config:
        print("Error: --config is required when using --targets", file=sys.stderr)
        sys.exit(1)
    shared_config = parse_json_arg(args.config, "config")
    for target in args.targets:
        operations.append({"target": target, "config": shared_config})

messages = []
for i, op in enumerate(operations):
    target = op.get("target")
    config = op.get("config")
    if not target or config is None:
        print(f"Error: item {i} missing 'target' or 'config'", file=sys.stderr)
        sys.exit(1)
    messages.append({"jsonrpc": "2.0", "method": "set_physics", "params": {"target": target, "config": config}, "id": args.start_id + i})

print(json.dumps(messages))
