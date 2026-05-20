#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set scene fog in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set scene fog")
parser.add_argument("--type", required=True, dest="fog_type", help="Fog type ('none', 'linear', 'exponential')")
parser.add_argument("--color", default=None, help="Fog color hex (e.g. '#aaaaaa')")
parser.add_argument("--near", type=float, default=None, help="Fog start distance (linear fog)")
parser.add_argument("--far", type=float, default=None, help="Fog end distance (linear fog)")
parser.add_argument("--density", type=float, default=None, help="Fog density (exponential fog)")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_scene_fog", build_params(
    type=args.fog_type, color=args.color, near=args.near, far=args.far, density=args.density,
), args.id))
