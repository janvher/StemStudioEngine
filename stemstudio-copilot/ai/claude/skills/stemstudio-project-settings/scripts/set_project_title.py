#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to set the project or scene title."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to set the project title")
parser.add_argument("title", help="Project or scene title")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("set_project_title", {"title": args.title}, args.id))
