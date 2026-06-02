# Lambdas (the ECS layer)

A **lambda** is a system that runs the same logic over *many* objects every
frame, driven by per-object **component data** rather than per-object scripts.
It is the ECS-style ("entity-component-system") layer that sits on top of
behaviors. Where a [behavior](./built-in-behaviors.md) is one script bound to
one object, a lambda is one system that processes a whole archetype of objects
in a tight, cache-friendly loop.

Reach for a lambda when you have **lots of objects doing the same cheap thing**
— gravity on every projectile, rotation on every fan blade, velocity
integration on a swarm — and you want it batched, throttled, and
dependency-ordered. Reach for a behavior when the logic is **bound to one
object's identity** (a boss state machine, a door, the player controller).

Lambda code lives in `client/packages/editor-oss/src/lambdas/`. Built-in
lambdas are under `src/lambdas/packs/`.

---

## Behavior vs. lambda — which one?

| | Behavior | Lambda |
|---|---|---|
| Granularity | One instance per object | One system over many objects |
| Data | `this.attributes` (per instance) | component data per object + shared instance attributes |
| Best for | identity-bound logic, events, state machines | bulk per-frame work (movement, physics, transforms) |
| Scheduling | manager update loop | dependency-ordered **waves**, with throttling/culling |
| Authoring | Behavior Creator | Lambda Creator |

They compose: a behavior can register objects with a lambda, and a lambda
(`setBehaviorEnabled`) can flip behaviors.

---

## How a lambda is wired

Each pack has a class plus a `lambda.json` manifest. The manifest is what makes
the system data-driven and schedulable:

```jsonc
// src/lambdas/packs/gravity/lambda.json
{
  "id": "gravity",
  "name": "Gravity Lambda",
  "main": "GravityLambda.ts",
  "attributes": {                       // shared across all registered objects
    "gravityStrength": { "type": "number", "default": 9.81, "min": 0, "max": 100 }
  },
  "componentSchema": {                  // per-object data fields
    "mass":       { "type": "number",  "default": 1 },
    "drag":       { "type": "number",  "default": 0.1 },
    "useGravity": { "type": "boolean", "default": true }
  },
  "readComponents":  ["mass", "drag", "useGravity"],
  "writeComponents": []
}
```

- **`componentSchema`** — the per-object fields. Every object you attach the
  lambda to gets its own copy (its "component data"), stored in
  `object.userData.lambdaComponents[]`.
- **`attributes`** — instance-level config shared by every object the lambda
  drives.
- **`readComponents` / `writeComponents`** — the scheduler's dependency
  declaration. If lambda A *writes* `vx` and lambda B *reads* `vx`, the
  scheduler runs A before B. Lambdas with no write→read conflict run in the
  same **wave** and may execute in parallel. Omit these and everything runs
  serially (conservative fallback).

The archetype query (`src/lambdas/LambdaQueryRegistry.ts`) keeps a bitmask per
object so "all objects with [velocity AND gravity]" is an O(1) lookup. Waves
are built in `LambdaManager.buildWaves()` and run by `LambdaScheduler`.

> **Never call a lambda's `apply()`/`update()` directly.** That bypasses wave
> ordering and throttling. The scheduler owns the loop. (The one exception is a
> lambda component with **Auto Apply off**, which is explicitly meant to be
> triggered from your own code — see below.)

---

## The lambda API

Defined in `src/lambdas/LambdaBase.ts` (and `SoALambdaBase.ts` for the
structure-of-arrays fast path).

| Member | Purpose |
|---|---|
| `init(game)` | One-time setup. Store the `GameManager` reference. |
| `update(deltaTime)` | Per-frame logic. **Override this.** |
| `fixedUpdate(dt)` | Fixed-timestep variant for physics. |
| `onObjectAdded(target, componentData)` | An object registered with this lambda. |
| `onObjectRemoved(target)` | An object deregistered. |
| `dispose()` | Cleanup. |
| `this.registeredObjects` | `Map<Object3D, componentData>` of everything this lambda drives. |
| `this.processObjects(dt, cb, isCritical?)` | The iteration helper — use this in `update`. |
| `getComponentData(obj)` / `setComponentData(obj, key, value)` | Read/write per-object data. |

`processObjects` is the recommended way to iterate. It applies, per object,
**frustum culling** (off-screen objects throttle ~20×), **distance LOD** (far
objects throttle 4×/10×), and a **frame budget** (bails out if the frame is
running long), then syncs matrices/instanced meshes after your callback. The
`dt` passed to your callback is `deltaTime × throttleMultiplier` so time-based
math still catches up after skipped frames — use `dt`, not the outer
`deltaTime`, for movement.

### Example: the rotation lambda (the whole thing)

