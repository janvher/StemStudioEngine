#!/usr/bin/env python3
"""Apply texture or HDRI from external providers to an object."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Apply texture or HDRI from external providers (Polyhaven, etc.) to an object")
parser.add_argument("target", help="Object name or UUID")
parser.add_argument("--assetId", required=True, help="Asset ID from the external provider")
parser.add_argument("--assetType", required=True, choices=["textures", "hdris"], help="Asset type: 'textures' or 'hdris'")
parser.add_argument("--name", required=True, help="Name of the texture/HDRI")
parser.add_argument("--provider", required=True, help="Provider: 'polyhaven' or other supported providers")
add_id_arg(parser)
args = parser.parse_args()
print(jsonrpc("set_external_texture", {
    "target": args.target, "assetId": args.assetId, "assetType": args.assetType,
    "name": args.name, "provider": args.provider,
}, args.id))
