"""Shared utilities for StemStudio skill scripts."""

import json
import os
import sys


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def base_url():
    """Return the API server base URL from env or default."""
    return os.environ.get("API_SERVER_BASE_URL", "http://localhost:3000")


# ---------------------------------------------------------------------------
# HTTP helpers (requests imported lazily)
# ---------------------------------------------------------------------------

def get_session_id():
    """Return the active session ID from the STUDIO_SESSION_ID environment variable."""
    sid = os.environ.get("STUDIO_SESSION_ID")
    if not sid:
        print(
            "Error: STUDIO_SESSION_ID environment variable is not set. "
            "Obtain a session id from StemStudio and set it in your shell, "
            "for example: export STUDIO_SESSION_ID=...",
            file=sys.stderr,
        )
        sys.exit(1)
    return sid


def studio_get(path, params=None, url=None, timeout=30):
    """GET /api/studio/scene/{path}/{session_id} and return parsed JSON."""
    import requests
    session_id = get_session_id()
    full_url = f"{url or base_url()}/api/studio/scene/{path}/{session_id}"
    try:
        resp = requests.get(full_url, params=params, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        detail = ""
        if hasattr(e, "response") and e.response is not None:
            try:
                detail = " " + e.response.text
            except Exception:
                pass
        print(f"Error: {e}{detail}", file=sys.stderr)
        sys.exit(1)


def studio_post(path, body, url=None, timeout=30):
    """POST /api/studio/scene/{path}/{session_id} and return parsed JSON."""
    import requests
    session_id = get_session_id()
    full_url = f"{url or base_url()}/api/studio/scene/{path}/{session_id}"
    try:
        resp = requests.post(full_url, json=body, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        detail = ""
        if hasattr(e, "response") and e.response is not None:
            try:
                detail = " " + e.response.text
            except Exception:
                pass
        print(f"Error: {e}{detail}", file=sys.stderr)
        sys.exit(1)


def studio_delete(path, params=None, url=None, timeout=30):
    """DELETE /api/studio/scene/{path}/{session_id} and return parsed JSON."""
    import requests
    session_id = get_session_id()
    full_url = f"{url or base_url()}/api/studio/scene/{path}/{session_id}"
    try:
        resp = requests.delete(full_url, params=params, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        detail = ""
        if hasattr(e, "response") and e.response is not None:
            try:
                detail = " " + e.response.text
            except Exception:
                pass
        print(f"Error: {e}{detail}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# JSON-RPC helpers
# ---------------------------------------------------------------------------

def jsonrpc(method, params, message_id=1):
    """Return a JSON-RPC 2.0 message string."""
    return json.dumps({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": int(message_id),
    })


def jsonrpc_batch(method, items, param_keys=None, start_id=1):
    """Return a JSON array of JSON-RPC 2.0 messages.

    *items* is a list of dicts.  If *param_keys* is given, only those keys
    are copied into each message's ``params``; otherwise the whole dict is
    used as-is.
    """
    messages = []
    for i, item in enumerate(items):
        if param_keys:
            params = {k: item[k] for k in param_keys if k in item}
        else:
            params = item
        messages.append({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": start_id + i,
        })
    return json.dumps(messages)


# ---------------------------------------------------------------------------
# Parameter helpers
# ---------------------------------------------------------------------------

def build_params(**kwargs):
    """Build a dict, omitting keys whose values are ``None``."""
    return {k: v for k, v in kwargs.items() if v is not None}


def vec3(xyz):
    """Convert a 3-element list ``[x, y, z]`` to ``{"x": …, "y": …, "z": …}``.

    Returns ``None`` if *xyz* is ``None``.
    """
    if xyz is None:
        return None
    return {"x": xyz[0], "y": xyz[1], "z": xyz[2]}


def parse_json_arg(value, name="argument"):
    """Parse a JSON string CLI argument.  On failure, print to stderr and exit."""
    if value is None:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in --{name}: {e}", file=sys.stderr)
        sys.exit(1)


def parse_bool(value):
    """Argparse ``type=`` helper for boolean flags."""
    if value.lower() in ("true", "1", "yes", "on"):
        return True
    if value.lower() in ("false", "0", "no", "off"):
        return False
    raise ValueError(f"Boolean value expected, got '{value}'")


# ---------------------------------------------------------------------------
# Texture encoding
# ---------------------------------------------------------------------------

def encode_texture(file_path):
    """Read a texture file and return a data-URL string."""
    import base64
    import urllib.parse

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Texture file not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    mime_types = {
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    mime = mime_types.get(ext, "application/octet-stream")

    with open(file_path, "rb") as f:
        content = f.read()

    if ext == ".svg":
        return f"data:{mime},{urllib.parse.quote(content.decode('utf-8'))}"
    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{mime};base64,{encoded}"


# ---------------------------------------------------------------------------
# Argparse helpers
# ---------------------------------------------------------------------------

def add_session_args(parser):
    """Add ``--url`` (optional) argument. Session ID is read from STUDIO_SESSION_ID env var."""
    parser.add_argument("--url", default=base_url(),
                        help="Base URL of the API server (default from API_SERVER_BASE_URL env or http://localhost:3000)")


def add_session_arg_optional(parser):
    """Add ``--url`` (optional) argument for JSONRPC output scripts."""
    parser.add_argument("--url", default=None,
                        help="API base URL (not used by JSONRPC output scripts)")


def add_id_arg(parser):
    """Add ``--id`` argument for JSON-RPC message ID."""
    parser.add_argument("--id", type=int, default=1,
                        help="JSONRPC message ID")


def add_transform_args(parser):
    """Add ``--position``, ``--rotation``, ``--scale`` (nargs=3) arguments."""
    parser.add_argument("--position", nargs=3, type=float,
                        metavar=("X", "Y", "Z"), help="Position as x y z")
    parser.add_argument("--rotation", nargs=3, type=float,
                        metavar=("X", "Y", "Z"),
                        help="Rotation as x y z in radians")
    parser.add_argument("--scale", nargs=3, type=float,
                        metavar=("X", "Y", "Z"), help="Scale as x y z")


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def output(data):
    """Print *data* as JSON to stdout."""
    print(json.dumps(data))