```ts
// src/lambdas/packs/rotation/RotationLambda.ts
import {MathUtils} from "three";
import {LambdaBase} from "../../LambdaBase";

const DEG2RAD = MathUtils.DEG2RAD;

export default class RotationLambda extends LambdaBase {
    update(_deltaTime: number = 0.016): void {
        // Rotation is absolute (not cumulative), so throttle compensation isn't needed.
        this.processObjects(_deltaTime, (object, data) => {
            if (data.useQuaternion) {
                object.quaternion.set(data.qx, data.qy, data.qz, data.qw);
            } else {
                object.rotation.set(
                    data.x * DEG2RAD,
                    data.y * DEG2RAD,
                    data.z * DEG2RAD,
                    data.order || "XYZ",
                );
            }
        });
    }
}
```

`data` here is exactly the `componentSchema` from that pack's `lambda.json`
(`x`, `y`, `z`, `useQuaternion`, `qx…qw`). Every registered object supplies its
own values.

### Example: the velocity lambda (SoA fast path)

For hot systems, extend `SoALambdaBase` and override `updateSoA`. Component
data is laid out as parallel typed arrays (structure-of-arrays) for cache
locality:

```ts
// src/lambdas/packs/velocity/VelocityLambda.ts
export default class VelocityLambda extends SoALambdaBase {
    constructor(id: string, options: LambdaOptions) {
        super(id, options, VELOCITY_SCHEMA);
    }

    protected updateSoA(deltaTime: number): void {
        const store = this.store;
        const vx = store.getField("vx") as Float32Array;
        // … vy, vz, damping, maxSpeed …
        for (let i = 0; i < store.count; i++) {
            const m = this._visibilityMask?.[i] ?? 1;   // scheduler throttle
            if (m === 0) continue;
            const dt = deltaTime * m;
            const obj = store.getObject(i);
            if (obj) {
                obj.position.x += vx[i]! * dt;           // integrate velocity
                // … y, z …
                obj.updateMatrix();
            }
        }
        this.syncSoAToMap(["vx", "vy", "vz"]);           // expose for other lambdas
    }
}
```

`velocity` declares `writeComponents: ["vx","vy","vz"]`; a downstream lambda
that reads those will automatically be scheduled into a later wave.

---

## The built-in lambdas

All under `src/lambdas/packs/`:

| Lambda | What it does |
|---|---|
| `position` | Set/drive object position. |
| `rotation` | Set absolute rotation (euler or quaternion). |
| `scale` | Set object scale. |
| `velocity` | Integrate velocity into position (SoA, clamps to max speed, damping). |
| `acceleration` | Apply acceleration to velocity. |
| `gravity` | Apply gravity using per-object mass/drag/`useGravity`. |
| `rigidbody` | Rigid body integration. |
| `fusedPhysics` | Combined physics pass. |
| `collider` | Collision data. |
| `setParent` | Reparent objects. |
| `setMaterial` | Swap material. |
| `setVariable` | Write a variable/state value. |
| `setBehaviorEnabled` | Enable/disable a behavior on the object. |
| `showObject` / `hideObject` | Toggle visibility. |
| `playSound` | Trigger audio. |
| `uiAction` | Drive a UI action. |
| `animationControl` | Drive animation playback. |
| `cooldownGate` / `debounce` | Rate-limit / gate other systems. |

---

## Using a lambda in the editor (step by step)

1. **Select an object** in the scene tree.
2. In the right panel open the **Lambda Components** tab.
3. Click **Add Lambda** and choose one — e.g. `gravity`.
4. **Fill in the component data** the schema asks for. For `gravity`: `mass`,
   `drag`, `useGravity`. (Instance attributes like `gravityStrength` are shared
   across all objects on that lambda.)
5. Choose **Auto Apply**:
   - **On** — the scheduler runs the lambda over this object every frame.
   - **Off** — the object is registered but idle; you call
     `lambdaInstance.apply(deltaTime)` from your own behavior/lambda code when
     you want it to run.
6. **Press Play.** The scheduler builds dependency waves and drives every
   auto-apply lambda. With `gravity` attached, the object falls (or floats, if
   `useGravity` is false) per its `mass`/`drag`.

Attaching writes a component entry into `object.userData.lambdaComponents[]`;
the manager registers the object with the lambda instance on load.

---

## Authoring custom lambdas

There are two authoring paths:

- **In the editor** — use this for project/game systems. The Lambda Creator
  saves the code, config JSON, documentation, and revisions as a project asset.
- **In engine source** — use this when you are adding a reusable built-in pack
  that should ship with the engine.

For most gameplay work, start in the editor.

### Create one in the editor: `OrbitLane`

1. Open the **Assets** sidebar.
2. Click the **New** menu and choose **New Lambda**.
3. Name it `OrbitLane`.
4. Open the code editor details/config panel for the lambda.
5. Paste this config:

