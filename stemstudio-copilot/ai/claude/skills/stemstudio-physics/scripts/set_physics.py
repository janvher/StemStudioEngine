#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set physics configuration for a 3D object in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, parse_json_arg, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set physics configuration for a 3D object")
parser.add_argument("--target", required=True, help="Object name or UUID")
parser.add_argument("--config", required=True, help='Physics configuration as JSON string. Field is "ctype" (NOT "bodyType"). ctype values are PascalCase ("Static"|"Dynamic"|"Kinematic") — runtime requires this exact casing per CollisionType enum and COLLISION_MAP. Shape values are lowercase friendly names ("box"|"sphere"|"capsule"|"convexHull"|"concaveHull"). Example: \'{"enabled":true,"shape":"box","ctype":"Dynamic","mass":1,"friction":0.5,"restitution":0.3}\'. Preset shortcut (recommended): \'{"enabled":true,"shape":"sphere","ctype":"Dynamic","mass":1,"bounciness_preset":"Rubber"}\' fills restitution/friction/contactStiffness/contactDamping from the engine-tuned table.')
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("set_physics", {"target": args.target, "config": parse_json_arg(args.config, "config")}, args.id))
