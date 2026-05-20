---
name: stemstudio-game-engine
description: Runtime engine API guidance for behaviors that capture `game` in `init(_game)` and use `this.erth` for engine helpers in Studio 3D. Use when behavior code needs physics, camera, audio, animation, collision, input, or asset/runtime services.
---

# StemStudio Game Engine

Use this skill when you are writing or debugging behavior code that needs runtime engine services.

This is a reference-routing skill, not a scene command skill.

## Use This Skill For

- closure-captured `game` / `GameManager` access
- player registration and lookup
- camera, audio, animation, collision, physics, and input services
- deciding whether to use `game`, `this.erth`, or another runtime interface

If the task is mainly about:
- writing behavior code -> also load `stemstudio-behaviors`
- configuring object physics -> `stemstudio-physics`
- input mappings -> `stemstudio-input-manager`
- event messaging -> `stemstudio-eventbus`

## Critical Rules

- use only documented engine APIs
- do not invent GameManager methods
- do not assign `this.game = game`; capture `_game` into a closure variable instead
- null-check runtime services and `game.player`
- register the player explicitly when the game depends on player-aware systems
- tag the playable player object with `Player` before relying on character-controller or camera-follow behavior
- use `game.camera` for the active camera rather than treating `this.target` as the camera
- use `this.erth` for asset lookup/loading, scene helpers, cross-behavior access, lambdas, pooling, and camera helpers
- respect the Three.js right-handed coordinate convention: **+X right, +Y up, -Z forward**. Camera local-forward is `-Z`; `getWorldDirection(v)` already returns the look direction. For an object's own forward, transform `(0, 0, -1)` by its world quaternion. See `~/.claude/stemstudio-docs/architecture.md` "Coordinate Convention"

## Common Runtime Patterns

### Player registration

When a behavior creates or owns the player object, mark it clearly through the runtime API in the correct lifecycle phase. Do not assume `game.player` is already populated.

When creating a scene player object through copilot tools, also add the object tag `Player` to the same object. Camera follow and player-aware built-ins use that tag to resolve the playable target. If the object was just created, run the object modification tool after creation, for example `modify_object Player --tag Player`.

### Engine services

Typical engine-service access patterns:
- animation playback and blending
- physics interaction
- audio triggers
- camera control
- collision queries
- object picking and pointer-driven interactions
- input polling through `game.inputManager`
- asset loading through `this.erth.asset.*`
- behavior-to-behavior coordination through `this.erth.behaviors.*`

Use the narrowest engine subsystem you need rather than treating GameManager as a generic catch-all. Prefer `game.renderer`, `game.physics`, `game.camera`, and `game.engine` for runtime access. `game.app` is a legacy compatibility alias for `game.engine`; do not use it in newly generated behavior code.

## Routing Guidance

When you need:
- behavior lifecycle rules -> `stemstudio-behaviors`
- physics API details -> `stemstudio-physics`
- raw input access -> `stemstudio-input-manager`
- publish/subscribe communication -> `stemstudio-eventbus`
- gameplay structure -> `stemstudio-game-design`

## When To Read More

- Need engine responsibilities or subsystem ownership: `~/.claude/stemstudio-docs/architecture.md`
- Need runtime lifecycle context around captured `game` and `this.erth`: `~/.claude/stemstudio-docs/behavior-system.md`
- Need asset-loading patterns and async rules: `~/.claude/stemstudio-docs/asset-loading-patterns.md`
- Need camera selection rules: `~/.claude/stemstudio-docs/camera-guide.md`
- Need performance guidance for hot paths and cleanup: `~/.claude/stemstudio-docs/performance-patterns.md`
- Need exact `GameManager` or service method names: `~/.claude/stemstudio-types/stem-types.d.ts`
- Need deeper physics service semantics: `~/.claude/stemstudio-docs/physics-system.md`

If you need a concrete implementation pattern, open a targeted behavior example instead of broad reference reading.

## Common Mistakes

- assuming undocumented methods exist
- reading `game.player` before the player has been registered
- writing `this.game = game` or relying on `this.findBehavior(...)`
- using asset helpers without awaiting async calls
- mixing engine-service questions with scene-command execution
- loading this skill when the task is really just scene editing

## See Also

- `stemstudio-behaviors`
- `stemstudio-physics`
- `stemstudio-input-manager`
- `stemstudio-eventbus`
