---
name: stemstudio-behaviors
description: Behavior discovery, creation, update, attach/detach, and configuration in Studio 3D. Use for built-in behavior reuse first, then custom behavior authoring only when needed.
---

# StemStudio Behaviors

Primary skill for behavior reuse and custom behavior workflows.

Use this skill when the task involves:
- finding an existing behavior pack
- reading a behavior's schema or source
- attaching or detaching a behavior
- updating attached behavior configuration
- creating or updating a custom behavior

## Start Here

Behavior work is always pack-first:

1. search existing behaviors
2. inspect the chosen behavior
3. attach or configure it
4. write custom code only if built-ins do not cover the mechanic

Start with:

```bash
python scripts/list_behaviors.py
python scripts/list_behaviors.py --filter "movement"
```

If a candidate exists, inspect it before attaching:

```bash
python scripts/get_behavior.py --behaviorId "BEHAVIOR_ID"
```

## Critical Workflows

### Attach an existing behavior

```bash
python scripts/attach_behavior.py --target "Player" --behaviorId "BEHAVIOR_ID" --config '{"speed":5}'
```

Update config later with:

```bash
python scripts/set_behavior_config.py --target "Player" --behaviorId "BEHAVIOR_ID" --attributesData '{"speed":8}'
```

Detach when needed:

```bash
python scripts/detach_behavior.py --target "Player" --behaviorId "BEHAVIOR_ID"
```

### Create a custom behavior

Write the code file and metadata file, then create the behavior:

```bash
python scripts/add_behavior.py --name "Rotate" --code /tmp/rotate.js --metadata /tmp/rotate.behavior.json
```

Important:
- `add_behavior.py` returns the real `behaviorId`
- use that returned `behaviorId` for attach, config, and updates
- never use the behavior name as a substitute for the ID
- never attach to `GlobalBehaviorsHost`; attach to the actual owning object or a dedicated host object

Typical flow:

1. write `/tmp/behavior.js`
2. write `/tmp/behavior.json`
3. call `add_behavior.py`
4. inspect returned `codeValidation`
5. if `codeValidation` contains errors, fix and retry before attaching
6. capture the returned `behaviorId`
7. call `attach_behavior.py`
8. verify with `get_behavior.py` or scene inspection

### Update an existing custom behavior

```bash
python scripts/update_behavior.py --behaviorId "BEHAVIOR_ID" --code /tmp/rotate.js --metadata /tmp/rotate.behavior.json
```

Treat `codeValidation` exactly the same as on create:
- errors are blocking
- warnings and info should drive the next refinement pass
- never claim success while unresolved validator errors remain

### Batch behavior work

Always use batch scripts for 2+ objects:

```bash
python scripts/batch_attach_behaviors.py --targets Enemy1 Enemy2 --behaviorId "BEHAVIOR_ID" --config '{"aggressive":true}'
python scripts/batch_detach_behaviors.py --targets Enemy1 Enemy2 --behaviorId "BEHAVIOR_ID"
```

### Navmesh and waypoint setup

Use these built-in navigation helpers for AI patrols, pathing, and off-mesh links:

```bash
python scripts/add_navmesh.py --target "Default Scene" --autoGenerate true --agentHeight 1.8 --agentRadius 0.45
python scripts/rebuild_navmesh.py --target "Default Scene"
python scripts/add_navmesh_connection.py "RooftopStart" "RooftopEnd" --bidirectional false --radius 0.75
python scripts/add_waypoint_path.py --name "MarketLoop" --position 0 0 0 --loop true
python scripts/add_waypoint.py --path "MarketLoop" --position 12 0 8 --order 0 --waitTime 1.5
```

For navmesh baking, configure static level geometry with physics first when using `--onlyPhysicsMeshes true`.

## Code Rules

Before writing custom code:
- load `stemstudio-game-engine` for engine API details
- load `stemstudio-eventbus` for event names and messaging patterns
- load `stemstudio-lambdas` when the behavior reads or writes ECS-style data
- load `stemstudio-scripts` when the behavior should pull shared helpers via `@import` (or when extracting helpers a behavior duplicates)
- load `stemstudio-game-design` when the mechanic is part of a bigger gameplay loop
- **load `stemstudio-input-manager` before writing any custom movement / vehicle / flight / character controller** — it documents keyboard/gamepad/touch parity, the -Z forward convention, physics tradeoffs, and why you must NOT copy `BipedalControl`'s internal axis math. Skipping this is the source of "W moves backward", "model is inverted", "works on keyboard but not phone", and "plane flies but cannot land" bugs.

### SYNTAX RULES — VIOLATIONS WILL CRASH THE ENGINE

**1. No `class`, no `export`, no `import`.**

Behavior files are executed as plain scripts in a shared context. ES module syntax is not supported and will cause a parse error.

```js
// ❌ WRONG — never do this
import EventBus from "/EventBus";
export default class PlayerJump { ... }

// ✅ CORRECT — plain this.method = function(){} assignments at the top level
this.init = function(game) { ... };
this.update = function(deltaTime) { ... };
```

**2. No class bodies — lifecycle methods are top-level `this.x = function(){}` assignments.**

There is no class, no constructor, no prototype. Every lifecycle method is assigned directly on `this`.

**3. EventBus is a global — never import it.**

`EventBus` is injected by the script factory and available as a global. Do not import it.

