#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set tone mapping in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set tone mapping")
parser.add_argument("--type", required=True, dest="mapping_type", help="Tone mapping type ('None', 'Linear', 'Reinhard', 'Cineon', 'ACESFilmic')")
parser.add_argument("--exposure", type=float, default=None, help="Tone mapping exposure (default: 1.0)")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("set_tone_mapping", build_params(type=args.mapping_type, exposure=args.exposure), args.id))
