#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to delete a VFX (Particle Emitter) from Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to delete a VFX emitter")
parser.add_argument("--target", required=True, help="UUID or name of the VFX emitter to delete")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("delete_vfx", {"target": args.target}, args.id))
