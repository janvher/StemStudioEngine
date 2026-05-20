# StemStudio Engine Reference

StemStudio (Studio 3D) is a browser-based 3D game engine built with TypeScript, React, and Three.js. The AI Copilot controls it remotely via JSONRPC 2.0 commands over WebSocket and authors custom gameplay through JavaScript behaviors plus `behavior.json` metadata.

## Documentation Index

| File | Description |
|------|-------------|
| [architecture.md](architecture.md) | Engine tech stack, module map, scene graph, global state |
| [communication-flow.md](communication-flow.md) | ACP -> Copilot -> WebSocket -> Editor data pipeline |
| [commands-reference.md](commands-reference.md) | JSONRPC commands and parameter expectations |
| [behavior-system.md](behavior-system.md) | Behavior lifecycle, `this.erth`, `this.gameObject`, attribute schema, forbidden patterns |
| [behavior-catalog.md](behavior-catalog.md) | Built-in behavior packs with IDs and categories |
| [game-design-patterns.md](game-design-patterns.md) | State machines, spawning, progression, AI, input, cooldowns |
| [editor-preview-callbacks.md](editor-preview-callbacks.md) | Split runtime logic from editor-preview rendering callbacks |
| [performance-patterns.md](performance-patterns.md) | Hot-path allocation rules, pooling, instancing, cleanup |
| [asset-loading-patterns.md](asset-loading-patterns.md) | `erth.asset.*`, preload/findByName/createInstance, texture wiring |
| [camera-guide.md](camera-guide.md) | Built-in camera types, custom camera rules, 2D/3D setup guidance |
| [physics-system.md](physics-system.md) | Ammo.js physics, body shapes, collision types, character controller |
| [event-system.md](event-system.md) | EventBus API and IN_GAME_EVENTS enum catalog |
| [vfx-particle-system.md](vfx-particle-system.md) | Three.Quarks particle config, VFX behaviors, render modes |
| [prefab-system.md](prefab-system.md) | Prefab/Stem lifecycle, AssetRef, serialization |
| [genres/](genres/) | Genre playbooks for platformers, racing, shooters, horror, strategy, and more |

## Recommended Reading Paths

| Working on... | Read |
|---------------|------|
| Creating or modifying scene objects | `commands-reference.md` |
| Writing or attaching behaviors | `behavior-system.md`, `behavior-catalog.md` |
| Creating a full game loop | `game-design-patterns.md`, matching file in `genres/` |
| Editor-safe visual previews | `editor-preview-callbacks.md` |
| Asset lookup or runtime loading | `asset-loading-patterns.md` |
| Camera selection or follow rigs | `camera-guide.md`, `game-design-patterns.md` |
| Performance cleanup or pooling | `performance-patterns.md` |
| Inter-behavior messaging | `event-system.md`, `behavior-system.md` |
| Physics bodies and collisions | `physics-system.md` |
| Particle effects | `vfx-particle-system.md` |
| Reusable object templates | `prefab-system.md` |
| Debugging the WS pipeline | `communication-flow.md` |
| Understanding the engine | `architecture.md` |
