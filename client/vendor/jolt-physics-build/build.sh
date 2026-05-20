#!/bin/bash
set -e

# Build jolt-physics WASM with growable memory (up to 256MB).
#
# Prerequisites:
#   - emscripten SDK installed and activated (source emsdk_env.sh)
#   - cmake installed
#   - python3 installed
#
# Usage:
#   ./build.sh              # Build Distribution (release)
#   ./build.sh Debug        # Build Debug
#   ./build.sh --install    # Build + copy output into node_modules/jolt-physics/dist

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/JoltPhysics.js"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_FLAG=false

BUILD_TYPE=Distribution
for arg in "$@"; do
    case "$arg" in
        --install) INSTALL_FLAG=true ;;
        Debug|Release|Distribution) BUILD_TYPE="$arg" ;;
    esac
done

# ---------- Clone / update repo ----------
if [ ! -d "$REPO_DIR" ]; then
    echo "==> Cloning JoltPhysics.js..."
    git clone --depth 1 https://github.com/jrouwe/JoltPhysics.js.git "$REPO_DIR"
else
    echo "==> JoltPhysics.js already cloned, pulling latest..."
    git -C "$REPO_DIR" pull --ff-only || true
fi

cd "$REPO_DIR"

# ---------- Custom memory flags ----------
# Growable memory: starts at 128 MB, can grow up to 256 MB.
MEMORY_FLAGS=(
    -DALLOW_MEMORY_GROWTH=ON
    -DINITIAL_MEMORY=134217728
    -DMAXIMUM_MEMORY=268435456
)

echo "==> Building $BUILD_TYPE with growable memory (128MB initial, 256MB max)..."
echo "    Flags: ${MEMORY_FLAGS[*]}"

# ---------- Verify emscripten ----------
if ! command -v emcmake &>/dev/null; then
    echo "ERROR: emscripten not found. Install via:"
    echo "  brew install emscripten"
    echo "  OR: git clone https://github.com/emscripten-core/emsdk.git && ./emsdk install latest && ./emsdk activate latest && source emsdk_env.sh"
    exit 1
fi

# The JoltPhysics.js CMakeLists.txt sets:
#   EMSCRIPTEN_ROOT = $EMSDK/upstream/emscripten
#   CMAKE_TOOLCHAIN_FILE = $EMSCRIPTEN_ROOT/cmake/Modules/Platform/Emscripten.cmake
# Homebrew's layout differs, so we find the real toolchain and derive the root.
TOOLCHAIN_FILE="$(find -L "$(brew --prefix emscripten 2>/dev/null || dirname "$(command -v emcc)")" -name Emscripten.cmake -path '*/cmake/Modules/Platform/*' 2>/dev/null | head -1)"
if [ -z "$TOOLCHAIN_FILE" ] && [ -n "$EMSDK" ]; then
    TOOLCHAIN_FILE="$EMSDK/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"
fi
if [ ! -f "$TOOLCHAIN_FILE" ]; then
    echo "ERROR: Cannot find Emscripten.cmake toolchain file"
    exit 1
fi
# EMSCRIPTEN_ROOT is the dir containing cmake/Modules/Platform/Emscripten.cmake
EMSCRIPTEN_ROOT_RESOLVED="$(cd "$(dirname "$TOOLCHAIN_FILE")/../../.." && pwd)"
echo "==> Emscripten root: $EMSCRIPTEN_ROOT_RESOLVED"
echo "==> Toolchain: $TOOLCHAIN_FILE"

# Ensure dist/ exists (the build writes .d.ts files there)
mkdir -p "$REPO_DIR/dist"

# ---------- Single-threaded build ----------
echo ""
echo "==> Building single-threaded..."
emcmake cmake -B Build/$BUILD_TYPE/ST \
    -DCMAKE_BUILD_TYPE=$BUILD_TYPE \
    -DEMSCRIPTEN_ROOT="$EMSCRIPTEN_ROOT_RESOLVED" \
    "${MEMORY_FLAGS[@]}"
cmake --build Build/$BUILD_TYPE/ST -j$(nproc 2>/dev/null || sysctl -n hw.ncpu)

# ---------- Multi-threaded build ----------
echo ""
echo "==> Building multi-threaded..."
emcmake cmake -B Build/$BUILD_TYPE/MT \
    -DENABLE_MULTI_THREADING=ON \
    -DENABLE_SIMD=ON \
    -DCMAKE_BUILD_TYPE=$BUILD_TYPE \
    -DEMSCRIPTEN_ROOT="$EMSCRIPTEN_ROOT_RESOLVED" \
    "${MEMORY_FLAGS[@]}"
cmake --build Build/$BUILD_TYPE/MT -j$(nproc 2>/dev/null || sysctl -n hw.ncpu)

# ---------- Generate .d.ts files ----------
cat > ./dist/jolt-physics.d.ts << 'DTSEOF'
import Jolt from "./types";

export default Jolt;
export * from "./types";

DTSEOF

for variant in wasm wasm-compat multithread multithread.wasm multithread.wasm-compat; do
    cp ./dist/jolt-physics.d.ts "./dist/jolt-physics.${variant}.d.ts" 2>/dev/null || true
done

echo ""
echo "==> Build complete. Output in: $REPO_DIR/dist/"
ls -lh "$REPO_DIR/dist/"*.wasm* 2>/dev/null || true

# ---------- Install into node_modules ----------
if [ "$INSTALL_FLAG" = true ]; then
    DEST="$PROJECT_ROOT/node_modules/jolt-physics/dist"
    echo ""
    echo "==> Installing into $DEST ..."
    cp "$REPO_DIR/dist/"* "$DEST/"
    echo "==> Done. Restart your dev server to pick up the new WASM."
fi
