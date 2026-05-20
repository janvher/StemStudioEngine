# PhysX WASM Build

Builds [physx-js-webidl](https://github.com/fabmax/physx-js-webidl) v2.7.2 (PhysX 5.6.1) with growable WASM memory.

## Prerequisites

- Emscripten (`brew install emscripten` or emsdk)
- CMake

## Usage

```bash
chmod +x build.sh
./build.sh              # Clone + build
./build.sh --install    # Clone + build + copy to node_modules
```

## Memory

- Initial: 128 MB
- Maximum: 256 MB (growable)
- Single-threaded only (physx-js-webidl has no MT build)
