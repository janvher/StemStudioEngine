#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message for setting texture on an object in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message for setting texture")
parser.add_argument("target", help="Object name or UUID")
parser.add_argument("texture_url", help="URL to texture image")
parser.add_argument("--type", default="map", choices=["map", "normalMap", "roughnessMap"], help="Texture type (default: map)")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("set_texture", {"target": args.target, "textureUrl": args.texture_url, "textureType": args.type}, args.id))
