---
title: "Erth Interface API Reference"
slug: erth-interface
description: "Current reference for the behavior-facing `this.erth` runtime API: assets, camera, scene, store, behaviors, lambdas, combat, teams, pooling, and AI."
status: draft
audience: technical-creators
prerequisites: [scripting/01-behaviors-vs-lambdas]
---

# Erth Interface API Reference

`this.erth` is the main runtime API exposed to **behaviors**.

If you are writing a behavior, this is the surface you should reach for before dropping down to lower-level `this.game` access.

## What This Page Is For

Use this page when you need to:

- look up what namespaces exist on `this.erth`
- load assets or spawn content at runtime
- query behaviors or lambdas
- use the global store
- access combat, team, or pooling helpers

## Top-Level Namespaces

```ts
interface ErthInterface {
    ai: ErthAI;
    asset: ErthAsset;
    camera: ErthCamera;
    object: ErthObject;
    scene: ErthScene;
    store: ErthStore;
    combat: ErthCombat;
    team: ErthTeam;
    pool: ErthPool;
    lambdas: ErthLambdas;
    behaviors: ErthBehaviors;
    tween: ErthTween;               // engine-ticked tween animations
    fsm: ErthFsm;                   // finite state machines (XState v5)
    behaviorTree: ErthBehaviorTree; // NPC AI (mistreevous)
    spatial: ErthSpatial;           // octree collision queries
}
```

### Lazy-loaded namespaces

`tween`, `fsm`, `behaviorTree`, and `spatial` wrap third-party libraries that are **dynamically imported on first use** so the engine bundle stays small — behaviors that don't reach for them pay zero in download size. Each exposes an async creator:

- `await this.erth.tween.to(target, options)` → `TweenHandle`
- `await this.erth.fsm.create(machineConfig)` → `FsmActor`
- `await this.erth.behaviorTree.create(definition, agent)` → `BTHandle`
- `await this.erth.spatial.octree()` → `OctreeHandle`

The Promise resolves once the library chunk has loaded; subsequent calls resolve on a microtask. Methods on the returned handles are sync. Pattern: `await` once inside `init(_game)`, then use the handle freely from `update()`.

## Quick Reference

| Namespace | Use it for | Loaded |
|-----------|------------|--------|
| `erth.ai` | AI model generation | eager |
| `erth.asset` | loading models, textures, audio, video, stems, and file URLs | eager |
| `erth.camera` | reading or adjusting the active camera | eager |
| `erth.object` | wrapping a raw `Object3D` as a `GameObject` | eager |
| `erth.scene` | adding a `GameObject` to the scene | eager |
| `erth.store` | shared runtime key-value state | eager |
| `erth.combat` | damage and combat utility helpers | eager |
| `erth.team` | friendly/enemy checks and team queries | eager |
| `erth.pool` | reusable object pooling | eager |
| `erth.lambdas` | querying and registering lambda instances | eager |
| `erth.behaviors` | querying behaviors and requesting attribute changes | eager |
| `erth.tween` | engine-ticked tween animations (Tween.js) | **lazy** |
| `erth.fsm` | finite state machines (XState v5) | **lazy** |
| `erth.behaviorTree` | NPC AI behavior trees (mistreevous) | **lazy** |
| `erth.spatial` | spatial collision queries (THREE.Octree) | **lazy** |

## `erth.ai`

AI generation currently exposes 3D model generation:

```ts
erth.ai.gen.generate3dModel(params): Promise<{
    taskId: string;
    modelUrl: string;
    thumbnailUrl?: string;
}>
```

Use this when you want runtime access to the same model-generation services the editor uses.

## `erth.asset`

The asset namespace is broader than older docs imply. It is not just models and images.

### Top-Level Methods

```ts
erth.asset.createAssetRelease(...)
erth.asset.getAssetDerivatives(...)
erth.asset.getMyAssets(...)
```

### Asset Sub-Namespaces

| Namespace | Key methods |
|-----------|-------------|
| `asset.model` | `createFromUrl`, `preload`, `createInstance`, `unload`, `findByName` |
| `asset.image` | `createTexture`, `findByName`, `getUrl` |
| `asset.audio` | `getUrl`, `getUrlByName`, `findByName` |
| `asset.video` | `getUrl`, `getUrlByName`, `findByName` |
| `asset.file` | `getUrl`, `getUrlByName`, `findByName` |
| `asset.stem` | `preload`, `createInstance`, `unload`, `findByName` |

### Example: Spawn A Model Asset