```js
// ❌ WRONG
import EventBus from "/EventBus";

// ✅ CORRECT — EventBus is already available as a global
this.update = function(deltaTime) {
  EventBus.instance.send("player:jumped", { source: this.target.name });
};
```

---

Behavior code must:
- use `this.method = function(){}` syntax for all lifecycle methods
- follow the runtime lifecycle: `init(_game)` -> `onStart()` -> `update(deltaTime)` / `fixedUpdate(fixedDeltaTime)` -> `onStop()` -> `dispose()`
- capture runtime handles via closure variables instead of assigning `this.game = game`
- use `this.target` only after `onStart()`
- use `this.erth` for assets, cross-behavior lookups, lambdas, camera helpers, scene helpers, and pooling
- include cleanup in `dispose()`
- avoid ES module imports
- avoid direct DOM listeners
- use only documented engine APIs

### Minimal template

```js
let game;
let erth;
let target;

this.init = function(_game) {
  game = _game;
  erth = this.erth;
};

this.onStart = function() {
  target = this.target;
};

this.update = function(deltaTime) {
  if (!target) return;
};

this.dispose = function() {
  target = null;
};
```

### Required patterns

- For cross-behavior lookup, prefer `this.erth.behaviors.find(target, id)` and `this.erth.behaviors.findAll(id)`
- For input, use documented `game.inputManager` members such as `getAction()`, `getMotion()`, and `getMouseTouchPosition()`
- For generated player-control games, add or configure `touchControls` unless the user explicitly chooses desktop-only.
- For object creation at runtime, prefer `await erth.scene.addObject(gameObject, parent)`
- For asset loading, use `await erth.asset.image.createTexture(...)`, `await erth.asset.model.createInstance(...)`, and related `findByName()` helpers
- For messages, use `game.behaviorManager.sendEventToObjectBehaviors(target, msg, data)` and receive them in `this.onEvent = function(msg, data) {}`
- For directions and movement, follow the Three.js right-handed convention: **+X right, +Y up, -Z forward**. A positive `motion("forward", ...)` reading must move the controlled object in `-Z` (or `(0, 0, -1)` rotated by its quaternion, for object-local forward). See `stemstudio-input-manager` for the canonical motion-axis rule and `~/.claude/stemstudio-docs/architecture.md` "Coordinate Convention".

### Forbidden patterns

- `this.game = game`
- `this.THREE` or `this.game.THREE`
- `EventBus.send(...)`
- `this.config.attributes`
- `this.findBehavior(...)` or `this.findBehaviors(...)`
- `init(game)` with shadowing assignment or `init()` with no `_game` parameter

## When To Read More

- Need lifecycle hooks, runtime context, `this.erth`, or attribute JSON shape: `~/.claude/stemstudio-docs/behavior-system.md`
- Need built-in pack names before creating custom code: `~/.claude/stemstudio-docs/behavior-catalog.md`
- Need gameplay architecture patterns: `~/.claude/stemstudio-docs/game-design-patterns.md`
- Need asset loading guidance: `~/.claude/stemstudio-docs/asset-loading-patterns.md`
- Need editor-safe preview callbacks: `~/.claude/stemstudio-docs/editor-preview-callbacks.md`
- Need performance guidance: `~/.claude/stemstudio-docs/performance-patterns.md`
- Need exact engine/type contracts: `~/.claude/stemstudio-types/stem-types.d.ts`
- Need exact event topic names: `~/.claude/stemstudio-types/stem-events-registry.json`

If you open an example from `examples/`, normalize it to the closure pattern and current validator rules before reusing it.

## Verification

Verify behavior work by checking:
- the behavior exists and has the expected schema
- the target object has the behavior attached
- attribute updates were applied
- returned `codeValidation` is clean enough for the change you are shipping
- required cleanup and event wiring are present

Typical verification commands:

```bash
python scripts/get_behavior.py --behaviorId "BEHAVIOR_ID"
python scripts/list_behaviors.py --filter "Rotate"
```

## Performance Optimization

- **Apply the best Three.js practices**
- **Reuse geometry & material** — create once, share across all meshes with the same appearance. Never allocate per-object duplicates.
- **Use `InstancedMesh`** for many identical objects (trees, bullets, coins). One draw call instead of hundreds.
- **Object pooling** — hide/show from a pool instead of creating/destroying meshes. Avoids GC and re-allocation.
- **Cache math objects** — allocate `Vector3`, `Quaternion`, `Matrix4`, `Raycaster` etc. once (e.g. in `onStart`), reuse in `update()`. Never `new` inside the frame loop.
- **`matrixAutoUpdate = false`** on static objects, then call `updateMatrix()` once.

## Common Mistakes

- using ES class syntax instead of `this.method = function(){}` assignments
- attaching to `GlobalBehaviorsHost` instead of the owning object
- writing custom code before checking built-ins
- forgetting to capture the returned `behaviorId`
- attaching by name instead of ID
- ignoring `codeValidation` feedback from create or update
- using legacy instance-assignment patterns from old examples without rewriting them
- skipping `dispose()` cleanup
- direct keyboard/document listeners in player controllers when InputManager/touchControls can cover the input
- shipping flight/vehicle controls without brake/reset/landing or touch equivalents

## See Also

- `stemstudio-game-engine` for engine and runtime APIs
- `stemstudio-eventbus` for inter-behavior communication
- `stemstudio-lambdas` for structured gameplay data
- `stemstudio-scripts` for shared `@import` helper modules consumed from behavior code
- `stemstudio-game-design` for mechanic and loop design
