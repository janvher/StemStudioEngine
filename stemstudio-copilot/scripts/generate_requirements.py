#!/usr/bin/env python3
"""Scan the project's Python sources and append any missing third-party
dependencies to requirements.txt.

This is purely additive: existing entries (including comments and version
pins) are preserved. Imports that resolve to the standard library or to
modules defined inside the project are skipped.

Usage:
    python scripts/generate_requirements.py --root <project> --requirements <path>
"""

from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path
from typing import Iterable

# Map import name -> PyPI distribution name when they differ.
IMPORT_TO_PKG = {
    "cv2": "opencv-python",
    "PIL": "Pillow",
    "bs4": "beautifulsoup4",
    "yaml": "PyYAML",
    "sklearn": "scikit-learn",
    "skimage": "scikit-image",
    "google": "google-api-python-client",
    "dotenv": "python-dotenv",
    "dateutil": "python-dateutil",
    "magic": "python-magic",
}

# Directories never scanned and never used as local-module sources.
EXCLUDE_DIRS = {
    ".venv", "venv", "env", "node_modules", "__pycache__", ".git",
    "dist", "build", ".mypy_cache", ".pytest_cache", ".tox", ".eggs",
}

# Python 3.10+ exposes sys.stdlib_module_names; older runtimes don't.
# Fallback list covers the modules we're realistically going to encounter.
_STDLIB_FALLBACK = frozenset({
    "__future__", "_thread", "abc", "argparse", "array", "ast", "asyncio",
    "atexit", "base64", "binascii", "bisect", "builtins", "bz2", "calendar",
    "cmath", "cmd", "codecs", "collections", "colorsys", "concurrent",
    "configparser", "contextlib", "contextvars", "copy", "copyreg", "csv",
    "ctypes", "curses", "dataclasses", "datetime", "decimal", "difflib",
    "dis", "doctest", "email", "encodings", "enum", "errno", "faulthandler",
    "fcntl", "filecmp", "fileinput", "fnmatch", "fractions", "ftplib",
    "functools", "gc", "getopt", "getpass", "gettext", "glob", "graphlib",
    "gzip", "hashlib", "heapq", "hmac", "html", "http", "imaplib", "imp",
    "importlib", "inspect", "io", "ipaddress", "itertools", "json",
    "keyword", "linecache", "locale", "logging", "lzma", "mailbox",
    "marshal", "math", "mimetypes", "mmap", "multiprocessing", "netrc",
    "numbers", "operator", "optparse", "os", "pathlib", "pdb", "pickle",
    "pkgutil", "platform", "plistlib", "poplib", "posix", "posixpath",
    "pprint", "profile", "pstats", "pwd", "py_compile", "pyclbr", "pydoc",
    "queue", "quopri", "random", "re", "readline", "reprlib", "resource",
    "runpy", "sched", "secrets", "select", "selectors", "shelve", "shlex",
    "shutil", "signal", "site", "smtplib", "sndhdr", "socket", "socketserver",
    "sqlite3", "ssl", "stat", "statistics", "string", "stringprep", "struct",
    "subprocess", "symtable", "sys", "sysconfig", "syslog", "tabnanny",
    "tarfile", "telnetlib", "tempfile", "termios", "test", "textwrap",
    "threading", "time", "timeit", "tkinter", "token", "tokenize", "tomllib",
    "trace", "traceback", "tracemalloc", "tty", "turtle", "types", "typing",
    "unicodedata", "unittest", "urllib", "uu", "uuid", "venv", "warnings",
    "wave", "weakref", "webbrowser", "wsgiref", "xdrlib", "xml", "xmlrpc",
    "zipapp", "zipfile", "zipimport", "zlib", "zoneinfo",
})


def stdlib_modules() -> frozenset[str]:
    names = getattr(sys, "stdlib_module_names", None)
    if names is None:
        return _STDLIB_FALLBACK
    return frozenset(names) | _STDLIB_FALLBACK


def normalize_pkg(name: str) -> str:
    """PEP 503 normalization for distribution names."""
    return re.sub(r"[-_.]+", "-", name).lower()


def parse_existing_requirements(path: Path) -> set[str]:
    if not path.exists():
        return set()
    pkgs: set[str] = set()
    for raw in path.read_text().splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        line = re.sub(r"\[.*?\]", "", line)  # drop extras
        m = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)", line)
        if m:
            pkgs.add(normalize_pkg(m.group(1)))
    return pkgs


def _is_excluded(path: Path, root: Path) -> bool:
    try:
        rel = path.relative_to(root)
    except ValueError:
        return True
    return any(part in EXCLUDE_DIRS for part in rel.parts)


def discover_local_modules(root: Path) -> set[str]:
    locals_: set[str] = set()
    for p in root.rglob("*.py"):
        if _is_excluded(p, root):
            continue
        if p.name != "__init__.py":
            locals_.add(p.stem)
        else:
            locals_.add(p.parent.name)
    return locals_


def iter_python_files(root: Path) -> Iterable[Path]:
    for p in root.rglob("*.py"):
        if _is_excluded(p, root):
            continue
        yield p


def collect_imports(py_file: Path) -> set[str]:
    try:
        source = py_file.read_text(errors="ignore")
        tree = ast.parse(source, filename=str(py_file))
    except (SyntaxError, OSError):
        return set()
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                found.add(alias.name.split(".", 1)[0])
        elif isinstance(node, ast.ImportFrom):
            if node.level == 0 and node.module:
                found.add(node.module.split(".", 1)[0])
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", required=True, help="Project root to scan.")
    ap.add_argument("--requirements", required=True, help="Path to requirements.txt.")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    req_path = Path(args.requirements).resolve()

    stdlib = stdlib_modules()
    local_mods = discover_local_modules(root)

    all_imports: set[str] = set()
    for py in iter_python_files(root):
        all_imports |= collect_imports(py)

    third_party = sorted(
        name for name in all_imports
        if name and not name.startswith("_")
        and name not in stdlib
        and name not in local_mods
    )

    detected = sorted({IMPORT_TO_PKG.get(name, name) for name in third_party})
    detected_by_norm = {normalize_pkg(p): p for p in detected}

    existing = parse_existing_requirements(req_path)
    missing = sorted(orig for norm, orig in detected_by_norm.items() if norm not in existing)

    if not missing:
        print(
            f"[generate-requirements] {req_path.name} already covers all detected imports "
            f"({len(detected)} package(s) scanned)."
        )
        return 0

    block = (
        "\n# --- auto-detected by scripts/generate_requirements.py ---\n"
        + "\n".join(missing)
        + "\n"
    )

    if req_path.exists():
        text = req_path.read_text()
        if text and not text.endswith("\n"):
            text += "\n"
        req_path.write_text(text + block)
    else:
        req_path.parent.mkdir(parents=True, exist_ok=True)
        req_path.write_text(block.lstrip("\n"))

    print(
        f"[generate-requirements] Added {len(missing)} package(s) to {req_path.name}: "
        + ", ".join(missing)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