```ts
const enemy = await this.erth.asset.model.createInstance(this.getAttribute("enemyModel"));
enemy.position.set(0, 1, 0);
await this.erth.scene.addObject(enemy);
```

### Example: Load A Texture

```ts
const texture = await this.erth.asset.image.createTexture(this.getAttribute("portrait"));
this.target.material.map = texture;
this.target.material.needsUpdate = true;
```

### Example: Get A Signed URL For Audio Or File Data

```ts
const sfxUrl = await this.erth.asset.audio.getUrlByName("coin");
const jsonUrl = await this.erth.asset.file.getUrlByName("enemy-table.json");
```

## `erth.camera`

`erth.camera` exposes the active runtime camera:

```ts
erth.camera.position
erth.camera.quaternion
erth.camera.fov
erth.camera.near
erth.camera.far
erth.camera.lookAt(x, y, z)
```

Use it for lightweight read/write camera control from behaviors.

## `erth.object` And `erth.scene`

Use these together when you are creating a new object from raw Three.js code.

```ts
const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({color: 0xff5533}),
);

const box = this.erth.object.createFromThreeObject(mesh);
box.position.set(0, 2, 0);
await this.erth.scene.addObject(box);
```

`erth.object.createFromThreeObject` wraps an `Object3D` as a `GameObject`, and `erth.scene.addObject` adds that `GameObject` into the running scene.

## `erth.store`

The global store is shared runtime state for behaviors.

```ts
erth.store.get(key)
erth.store.set(key, value)
erth.store.has(key)
erth.store.delete(key)
erth.store.keys()
erth.store.size
```

Notes:

- the store is reset when the game starts
- it has a hard limit of 128 keys
- it is best for lightweight shared gameplay state, not large datasets

### Example

```ts
const current = this.erth.store.get<number>("score") ?? 0;
this.erth.store.set("score", current + 10);
```

## `erth.behaviors`

Use this namespace for safe cross-behavior queries and attribute changes.

```ts
erth.behaviors.find(target, id)
erth.behaviors.findAll(id)
erth.behaviors.findOnObject(target)
erth.behaviors.getAttribute(behavior, key)
erth.behaviors.requestChange(behavior, key, value, options?)
```

### Example

```ts
const healthBar = this.erth.behaviors.find(this.target, "healthBar");
if (healthBar) {
    await this.erth.behaviors.requestChange(healthBar, "value", 75);
}
```

## `erth.lambdas`

Use this namespace when behaviors need to work with shared lambda systems.

```ts
erth.lambdas.getInstance(instanceId)
erth.lambdas.getInstancesByType(lambdaId)
erth.lambdas.registerObject(instanceId, target, componentData?)
erth.lambdas.deregisterObject(instanceId, target)
erth.lambdas.getObjectLambdas(target)
```

### Example

```ts
const velocity = this.erth.lambdas.getInstancesByType("velocity")[0];

if (velocity) {
    this.erth.lambdas.registerObject(velocity.uuid, this.target, {
        vx: 0,
        vy: 0,
        vz: 4,
    });
}
```

## `erth.combat`

Combat helpers provide reusable utility functions rather than scene mutation on their own.

```ts
erth.combat.calculateDamage(attacker, target)
erth.combat.applyDamage(target, damage)
erth.combat.regenerateHealth(unit, deltaTime)
erth.combat.getAttackPriority(unit)
erth.combat.selectBestTarget(attackerPos, targets)
erth.combat.getDamageEffectiveness(damageType, armorType)
```

Use these when you want consistent damage logic across multiple behaviors.

## `erth.team`

Team helpers answer friendly/enemy questions:

```ts
erth.team.isEnemy(a, b)
erth.team.isFriendly(a, b)
erth.team.canAttack(attacker, target, friendlyFire?)
erth.team.findNearestEnemy(unit, allUnits, maxRange?)
erth.team.getEnemiesInRange(unit, allUnits, range)
```

## `erth.pool`

Use pooling when you want to reuse runtime objects such as bullets, VFX helpers, or temporary props.

```ts
const pool = this.erth.pool.create({
    create: () => new THREE.Object3D(),
    reset: obj => {
        obj.visible = true;
    },
    destroy: obj => {
        obj.parent?.remove(obj);
    },
    initialSize: 10,
    maxSize: 100,
});
```

## `erth.tween`

Animate numeric properties without each behavior bundling a tween library or calling `TWEEN.update()` itself. The engine ticks a single per-game group from the scheduler before behavior `update()` runs, so values you read inside `update(dt)` reflect the current frame.

**Time inputs are in SECONDS** to match `update(deltaTime)`. `0.6` means 600 ms.

