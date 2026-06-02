# Built-in Behaviors

A **behavior** is a script attached to a single scene object. It gets a
lifecycle (init, start, per-frame update, dispose), a handle to the engine,
and a bag of per-instance attributes. If you have ever written a Unity
`MonoBehaviour` or a Unreal `Component`, this is the same idea.

StemStudio ships ~40 built-in behaviors so you rarely start from scratch:
character controllers, triggers, sound, joints, billboards, spawners, and
more. **Reuse a built-in before you author a custom one** — search the catalog
below first.

This doc covers: the model, how to attach one in the editor, the catalog of
built-ins, and how to author your own. For lambdas (the batched ECS layer) see
[`lambdas.md`](./lambdas.md); for reusable code modules see
[`import-packs.md`](./import-packs.md).

---

## The model

Built-in behaviors live in
`client/packages/editor-oss/src/behaviors/packs/<name>/`. Each pack is a
TypeScript class extending `BehaviorBase` plus a `behavior.json` declaring its
attributes and defaults.

- **Base class & lifecycle** — `src/behaviors/Behavior.ts`
- **Registry** — `src/behaviors/BehaviorTypeRegistry.ts` (maps an id like
  `"trigger"` to its constructor)
- **Manager** — `src/behaviors/BehaviorManager.ts` (creates, attaches, hydrates
  configs, drives the update loop)
- **Scene shape** — `src/behaviors/BehaviorData.ts`

Saved scenes store only the behavior **id** and the **per-instance attribute
overrides**, in `object.userData.behaviors`. Full defaults rehydrate from the
in-process registry on load, so built-in upgrades flow into existing projects.

```jsonc
// object.userData.behaviors — one entry per attached behavior
{
  "id": "genericSound",      // looked up in BehaviorTypeRegistry
  "uuid": "…",               // unique per instance
  "enabled": true,
  "priority": 0,
  "attributesData": {        // overrides merged onto registry defaults
    "looping": true,
    "volume": 0.6
  }
}
```

### Lifecycle hooks

Override only the hooks you need. They are defined on the `Behavior` interface
in `Behavior.ts`.

| Hook | When it fires |
|---|---|
| `init(game)` | Once at instantiation. Async-friendly. Target not yet attached. |
| `onStart()` | When attached to the object (target available). Prefer over the deprecated `onAdded()`. |
| `update(deltaTime)` | Every frame in play mode. |
| `fixedUpdate(dt)` | Fixed timestep, for physics-coupled logic. |
| `onAttributesUpdated()` | An attribute changed (e.g. the user edited a field). |
| `onPaused()` / `onResumed()` / `onReset()` | Pause / resume / game reset. |
| `onEvent(msg, data)` | A custom event was delivered to this behavior. |
| `onStateUpdated(key, value)` | Multiplayer state in `GameManager.storage` changed. |
| `onStop()` / `dispose()` | Removed / destroyed. Dispose Three.js resources here. |

**Editor-mode hooks** run in the editor where `init(game)` is *never* called:
`onEditorAdded(editor)`, `onEditorUpdate()`, `onEditorAttributesUpdated()`,
`onEditorButtonClicked(action)`.

> **Common bug.** Do not cache `const erth = this.stem` only inside `init()` and
> then use that local from an editor hook — `init()` did not run there, so the
> local is `undefined`. Always read `this.stem` / `this.gameObject` directly at
> the top of each entry point. There is no `gameObject.game`; in the editor
> `game` is typically `undefined`, so guard any `game.renderer.*` access.

### Reaching the engine

From inside a behavior:

- `this.stem` — the engine API (`this.stem.asset`, `this.stem.physics`,
  `this.stem.scene`, `this.stem.ai`, …). This is the current name.
  `this.erth` and `this.stemEngine` are **deprecated aliases** that still work,
  so you will see `this.erth` in older built-ins.
- `this.gameObject` — the wrapper around the attached object. Exposes
  `uuid`/`position`/`rotation`/`scale`/`visible`/`physics`/`_internal.three`.
- `this.target` — the raw `THREE.Object3D` (deprecated in favor of
  `this.gameObject`).
- `this.getAttribute(key)` — read a per-instance attribute.

---

## Attaching a built-in behavior (step by step)

1. **Select an object** in the scene tree (e.g. a coin mesh).
2. Open the **right-hand properties panel** and find the **Behaviors** section.
3. Click **Add Behavior** and pick one from the searchable list — e.g.
   `genericSound`.
4. **Configure its attributes** inline. For `genericSound` that's the audio
   asset, `looping`, `volume`, `positional`, `autoPlay`. Edits fire
   `onAttributesUpdated()` live.
5. **Press Play.** The behavior's `init` → `onStart` → `update` loop runs. For
   `genericSound`, the clip loads and (if `autoPlay`) plays.
6. **Save.** Only the id + your overrides are written to
   `object.userData.behaviors`; everything else rehydrates from the registry.

To remove one, use the **×** next to it in the Behaviors section. To toggle it
without removing, flip its `enabled` checkbox.

