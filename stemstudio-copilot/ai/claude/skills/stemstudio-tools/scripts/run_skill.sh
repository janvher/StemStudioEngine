#!/usr/bin/env bash

set -euo pipefail

export PYTHONPATH="$HOME/.claude/skills/_lib:${PYTHONPATH:-}"

if [ "$#" -lt 2 ]; then
  echo "Usage: bash run_skill.sh <skill-name> <script-name> [args...]" >&2
  exit 64
fi

skill_name="$1"
script_name="$2"
shift 2

script_path="$HOME/.claude/skills/$skill_name/scripts/$script_name"

if [ ! -f "$script_path" ]; then
  echo "Skill script not found: $script_path" >&2
  exit 66
fi

log_dir="${STEMSTUDIO_TOOL_LOG_DIR:-$HOME/.claude/stemstudio-tool-runs}"
mkdir -p "$log_dir"

args=("$@")
session_id="${STUDIO_SESSION_ID:-unknown}"

log_file="$log_dir/${session_id}.log"
stdout_file="$(mktemp)"
stderr_file="$(mktemp)"
started_ms="$(python3 -c 'import time; print(int(time.time() * 1000))')"

set +e
python3 "$script_path" "${args[@]}" >"$stdout_file" 2>"$stderr_file"
exit_code="$?"
set -e

finished_ms="$(python3 -c 'import time; print(int(time.time() * 1000))')"
duration_ms="$((finished_ms - started_ms))"
timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

{
  printf '%s skill=%s script=%s exit=%s duration_ms=%s\n' \
    "$timestamp" "$skill_name" "$script_name" "$exit_code" "$duration_ms"

  if [ "${#args[@]}" -gt 0 ]; then
    printf 'args='
    printf '%q ' "${args[@]}"
    printf '\n'
  fi

  if [ -s "$stderr_file" ]; then
    echo "stderr<<'EOF'"
    cat "$stderr_file"
    echo "EOF"
  fi

  echo
} >>"$log_file"

cat "$stdout_file"
cat "$stderr_file" >&2

rm -f "$stdout_file" "$stderr_file"

exit "$exit_code"
