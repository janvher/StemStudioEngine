#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set properties on a light object in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, parse_bool, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set light object properties")
parser.add_argument("--target", required=True, help="Light object name or UUID")
parser.add_argument("--intensity", type=float, default=None, help="Light intensity")
parser.add_argument("--color", default=None, help="Light color hex, e.g. #ffffcc")
parser.add_argument("--castShadow", type=parse_bool, default=None, help="Enable shadow casting: true/false/on/off")
parser.add_argument("--shadowMapSize", type=int, default=None, help="Shadow map resolution, e.g. 1024 or 2048")
parser.add_argument("--shadowBias", type=float, default=None, help="Shadow bias")
parser.add_argument("--shadowNormalBias", type=float, default=None, help="Shadow normal bias")
parser.add_argument("--shadowRadius", type=float, default=None, help="Shadow softness radius")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_light_properties", build_params(
    target=args.target,
    intensity=args.intensity,
    color=args.color,
    castShadow=args.castShadow,
    shadowMapSize=args.shadowMapSize,
    shadowBias=args.shadowBias,
    shadowNormalBias=args.shadowNormalBias,
    shadowRadius=args.shadowRadius,
), args.id))
