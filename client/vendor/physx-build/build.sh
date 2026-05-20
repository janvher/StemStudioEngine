#!/usr/bin/env bash
# Build physx-js-webidl WASM with emscripten + growable memory.
# Usage:
#   ./build.sh            # Clone + build
#   ./build.sh --install  # Clone + build + copy output to node_modules
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC_DIR="$SCRIPT_DIR/physx-js-webidl"
INSTALL_FLAG=false

for arg in "$@"; do
    case "$arg" in
        --install) INSTALL_FLAG=true ;;
    esac
done

# --- Clone ---
if [ ! -d "$SRC_DIR" ]; then
    echo "Cloning physx-js-webidl..."
    git clone --depth 1 --branch v2.7.2 https://github.com/fabmax/physx-js-webidl.git "$SRC_DIR"
fi

# --- Find emscripten toolchain ---
EMSCRIPTEN_CMAKE=""
if command -v emcmake &>/dev/null; then
    EMSDK_DIR="$(dirname "$(command -v emcmake)")"
    EMSCRIPTEN_CMAKE="$(find -L "$EMSDK_DIR/.." -name Emscripten.cmake -print -quit 2>/dev/null || true)"
fi

if [ -z "$EMSCRIPTEN_CMAKE" ] && [ -d "/opt/homebrew/opt/emscripten" ]; then
    EMSCRIPTEN_CMAKE="$(find -L /opt/homebrew/opt/emscripten -name Emscripten.cmake -print -quit 2>/dev/null || true)"
fi

if [ -z "$EMSCRIPTEN_CMAKE" ]; then
    echo "ERROR: Cannot find Emscripten.cmake. Install emscripten first."
    exit 1
fi
echo "Using emscripten toolchain: $EMSCRIPTEN_CMAKE"

# --- Build ---
cd "$SRC_DIR"
mkdir -p build && cd build

cmake .. \
    -DCMAKE_TOOLCHAIN_FILE="$EMSCRIPTEN_CMAKE" \
    -DCMAKE_BUILD_TYPE=Release \
    -DPHYSX_ENABLE_CUDA=OFF \
    -DCMAKE_EXE_LINKER_FLAGS="-s INITIAL_MEMORY=134217728 -s MAXIMUM_MEMORY=268435456 -s ALLOW_MEMORY_GROWTH=1" \
    -G "Unix Makefiles"

make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"

echo "Build complete."

# --- Install ---
if [ "$INSTALL_FLAG" = true ]; then
    DEST="$REPO_ROOT/node_modules/physx-js-webidl/dist"
    mkdir -p "$DEST"
    cp -v "$SRC_DIR/dist/"* "$DEST/" 2>/dev/null || echo "No dist files found to copy."
    echo "Installed to $DEST"
fi
