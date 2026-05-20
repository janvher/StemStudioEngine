#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to add a NavMesh off-mesh connection."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, parse_bool, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to add a navmesh connection")
parser.add_argument("source", help="Source object name or UUID that owns the connection")
parser.add_argument("target", help="Destination object name or UUID")
parser.add_argument("--enabled", type=parse_bool, default=None, help="Enable the connection: true/false/on/off")
parser.add_argument("--bidirectional", type=parse_bool, default=None, help="Allow travel both ways: true/false/on/off")
parser.add_argument("--radius", type=float, default=None, help="Connection snap/search radius")
parser.add_argument("--showConnection", type=parse_bool, default=None, help="Show editor visualization: true/false/on/off")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("add_navmesh_connection", build_params(
    source=args.source,
    target=args.target,
    enabled=args.enabled,
    bidirectional=args.bidirectional,
    radius=args.radius,
    showConnection=args.showConnection,
), args.id))