```ts
this.init = async function (game) {
    this._popIn = await this.erth.tween.to(this.gameObject._internal.three.position, {
        y: 5,
        duration: 0.6,
        easing: "Cubic.InOut",
        autoStart: true,
    });
    this._popIn.onComplete(() => console.log("done"));
};

this.dispose = function () {
    if (this._popIn) this._popIn.stop();
};
```

Easing names follow `Family.Variant`: `"Linear.None"`, `"Cubic.InOut"`, `"Sinusoidal.InOut"`, `"Elastic.Out"`, `"Bounce.In"`, etc.

V1 has no per-behavior auto-cancel — call `handle.stop()` for specific tweens in `dispose()`, or `this.erth.tween.killAll()` to clear everything (e.g. on scene swap).

## `erth.fsm`

Author finite state machines (flat, hierarchical, or parallel) without depending on XState directly. The wrapper façade lets the engine swap implementations without breaking your code.

```ts
this.init = async function (game) {
    this._door = (await this.erth.fsm.create({
        id: "door",
        initial: "closed",
        context: {locked: false},
        states: {
            closed: { on: { OPEN: { target: "open", guard: ({context}) => !context.locked } } },
            open:   { on: { CLOSE: "closed" } },
        },
    })).start();

    this._unsub = this._door.subscribe(snap => {
        // snap.value, snap.context, snap.done
    });
};

this.update = function () {
    if (this._door && this._door.matches("closed") && game.inputManager.getAction("interact")) {
        this._door.send("OPEN");
    }
};

this.dispose = function () {
    if (this._unsub) this._unsub();
    if (this._door) this._door.stop();
};
```

`subscribe(fn)` fires immediately with the current snapshot, then on every transition. Always unsubscribe + `stop()` in `dispose()`.

## `erth.behaviorTree`

Author NPC AI as a tree of action / condition / sequence / selector nodes evaluated each step. Action and condition functions resolve by NAME against the agent object — no `eval`, SES-clean.

Actions return `"SUCCEEDED"`, `"FAILED"`, or `"RUNNING"`. Conditions return booleans.

```ts
this.init = async function (game) {
    const agent = {
        isHostileVisible: () => this.erth.behaviors.findAll("enemy.tag").length > 0,
        attack: () => "SUCCEEDED",
        patrol: () => "RUNNING",
    };
    this._tree = await this.erth.behaviorTree.create({
        type: "selector",
        children: [
            {type: "sequence", children: [
                {type: "condition", call: "isHostileVisible"},
                {type: "action", call: "attack"},
            ]},
            {type: "action", call: "patrol"},
        ],
    }, agent);
};

this.update = function () {
    if (this._tree) this._tree.step();
};
```

## `erth.spatial`

Fast collision queries against world geometry. Build the octree from a Three.js Group once, then query with capsules (player colliders), spheres (projectiles, triggers), or rays (line of sight, hitscan).

```ts
this.init = async function (game) {
    const levelRoot = game.scene.getObjectByName("Level");
    this._octree = (await this.erth.spatial.octree()).fromGroup(levelRoot);

    // Reuse query primitives every frame — no hot-path allocation.
    this._cap = new THREE.Capsule(
        new THREE.Vector3(0, 0.4, 0),
        new THREE.Vector3(0, 1.6, 0),
        0.4,
    );
};

this.update = function () {
    if (!this._octree) return;
    const hit = this._octree.intersectCapsule(this._cap);
    if (hit) playerPos.addScaledVector(hit.normal, hit.depth);
};
```

`fromGroup` walks every Mesh descendant — pay once at init, not every frame. Today scoped to collision queries against scene geometry; dynamic per-entity AABB queries are a future addition.

## `GameObject` Reminder

Many `erth` APIs return a `GameObject`, not a raw `Object3D`.

A `GameObject` exposes:

- `uuid`
- `position`
- `rotation`
- `scale`
- `visible`
- `physics`

Read [GameObject API](05-gameobject-api.md) for the full physics wrapper and body controls.

## When To Use `this.game` Instead

Prefer `this.erth` first.

Drop down to `this.game` only when you need lower-level systems such as:

- animation controller access
- raw audio control
- behavior manager internals
- debug or engine-level operations

Read [Game Manager](04-game-manager.md) for those advanced cases.

## Next Steps

- Read [Global Store](03-global-store.md) for shared state patterns.
- Read [GameObject API](05-gameobject-api.md) for physics and runtime object configuration.
- Read [Behaviors vs Lambdas](../scripting/01-behaviors-vs-lambdas.md) if you are deciding where logic should live.
