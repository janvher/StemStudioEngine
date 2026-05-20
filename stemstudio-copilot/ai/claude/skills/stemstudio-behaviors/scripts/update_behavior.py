#!/usr/bin/env python3
"""Call Studio 3D REST API to update an existing behavior."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_post, add_session_args, build_params, output
import argparse
import json

parser = argparse.ArgumentParser(description="Update an existing behavior via Studio 3D REST API")
add_session_args(parser)
parser.add_argument("--behaviorId", required=True, help="Behavior ID to update")
parser.add_argument("--code", default=None, help="Path to new JavaScript behavior code file")
parser.add_argument("--metadata", default=None, help="Path to new behavior.json metadata file")
parser.add_argument("--name", default=None, help="Updated behavior name")
parser.add_argument("--description", default=None, help="Updated behavior description")
parser.add_argument("--author", default=None, help="Updated behavior author")
parser.add_argument("--version", default=None, help="Updated behavior version")
args = parser.parse_args()

if not args.code and not args.metadata and not any([args.name, args.description, args.author, args.version]):
    print("Error: At least one of --code, --metadata, --name, --description, --author, or --version must be provided", file=sys.stderr)
    sys.exit(1)

code = None
if args.code:
    try:
        with open(args.code, 'r', encoding='utf-8') as f:
            code = f.read()
    except FileNotFoundError:
        print(f"Error: Code file not found: {args.code}", file=sys.stderr)
        sys.exit(1)

metadata = None
if args.metadata:
    try:
        with open(args.metadata, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    except FileNotFoundError:
        print(f"Error: Metadata file not found: {args.metadata}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in metadata file: {e}", file=sys.stderr)
        sys.exit(1)

body = build_params(behaviorId=args.behaviorId, code=code, metadata=metadata,
                    name=args.name, description=args.description, author=args.author, version=args.version)
output(studio_post("update-behavior", body, args.url))