```jsonc
{
  "id": "orbit-lane",
  "name": "Orbit Lane",
  "description": "Moves registered objects around configurable orbit centers.",
  "attributes": {
    "speed": {"name": "Speed", "type": "number", "default": 1.25, "min": 0},
    "heightScale": {"name": "Height Scale", "type": "number", "default": 1}
  },
  "componentSchema": {
    "centerX": {"name": "Center X", "type": "number", "default": 0},
    "centerY": {"name": "Center Y", "type": "number", "default": 0},
    "centerZ": {"name": "Center Z", "type": "number", "default": 0},
    "radius": {"name": "Radius", "type": "number", "default": 2, "min": 0},
    "phase": {"name": "Phase", "type": "number", "default": 0},
    "heightAmp": {"name": "Height Amplitude", "type": "number", "default": 0}
  },
  "readComponents": ["centerX", "centerY", "centerZ", "radius", "phase", "heightAmp"],
  "writeComponents": []
}
```

Paste this into the lambda code editor:

```js
function init(game) {
    this._game = game;
    this._time = 0;
}

function update(deltaTime) {
    this._time += deltaTime;

    const speed = Number(this.attributes.speed ?? 1.25);
    const heightScale = Number(this.attributes.heightScale ?? 1);

    this.processObjects(deltaTime, (object, data, dt) => {
        const angle = this._time * speed + Number(data.phase ?? 0);
        const radius = Number(data.radius ?? 2);
        const centerX = Number(data.centerX ?? 0);
        const centerY = Number(data.centerY ?? 0);
        const centerZ = Number(data.centerZ ?? 0);
        const heightAmp = Number(data.heightAmp ?? 0) * heightScale;

        object.position.x = centerX + Math.cos(angle) * radius;
        object.position.y = centerY + Math.sin(angle * 2) * heightAmp;
        object.position.z = centerZ + Math.sin(angle) * radius;
    });
}

function dispose() {
    this._game = null;
}
```

Then select every object that should orbit, open the **Lambda Components** tab
in the right panel, add `OrbitLane`, fill in per-object component values, leave
**Auto Apply** on, and press **Play**. One lambda instance now drives all
registered objects in a scheduler-aware pass.

Use instance **attributes** for values shared by the whole system (`speed`), and
`componentSchema` for values each object owns (`radius`, `phase`, `centerX`).
Use `readComponents` and `writeComponents` when lambdas exchange component
fields. If your lambda only changes the Three.js transform directly and no
other lambda reads a component field from it, `writeComponents` can stay empty.

### Worker-backed lambda: `FlockOffsets`

A lambda still runs on the main thread, because it owns Object3D mutation and
component writes. Move only pure computation into a worker: steering solves,
heatmaps, grid searches, offline scoring, or large array transforms. Workers
must receive plain data; do not send Three.js objects, DOM nodes, lambdas,
behaviors, or `GameManager`.

Create a lambda named `FlockOffsets` with this config:

```jsonc
{
  "id": "flock-offsets",
  "name": "Flock Offsets",
  "description": "Computes lightweight wandering offsets in a background worker.",
  "attributes": {
    "solveRate": {"name": "Solve Rate", "type": "number", "default": 8, "min": 1}
  },
  "componentSchema": {
    "homeX": {"name": "Home X", "type": "number", "default": 0},
    "homeZ": {"name": "Home Z", "type": "number", "default": 0},
    "wanderRadius": {"name": "Wander Radius", "type": "number", "default": 1.5, "min": 0},
    "seed": {"name": "Seed", "type": "number", "default": 1},
    "offsetX": {"name": "Offset X", "type": "number", "default": 0},
    "offsetZ": {"name": "Offset Z", "type": "number", "default": 0}
  },
  "readComponents": ["homeX", "homeZ", "wanderRadius", "seed", "offsetX", "offsetZ"],
  "writeComponents": ["offsetX", "offsetZ"]
}
```

Paste this code:

