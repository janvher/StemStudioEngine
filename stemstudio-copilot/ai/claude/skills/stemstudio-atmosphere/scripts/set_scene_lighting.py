#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set scene lighting in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, parse_json_arg, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set scene lighting")
parser.add_argument("--ambient", default=None, help="Ambient light configuration as JSON string")
parser.add_argument("--hemisphere", default=None, help="Hemisphere light configuration as JSON string")
parser.add_argument("--shadows", default=None, help="Shadow configuration as JSON string")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_scene_lighting", build_params(
    ambient=parse_json_arg(args.ambient, "ambient"),
    hemisphere=parse_json_arg(args.hemisphere, "hemisphere"),
    shadows=parse_json_arg(args.shadows, "shadows"),
), args.id))
