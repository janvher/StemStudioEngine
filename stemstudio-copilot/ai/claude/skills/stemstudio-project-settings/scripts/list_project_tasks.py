#!/usr/bin/env python3
"""Fetch persisted Copilot project tasks from the Studio 3D API."""
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '_lib'))
from studio import studio_get, add_session_args, build_params, output
import argparse

TASK_STATUSES = ["todo", "in_progress", "done", "blocked", "cancelled"]

parser = argparse.ArgumentParser(description="Fetch persisted Copilot project tasks")
add_session_args(parser)
parser.add_argument("--sceneID", default=None, help="Scene/project ID; defaults to active scene in the editor")
parser.add_argument("--taskSessionID", default=None, help="Optional Copilot task session ID filter")
parser.add_argument("--status", choices=TASK_STATUSES, default=None, help="Optional task status filter")
parser.add_argument("--limit", type=int, default=None, help="Maximum number of tasks")
args = parser.parse_args()

output(studio_get("project-tasks", build_params(
    sceneID=args.sceneID,
    sessionID=args.taskSessionID,
    status=args.status,
    limit=args.limit,
), args.url))
