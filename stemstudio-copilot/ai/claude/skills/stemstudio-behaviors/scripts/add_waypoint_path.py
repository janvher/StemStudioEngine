#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to create a waypoint path group."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, vec3, build_params, parse_bool, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to add a waypoint path")
parser.add_argument("--name", required=True, help="Waypoint path object name")
parser.add_argument("--position", nargs=3, type=float, metavar=("X", "Y", "Z"), help="Path origin as x y z")
parser.add_argument("--parent", default=None, help="Optional parent object name or UUID")
parser.add_argument("--loop", type=parse_bool, default=None, help="Whether the path loops: true/false/on/off")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("add_waypoint_path", build_params(
    name=args.name,
    position=vec3(args.position),
    parent=args.parent,
    loop=args.loop,
), args.id))
