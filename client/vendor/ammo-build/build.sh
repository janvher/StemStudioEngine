#!/bin/bash
set -e

# Build ammo.js WASM with growable memory (64MB initial → 256MB max).
#
# Prerequisites:
#   - Docker installed (uses the Dockerfile from the ammo.js fork)
#   OR
#   - emscripten SDK installed and activated (source emsdk_env.sh)
#   - cmake installed
#   - python3 installed
#
# Usage:
#   ./build.sh              # Build release
#   ./build.sh --install    # Build + copy output into client/assets/js/ammo/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/ammo.js"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_FLAG=false

for arg in "$@"; do
    case "$arg" in
        --install) INSTALL_FLAG=true ;;
    esac
done

# ---------- Clone / update repo ----------
if [ ! -d "$REPO_DIR" ]; then
    echo "==> Cloning dotErth/ammo.js..."
    git clone --depth 1 https://github.com/dotErth/ammo.js.git "$REPO_DIR"
else
    echo "==> ammo.js already cloned, pulling latest..."
    git -C "$REPO_DIR" pull --ff-only || true
fi

cd "$REPO_DIR"

# ---------- Custom memory flags ----------
# The upstream build uses 64MB fixed (non-growable).
# We override to: 64MB initial, growable up to 256MB.
EXTRA_LINK_FLAGS="-s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=67108864 -s MAXIMUM_MEMORY=268435456"

echo "==> Building ammo.js with growable memory (64MB initial, 256MB max)..."
echo "    Extra linker flags: $EXTRA_LINK_FLAGS"

# ---------- Build with Docker (preferred) ----------
if command -v docker &>/dev/null; then
    echo "==> Using Docker build..."
    # The dotErth/ammo.js fork has a Dockerfile for building.
    # We inject extra linker flags via environment variable.
    docker build -t ammo-builder .
    docker run --rm \
        -e EXTRA_LINK_FLAGS="$EXTRA_LINK_FLAGS" \
        -v "$REPO_DIR/builds:/src/builds" \
        ammo-builder \
        bash -c 'cd /src && make wasm EXTRA_LINK_FLAGS="$EXTRA_LINK_FLAGS"'
else
    echo "==> Docker not found, using local emscripten..."
    echo "    Make sure you have run: source ~/emsdk/emsdk_env.sh"
    make wasm EXTRA_LINK_FLAGS="$EXTRA_LINK_FLAGS"
fi

echo ""
echo "==> Build complete. Output in: $REPO_DIR/builds/"
ls -lh "$REPO_DIR/builds/ammo.wasm."* 2>/dev/null || true

# ---------- Install into client/assets/js/ammo/ ----------
if [ "$INSTALL_FLAG" = true ]; then
    DEST="$PROJECT_ROOT/client/assets/js/ammo"
    echo ""
    echo "==> Installing into $DEST ..."

    cp "$REPO_DIR/builds/ammo.wasm.js" "$DEST/ammo.wasm.js"
    cp "$REPO_DIR/builds/ammo.wasm.wasm" "$DEST/ammo.wasm.wasm"

    # Apply ESM export patch
    echo "==> Applying ESM export patch to ammo.wasm.js..."
    # Comment out the global assignment: this.Ammo=X;
    sed -i.bak 's/this\.Ammo=[a-zA-Z];/\/\/ this.Ammo=d;/' "$DEST/ammo.wasm.js"
    # Add ESM default export at end of file
    echo 'export default Ammo;' >> "$DEST/ammo.wasm.js"
    rm -f "$DEST/ammo.wasm.js.bak"

    # Copy types if available
    if [ -f "$REPO_DIR/builds/ammo.wasm.d.ts" ]; then
        cp "$REPO_DIR/builds/ammo.wasm.d.ts" "$PROJECT_ROOT/client/src/types/ammo.wasm.d.ts"
        echo "==> Copied type definitions to client/src/types/ammo.wasm.d.ts"
    fi

    echo "==> Done. Restart your dev server to pick up the new WASM."
fi
