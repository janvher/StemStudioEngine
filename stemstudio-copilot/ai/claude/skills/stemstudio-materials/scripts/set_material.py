#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for setting material properties in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for setting material")
parser.add_argument("target", help="Object name or UUID")
parser.add_argument("--color", help="Hex color (e.g., #888888)")
parser.add_argument("--opacity", type=float, help="Opacity 0-1")
parser.add_argument("--metalness", type=float, help="Metalness 0-1")
parser.add_argument("--roughness", type=float, help="Roughness 0-1")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("set_material", build_params(
    target=args.target, color=args.color, opacity=args.opacity,
    metalness=args.metalness, roughness=args.roughness,
), args.id))
