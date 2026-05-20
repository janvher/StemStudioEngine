#!/usr/bin/env python3
"""Call Studio 3D REST API to add a new behavior."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_post, add_session_args, build_params, output
import argparse
import json

parser = argparse.ArgumentParser(description="Add a new behavior via Studio 3D REST API")
add_session_args(parser)
parser.add_argument("--name", required=True, help="Human-readable behavior name")
parser.add_argument("--code", required=True, help="Path to JavaScript behavior code file")
parser.add_argument("--metadata", required=True, help="Path to behavior.json metadata file")
parser.add_argument("--description", default=None, help="Behavior description")
parser.add_argument("--author", default=None, help="Behavior author name")
parser.add_argument("--version", default="1.0.0", help="Behavior version (default: 1.0.0)")
args = parser.parse_args()

try:
    with open(args.code, 'r', encoding='utf-8') as f:
        code = f.read()
except FileNotFoundError:
    print(f"Error: Code file not found: {args.code}", file=sys.stderr)
    sys.exit(1)

try:
    with open(args.metadata, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
except FileNotFoundError:
    print(f"Error: Metadata file not found: {args.metadata}", file=sys.stderr)
    sys.exit(1)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON in metadata file: {e}", file=sys.stderr)
    sys.exit(1)

body = build_params(name=args.name, code=code, metadata=metadata, version=args.version,
                    description=args.description, author=args.author)
output(studio_post("add-behavior", body, args.url))
