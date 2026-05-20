#!/bin/bash
set -e

# Build Rapier3D WASM from source (placeholder for future custom builds).
#
# Currently the npm package @dimforge/rapier3d-compat works fine:
#   - 1MB initial memory, growable, no maximum
#
# This script is provided for future customization (e.g., custom features,
# Bullet-compatible collision filters, SIMD builds).
#
# Prerequisites:
#   - Rust toolchain (rustup)
#   - wasm-pack: cargo install wasm-pack
#   - wasm-bindgen-cli: cargo install wasm-bindgen-cli
#
# Usage:
#   ./build.sh              # Build release
#   ./build.sh --install    # Build + copy output into node_modules

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/rapier"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_FLAG=false

for arg in "$@"; do
    case "$arg" in
        --install) INSTALL_FLAG=true ;;
    esac
done

# ---------- Clone / update repo ----------
if [ ! -d "$REPO_DIR" ]; then
    echo "==> Cloning dimforge/rapier..."
    git clone --depth 1 https://github.com/dimforge/rapier.git "$REPO_DIR"
else
    echo "==> rapier already cloned, pulling latest..."
    git -C "$REPO_DIR" pull --ff-only || true
fi

cd "$REPO_DIR"

# ---------- Build ----------
echo "==> Building rapier3d-compat WASM..."
echo "    Make sure you have: rustup target add wasm32-unknown-unknown"

cd crates/rapier3d-compat

wasm-pack build --target web --release --out-dir pkg

echo ""
echo "==> Build complete. Output in: $REPO_DIR/crates/rapier3d-compat/pkg/"
ls -lh pkg/*.wasm 2>/dev/null || true

# ---------- Install ----------
if [ "$INSTALL_FLAG" = true ]; then
    DEST="$PROJECT_ROOT/node_modules/@dimforge/rapier3d-compat"
    echo ""
    echo "==> Installing into $DEST ..."
    cp pkg/*.js pkg/*.wasm pkg/*.d.ts "$DEST/"
    echo "==> Done. Restart your dev server to pick up the new WASM."
fi
