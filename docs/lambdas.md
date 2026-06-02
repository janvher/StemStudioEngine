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

## Authoring a custom lambda

The **Lambda Creator** (Assets panel → new lambda) scaffolds a script + a
manifest. The template (`LambdaScriptTemplate.ts`) gives you the lifecycle
hooks to fill in:

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
