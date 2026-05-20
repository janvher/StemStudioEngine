#!/usr/bin/env python3
"""Generate JSONRPC 2.0 message to create a persisted Copilot project task."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import jsonrpc, build_params, add_id_arg
import argparse

TASK_STATUSES = ["todo", "in_progress", "done", "blocked", "cancelled"]

parser = argparse.ArgumentParser(description="Generate JSONRPC message to create a project task")
parser.add_argument("--title", required=True, help="Short task title")
parser.add_argument("--description", default=None, help="Optional task detail or blocked reason")
parser.add_argument("--status", choices=TASK_STATUSES, default=None, help="Initial task status")
parser.add_argument("--order", type=float, default=None, help="Sort order for the task")
parser.add_argument("--sceneID", default=None, help="Scene/project ID; defaults to active scene in the editor")
parser.add_argument("--taskSessionID", default=None, help="Optional Copilot task session ID")
add_id_arg(parser)
args = parser.parse_args()

print(jsonrpc("create_project_task", build_params(
    title=args.title,
    description=args.description,
    status=args.status,
    order=args.order,
    sceneID=args.sceneID,
    sessionID=args.taskSessionID,
), args.id))
