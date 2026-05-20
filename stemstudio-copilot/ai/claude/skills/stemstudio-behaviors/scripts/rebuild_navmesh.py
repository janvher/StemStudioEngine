#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to rebuild a NavMesh."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to rebuild a navmesh")
parser.add_argument("--target", default=None, help="Scene object name or UUID that owns the navmesh; defaults to Default Scene")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("rebuild_navmesh", build_params(target=args.target), args.id))
