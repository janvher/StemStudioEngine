#!/usr/bin/env python3
"""Call Studio 3D REST API to update configuration for a behavior attached to an object."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_post, add_session_args, parse_json_arg, build_params, output
import argparse

parser = argparse.ArgumentParser(description="Update behavior configuration via Studio 3D REST API")
add_session_args(parser)
parser.add_argument("--target", required=True, help="Object name or UUID")
parser.add_argument("--behaviorId", required=True, help="ID of behavior to update")
parser.add_argument("--attributesData", type=str, help="New behavior attributes configuration as JSON string")
parser.add_argument("--enabled", type=str, choices=["true", "false"], help="Whether the behavior is enabled (true/false)")
args = parser.parse_args()

attributes_data = parse_json_arg(args.attributesData, "attributesData")
enabled = args.enabled.lower() == "true" if args.enabled else None

if attributes_data is None and enabled is None:
    print("Error: At least one of --attributesData or --enabled must be provided", file=sys.stderr)
    sys.exit(1)

body = build_params(target=args.target, behaviorId=args.behaviorId, attributesData=attributes_data, enabled=enabled)
output(studio_post("set-behavior-config", body, args.url))
