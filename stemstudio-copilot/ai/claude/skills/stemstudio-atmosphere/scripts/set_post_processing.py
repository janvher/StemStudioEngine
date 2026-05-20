#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set post-processing effects in Studio 3D."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, parse_json_arg, build_params, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set post-processing effects")
parser.add_argument("--ao", default=None, help="Ambient occlusion configuration as JSON string")
parser.add_argument("--bloom", default=None, help="Bloom configuration as JSON string")
parser.add_argument("--outline", default=None, help="Outline configuration as JSON string")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_post_processing", build_params(
    ao=parse_json_arg(args.ao, "ao"),
    bloom=parse_json_arg(args.bloom, "bloom"),
    outline=parse_json_arg(args.outline, "outline"),
), args.id))
