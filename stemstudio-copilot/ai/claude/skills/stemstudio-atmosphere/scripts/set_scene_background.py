#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set scene background in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse
import json

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set scene background")
parser.add_argument("--type", required=True, dest="bg_type", help="Background type ('Color', 'Texture', 'Cubemap', 'Gradient')")
parser.add_argument("--color", default=None, help="Background color hex")
parser.add_argument("--gradient", default=None, help="CSS gradient string")
parser.add_argument("--rotation", type=float, default=None, help="Background rotation")
parser.add_argument("--intensity", type=float, default=None, help="Background intensity")
parser.add_argument("--blurriness", type=float, default=None, help="Background blurriness")
add_id_arg(parser)
args = parser.parse_args()

gradient = args.gradient
if gradient:
    try:
        gradient = json.loads(gradient)
    except json.JSONDecodeError:
        pass

print(jsonrpc("set_scene_background", build_params(
    type=args.bg_type, color=args.color, gradient=gradient,
    rotation=args.rotation, intensity=args.intensity, blurriness=args.blurriness,
), args.id))
