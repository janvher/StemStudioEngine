#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to create a waypoint under a path."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to add a waypoint")
parser.add_argument("--path", required=True, help="Waypoint path object name or UUID")
parser.add_argument("--position", nargs=3, type=float, required=True, metavar=("X", "Y", "Z"), help="Waypoint position as x y z")
parser.add_argument("--name", default=None, help="Waypoint object name")
parser.add_argument("--order", type=int, default=None, help="Explicit waypoint order")
parser.add_argument("--waitTime", type=float, default=None, help="Optional dwell time at this waypoint")
parser.add_argument("--arrivalRadius", type=float, default=None, help="Optional arrival radius")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("add_waypoint", build_params(
    path=args.path,
    position=vec3(args.position),
    name=args.name,
    order=args.order,
    waitTime=args.waitTime,
    arrivalRadius=args.arrivalRadius,
), args.id))
