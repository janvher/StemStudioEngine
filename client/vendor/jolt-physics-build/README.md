# Custom Jolt Physics WASM Build

Builds `jolt-physics` with **growable WASM memory** (128MB initial → 256MB max).

The upstream npm package ships with a fixed 128MB non-growable heap which causes
`RuntimeError: memory access out of bounds` with large terrain scenes.

## Prerequisites

1. **Emscripten SDK** — https://emscripten.org/docs/getting_started/downloads.html
   ```bash
   git clone https://github.com/nicbarker/emsdk.git ~/emsdk
   cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest
   source ~/emsdk/emsdk_env.sh
   ```

2. **CMake** — `brew install cmake`

3. **Python 3** — should already be installed on macOS

## Build

```bash
# Make sure emscripten is activated
source ~/emsdk/emsdk_env.sh

# Build and install into node_modules
./build.sh --install

# Or just build (output goes to JoltPhysics.js/dist/)
./build.sh
```

## What it changes

| Setting | Upstream | This build |
|---------|----------|------------|
| `ALLOW_MEMORY_GROWTH` | `OFF` | `ON` |
| `INITIAL_MEMORY` | 128 MB | 128 MB |
| `MAXIMUM_MEMORY` | N/A | 256 MB |

Both single-threaded and multi-threaded variants are built.

## After building

Restart the dev server (`bun run run-dev-env`) to pick up the new WASM files.
