#!/usr/bin/env bash
# Provision a Python virtualenv (.venv) for the StemStudio Copilot skill scripts.
#
# Usage:
#   source scripts/setup_python_env.sh   # provisions and activates in your shell
#   bash   scripts/setup_python_env.sh   # provisions only; prints activation hint
#
# Override the host interpreter with PYTHON=/path/to/python3 if needed.

# Resolve this script's location (works under bash and zsh, sourced or executed).
if [ -n "${BASH_SOURCE[0]:-}" ]; then
    _stemstudio_script_path="${BASH_SOURCE[0]}"
else
    _stemstudio_script_path="$0"
fi

# Detect sourced-vs-executed up front so we can `return` from a function on failure.
_stemstudio_is_sourced=0
if [ -n "${BASH_VERSION:-}" ]; then
    (return 0 2>/dev/null) && _stemstudio_is_sourced=1
elif [ -n "${ZSH_VERSION:-}" ]; then
    case "${ZSH_EVAL_CONTEXT:-}" in *:file*) _stemstudio_is_sourced=1 ;; esac
fi

_stemstudio_setup_python_env() {
    local script_dir root_dir venv_dir req_file python_bin
    script_dir="$(cd "$(dirname "$_stemstudio_script_path")" && pwd)" || return 1
    root_dir="$(cd "$script_dir/.." && pwd)" || return 1
    venv_dir="$root_dir/.venv"
    req_file="$root_dir/requirements.txt"
    python_bin="${PYTHON:-python3}"

    if ! command -v "$python_bin" >/dev/null 2>&1; then
        echo "[setup] Error: '$python_bin' not found on PATH. Set PYTHON=/path/to/python3." >&2
        return 1
    fi

    if [ ! -d "$venv_dir" ]; then
        echo "[setup] Creating virtualenv at $venv_dir"
        "$python_bin" -m venv "$venv_dir" || return 1
    else
        echo "[setup] Reusing virtualenv at $venv_dir"
    fi

    # shellcheck disable=SC1090,SC1091
    . "$venv_dir/bin/activate" || return 1

    echo "[setup] Scanning Python sources -> $req_file"
    python "$script_dir/generate_requirements.py" \
        --root "$root_dir" \
        --requirements "$req_file" || return 1

    echo "[setup] Upgrading pip"
    pip install --quiet --upgrade pip || return 1

    echo "[setup] Installing dependencies from $(basename "$req_file")"
    pip install -r "$req_file" || return 1

    echo "[setup] Done. Active Python: $(command -v python) ($(python --version 2>&1))"
    return 0
}

if _stemstudio_setup_python_env; then
    if [ "$_stemstudio_is_sourced" -eq 0 ]; then
        echo "[setup] Run 'source .venv/bin/activate' to enter the venv in your shell,"
        echo "[setup] or re-run this script with 'source scripts/setup_python_env.sh'."
    fi
    _stemstudio_setup_status=0
else
    echo "[setup] FAILED" >&2
    _stemstudio_setup_status=1
fi

unset -f _stemstudio_setup_python_env 2>/dev/null
unset _stemstudio_script_path

if [ "$_stemstudio_is_sourced" -eq 1 ]; then
    unset _stemstudio_is_sourced
    return $_stemstudio_setup_status 2>/dev/null || true
else
    _stemstudio_exit=$_stemstudio_setup_status
    unset _stemstudio_is_sourced _stemstudio_setup_status
    exit $_stemstudio_exit
fi