```js
function init() {
    const workerSource = `
        self.onmessage = function (event) {
            const message = event.data || {};
            if (message.type !== "solve") return;

            const time = Number(message.time || 0);
            const rows = Array.isArray(message.rows) ? message.rows : [];
            const offsets = rows.map((row) => {
                const seed = Number(row.seed || 0);
                const radius = Number(row.wanderRadius || 0);
                const angle = time * 0.9 + seed * 12.9898;
                return {
                    id: row.id,
                    x: Math.cos(angle) * radius,
                    z: Math.sin(angle * 0.73) * radius
                };
            });

            self.postMessage({type: "solved", offsets});
        };
    `;

    const blob = new window.Blob([workerSource], {type: "application/javascript"});
    this._workerUrl = window.URL.createObjectURL(blob);
    this._worker = new window.Worker(this._workerUrl);
    this._busy = false;
    this._time = 0;
    this._lastPost = 0;
    this._offsets = new Map();

    this._worker.onmessage = (event) => {
        const message = event.data || {};
        if (message.type !== "solved") return;

        this._busy = false;
        this._offsets.clear();
        for (const offset of message.offsets || []) {
            this._offsets.set(offset.id, offset);
        }
    };
}

function update(deltaTime) {
    this._time += deltaTime;
    const rows = [];

    this.processObjects(deltaTime, (object, data) => {
        const offset = this._offsets.get(object.uuid);
        if (offset) {
            this.setComponentData(object, "offsetX", offset.x);
            this.setComponentData(object, "offsetZ", offset.z);
            object.position.x = Number(data.homeX ?? 0) + offset.x;
            object.position.z = Number(data.homeZ ?? 0) + offset.z;
        }

        rows.push({
            id: object.uuid,
            seed: Number(data.seed ?? 1),
            wanderRadius: Number(data.wanderRadius ?? 1.5)
        });
    });

    const solveRate = Math.max(1, Number(this.attributes.solveRate ?? 8));
    if (!this._busy && rows.length > 0 && this._time - this._lastPost >= 1 / solveRate) {
        this._busy = true;
        this._lastPost = this._time;
        this._worker.postMessage({type: "solve", time: this._time, rows});
    }
}

function dispose() {
    this._worker?.terminate();
    if (this._workerUrl) window.URL.revokeObjectURL(this._workerUrl);
}
```

This pattern keeps the scheduler contract intact: the lambda still calls
`processObjects()`, component writes happen on the main thread, and the worker
only returns serializable results that can be applied on a later frame.

### Import, export, revisions, and managed files

Lambda assets are portable YAML documents with the same export envelope as
behaviors, but `meta.type` is `lambda`:

```yaml
meta:
  tool: StemStudio
  type: lambda
  exportVersion: 1
config:
  id: orbit-lane
  name: Orbit Lane
  componentSchema: {}
  readComponents: []
  writeComponents: []
code: |
  function update(deltaTime) {}
```

To import a lambda, open **Assets → Lambdas**, click the import/upload icon on
that row, and choose one or more `.yaml`/`.yml` lambda exports. The editor
parses `config` and `code`, checks for duplicate names, creates a lambda asset,
registers it with the local lambda registry, and updates the Lambda Components
picker immediately. When a current user handle is available, imported lambda IDs
are normalized so another author's ID does not collide with yours.

Full scene exports include lambda YAML files under `lambdas/`, plus a scene
binding file when object attachments need to be reconstructed outside the
editor. Use that bundle path when you need to move a scene and all of its
lambda/import dependencies together.

When you use a visual designer, AI generator, or other higher-level authoring
surface, let that surface manage the lambda file set. It owns the lambda config,
component schema, helper imports, and any generated files needed to keep the
visual model and code model synchronized. Edit the generated code directly only
when you are deliberately taking over maintenance.

In the OSS playground, lambda edits are latest-only: the local adapter keeps a
single effective version for each lambda asset. In a server-backed install,
each save creates an immutable asset revision; the history icon on lambda cards
opens revision history, lets you diff, switch, or roll back, and the selected
revision is pinned in the scene's asset resolution context.

### Lifecycle reference

The **Lambda Creator** template (`LambdaScriptTemplate.ts`) gives you the same
lifecycle hooks:

```js
// Available: this.registeredObjects, this.attributes, this._game,
//            this.requestAttributeChange(key, value, options?)

this.init = (game) => {
    // Once, when the instance is created. `game` is also this._game.
};

this.update = (deltaTime) => {
    // processObjects handles culling, distance LOD, frame budget, and matrix sync.
    // Use `dt` (not deltaTime) for time-based math — it compensates for skipped frames.
    this.processObjects(deltaTime, (object, data, dt) => {
        // object: THREE.Object3D   data: your componentSchema   dt: throttle-adjusted
    });
};

this.onObjectAdded = (target, componentData) => {};   // object registered
this.onObjectRemoved = (target) => {};                // object deregistered
this.dispose = () => {};
```

Define `componentSchema`, `attributes`, and `readComponents`/`writeComponents`
in the manifest so the scheduler can place your lambda in the right wave. If
your lambda *writes* fields another lambda *reads*, declaring them is what
guarantees correct ordering — don't skip it for systems that feed each other.

---

## Verification

```bash
bun run typecheck
bun run test          # Vitest — NOT `bun test`
```

The scheduler drives lambdas every frame; if you change wave-building,
component registration, or `processObjects`, run the OSS play smokes too
(`node scripts/playwright/oss-smoke.mjs` with `bun run dev` on :5173) since
they exercise the live update loop.
