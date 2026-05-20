#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to delete a persisted Copilot project task."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, add_id_arg
import argparse

parser = argparse.ArgumentParser(description="Generate JSONRPC message to delete a project task")
parser.add_argument("--task-id", required=True, help="Project task ID")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("delete_project_task", {"id": args.task_id}, args.id))
