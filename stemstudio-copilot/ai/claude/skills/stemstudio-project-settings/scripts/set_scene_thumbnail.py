#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set the scene thumbnail in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate JSONRPC message to set the scene thumbnail")
    parser.add_argument("--name", required=True, help="Name of the imported image asset to use as the thumbnail")
    add_id_arg(parser)
    args = parser.parse_args()

    print(jsonrpc("set_scene_thumbnail", {"name": args.name}, args.id))
