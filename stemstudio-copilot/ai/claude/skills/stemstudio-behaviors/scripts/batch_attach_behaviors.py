#!/usr/bin/env python3
"""Call Studio 3D REST API to attach behaviors to multiple 3D objects."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import add_session_args, parse_json_arg, build_params, output, get_session_id
import argparse
import json

parser = argparse.ArgumentParser(description="Attach behaviors to multiple objects via Studio 3D REST API")
add_session_args(parser)
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument("--targets", nargs="+", help="Object names or UUIDs to attach the same behavior to (use with --behaviorId)")
mode.add_argument("--operations", help='JSON array for full control over each operation')
parser.add_argument("--behaviorId", help="Behavior ID to attach (required when using --targets)")
parser.add_argument("--config", default=None, help='JSON config applied to all targets (used with --targets)')
args = parser.parse_args()

operations = []
if args.operations:
    operations = parse_json_arg(args.operations, "operations")
    if not isinstance(operations, list):
        print("Error: --operations must be a JSON array", file=sys.stderr)
        sys.exit(1)
else:
    if not args.behaviorId:
        print("Error: --behaviorId is required when using --targets", file=sys.stderr)
        sys.exit(1)
    shared_config = parse_json_arg(args.config, "config")
    for target in args.targets:
        op = {"target": target, "behaviorId": args.behaviorId}
        if shared_config is not None:
            op["config"] = shared_config
        operations.append(op)

results = []
for i, op in enumerate(operations):
    target = op.get("target")
    behavior_id = op.get("behaviorId")
    if not target or not behavior_id:
        print(f"Error: item {i} missing 'target' or 'behaviorId'", file=sys.stderr)
        sys.exit(1)
    import requests
    url = f"{args.url}/api/studio/scene/attach-behavior/{get_session_id()}"
    body = build_params(target=target, behaviorId=behavior_id, config=op.get("config"))
    try:
        resp = requests.post(url, json=body, timeout=30)
        resp.raise_for_status()
        results.append({"target": target, "behaviorId": behavior_id, "success": True, "result": resp.json()})
    except requests.exceptions.RequestException as e:
        results.append({"target": target, "behaviorId": behavior_id, "success": False, "error": str(e)})

output(results)