> Some behaviors seed object-level state on attach. The `character` behavior,
> for instance, declares a default physics capsule. If your object sets physics
> explicitly (e.g. `enabled: false` on a ship), that explicit setting is
> respected — the behavior default only seeds objects that have *no* explicit
> physics. Keep that in mind when stacking controllers.

---

## The catalog

All under `src/behaviors/packs/`. Pick the closest match before writing custom
code.

### Movement & control
| Behavior | What it does |
|---|---|
| `character` | Player controller: walk/run, jump, climb. Seeds a capsule body. |
| `npc` / `aiNpc` | Non-player character; `aiNpc` adds navmesh pathfinding. |
| `enemy` | AI adversary. |
| `follow` | Track a target (camera, parent, player). |
| `platform` | Moving / patrolling platform. |
| `touchControls` | Mobile on-screen joystick, buttons, steering wheel. |
| `cinematicCamera` | Scripted camera moves. |

### Interaction & events
| Behavior | What it does |
|---|---|
| `trigger` | The workhorse event system: fire actions on collision, input, timer, distance, line-of-sight, metadata, … |
| `objectInteractions` | Pick up / use / interact with objects. |
| `consumable` | Health / ammo / buff pickups. |
| `shop` | NPC shop interaction. |
| `teleport` | Warp between locations. |
| `jumppad` | Velocity boost on contact. |
| `destructible` | Breakable objects. |
| `enableDisable` | Enable/disable other objects. |

### Spawning & world
| Behavior | What it does |
|---|---|
| `spawnpoint` | Marks a player spawn location. |
| `randomizedSpawner` | Spawns objects on a timer/condition. |
| `projectile` | Fired projectile. |
| `dayNightCycle` | Animated lighting / time of day. |
| `terrain` | Terrain mesh handling. |
| `navmesh` / `navmesh-connection` | Navigation mesh and links between regions. |
| `cesium` | CesiumJS geographic data. |

### Audio, graphics & FX
| Behavior | What it does |
|---|---|
| `genericSound` | Play an audio clip, positional or 2D, looping or one-shot. |
| `animation` | Play/stop skeletal or object animations; trigger via event. |
| `tween` | Interpolate properties over time. |
| `visualEffect` | Particles / VFX. |
| `postFx` | Post-processing effects. |
| `skybox` | Environment skybox. |
| `billboard` / `image_billboard` / `video_billboard` | Face-camera quads for sprites / images / video. |
| `csm` | Cascaded shadow mapping. |

### Physics joints
| Behavior | What it does |
|---|---|
| `jointFixed` | Rigid constraint between two bodies. |
| `jointHinge` | Revolute joint (doors, wheels). |
| `jointPoint2Point` | Ball-and-socket joint. |

(`testBehavior`, `testAttributesBehavior`, `spawn`, `volume` are dev/legacy
helpers.)

---

## Authoring a custom behavior

When no built-in fits, write your own. Use `genericSound` as the reference for
the shape — load in `init`, apply config in `onStart`/`onAttributesUpdated`,
release in `onStop`.

### 1. The shape

```ts
import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

class SpinBehavior extends BehaviorBase {
    private speed = 1;

    // Read attributes here; works in both editor and play paths.
    private applyConfig() {
        this.speed = Number(this.getAttribute("speed") ?? 1);
    }

    init(_game: GameManager) {
        this.applyConfig();
    }

    onStart() {
        this.applyConfig();
    }

    onAttributesUpdated() {
        this.applyConfig();          // react to live edits in the editor
    }

    update(deltaTime: number) {
        // gameObject is always valid; do NOT assume init() ran.
        this.gameObject.rotation.y += this.speed * deltaTime;
    }

    dispose() {
        // Release any geometries/materials/textures/listeners you created.
    }
}

export default SpinBehavior;
```

> Read engine handles from `this.stem` / `this.gameObject` directly inside each
> hook. Re-deriving config in `onStart` *and* `onAttributesUpdated` (here via
> `applyConfig`) keeps editor edits and play mode in sync.

### 2. Declare attributes

A `behavior.json` next to the class declares the editor-editable fields and
their defaults. These become the controls in the properties panel and the
fallback values when a saved scene omits an override.

```jsonc
{
  "id": "spin",
  "name": "Spin",
  "attributes": {
    "speed": { "name": "Speed (rad/s)", "type": "number", "default": 1, "min": 0, "max": 10 }
  }
}
```

### 3. In-editor authoring

The editor's **Behavior Creator** (Assets panel → new behavior) scaffolds a
behavior + its attribute schema and saves it as a project asset, so you don't
have to touch the repo for game-specific logic. Built-in packs (the table
above) are the ones that live in-tree and ship with the engine.

---

## Verification

Behavior changes are exercised by the OSS smokes (they save → reload → play and
import a real game):

```bash
bun run typecheck
bun run test          # Vitest — NOT `bun test`
node scripts/playwright/oss-smoke.mjs           # needs `bun run dev` on :5173
node scripts/playwright/oss-import-3dchess.mjs
```

Re-run the smokes if you touch behavior attach/hydrate, the registry, or the
manager update loop.
