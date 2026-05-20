#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to update a persisted Copilot project task."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

TASK_STATUSES = ["todo", "in_progress", "done", "blocked", "cancelled"]

parser = argparse.ArgumentParser(description="Generate JSONRPC message to update a project task")
parser.add_argument("--task-id", required=True, help="Project task ID")
parser.add_argument("--title", default=None, help="Updated task title")
parser.add_argument("--description", default=None, help="Updated task detail or blocked reason")
parser.add_argument("--status", choices=TASK_STATUSES, default=None, help="Updated task status")
parser.add_argument("--order", type=float, default=None, help="Updated sort order")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("update_project_task", build_params(
    id=args.task_id,
    title=args.title,
    description=args.description,
    status=args.status,
    order=args.order,
), args.id))
