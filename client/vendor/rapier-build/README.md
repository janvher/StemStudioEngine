# Custom Rapier3D WASM Build

Placeholder for building `@dimforge/rapier3d-compat` from source.

The npm package already ships with **growable memory** (1MB initial, no max), so a
custom build is not currently needed. This folder exists for future customization.

## When you'd need this

- Custom collision filter groups
- SIMD-optimized build
- Newer Rapier features not yet published to npm
- Custom memory limits

## Prerequisites

1. **Rust** — https://rustup.rs/
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```

2. **wasm-pack** — https://rustwasm.github.io/wasm-pack/
   ```bash
   cargo install wasm-pack
   ```

## Build

```bash
./build.sh              # Build only
./build.sh --install    # Build + copy into node_modules
```

## Current npm package memory settings

| Setting | Value |
|---------|-------|
| `INITIAL_MEMORY` | ~1 MB |
| `ALLOW_MEMORY_GROWTH` | Yes |
| `MAXIMUM_MEMORY` | Unlimited |
