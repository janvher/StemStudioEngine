#!/usr/bin/env python3
"""Call Studio 3D REST API to attach a behavior to a 3D object."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_post, add_session_args, parse_json_arg, build_params, output
import argparse

parser = argparse.ArgumentParser(description="Attach a behavior to a 3D object via Studio 3D REST API")
add_session_args(parser)
parser.add_argument("--target", required=True, help="Object name or UUID")
parser.add_argument("--behaviorId", required=True, help="Behavior ID to attach")
parser.add_argument("--config", default=None, help='JSON config for behavior attributes (e.g. \'{"rotationSpeed": 1.57}\')')
args = parser.parse_args()

body = build_params(target=args.target, behaviorId=args.behaviorId, config=parse_json_arg(args.config, "config"))
output(studio_post("attach-behavior", body, args.url))
