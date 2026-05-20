#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to toggle scene-level SES compartments."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, parse_bool, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to toggle scene script compartments")
parser.add_argument("--enabled", required=True, type=parse_bool, help="Enable compartments: true/false/on/off")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_scene_compartments", {"enabled": args.enabled}, args.id))
