#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set rendering settings in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, parse_bool, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set rendering settings")
parser.add_argument("--useShadows", type=parse_bool, default=None, help="Enable/disable shadows")
parser.add_argument("--useInstancing", type=parse_bool, default=None, help="Enable/disable instancing")
parser.add_argument("--shadowMapType", type=int, default=None, help="Shadow map type THREE constant: 0=Basic, 1=PCF, 2=PCFSoft, 3=VSM")
parser.add_argument("--usePhysicsWorker", type=parse_bool, default=None, help="Enable/disable physics worker")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_rendering_settings", build_params(
    useShadows=args.useShadows, useInstancing=args.useInstancing,
    shadowMapType=args.shadowMapType, usePhysicsWorker=args.usePhysicsWorker,
), args.id))
