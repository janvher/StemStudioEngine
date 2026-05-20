---
name: stemstudio-javascript-mastery
description: JavaScript design patterns for writing quality StemStudio behavior code. Use when the user asks about best JS patterns for behaviors, needs help with closures, async/await in init(), WeakRef for cross-behavior references, state machines, or structuring complex behavior logic. Covers the most useful JS concepts for the StemStudio behavior runtime.
---

# JavaScript Patterns for StemStudio Behaviors

JavaScript design patterns relevant to writing quality behavior code in StemStudio. Behaviors run in a sandboxed runtime — no ES modules, no DOM APIs. Understanding these patterns helps write efficient, clean, and leak-free behavior code.

## StemStudio Context

- **No ES modules** — Behaviors use globals only (`THREE`, `EventBus`, `UIKit`, etc.)
- **No DOM APIs** — No `document.addEventListener`, `window.location`, `localStorage`
- **Event loop matters** — Async operations in `init()` and `onStart()` use Promises
- **Memory management matters** — Behaviors must clean up in `dispose()` to avoid leaks
- **`this` context** — Behavior methods use `this` to access `target`, `attributes`, and `erth`; capture `game` in `init(_game)` via closure

## Pattern Decision Guide

| Behavior Need | JavaScript Pattern | Why |
|--------------|-------------------|-----|
| Remember state between frames | Closures + `this` properties | Persist data across `update()` calls |
| Multiple operation modes | State machine (switch/object map) | Clean transitions, predictable behavior |
| Expensive computation caching | Memoization | Avoid recalculating in `update()` |
| Cross-behavior references | WeakRef | Avoid memory leaks when referenced object is destroyed |
| Timed sequences | Async/await in `onStart()` | Clean sequential async without callback nesting |
| Observable config changes | Proxy on attributes | React to attribute changes automatically |
| Batch operations on children | Array methods (map, filter, reduce) | Process child objects declaratively |
| Resource cleanup | Dispose pattern (Set/Array tracking) | Track all allocations for `dispose()` |

## Closures — Data Privacy in Behaviors

Use closures to create private state that persists across frames:

```javascript
this.onStart = function () {
    // Private state via closure — not accessible from outside
    let hitCount = 0;
    const maxHits = this.attributes.maxHits || 3;

    this.registerHit = function () {
        hitCount++;
        if (hitCount >= maxHits) {
            EventBus.publish('object.destroyed', { uuid: this.target.uuid });
        }
        return hitCount;
    };

    this.getHitCount = function () {
        return hitCount;
    };
};
```

## Async/Await — Loading and Init Sequences

The `init()` and `onStart()` lifecycle methods support async. Use for sequential operations:

```javascript
let game;

this.init = async function (_game) {
    game = _game;

    // Load resources sequentially
    this.config = await this.loadConfig();
    this.spawnPoints = await this.calculateSpawnPoints();
};

this.onStart = async function () {
    // Wait for dependent data
    for (const point of this.spawnPoints) {
        await this.spawnEnemy(point);
        // Small delay between spawns for visual effect
        await new Promise(r => setTimeout(r, 100));
    }
};
```

**Important:** Never await in `update()` — it runs every frame and must be synchronous.

## WeakRef — Cross-Behavior References Without Leaks

When one behavior needs a reference to another object that might be destroyed:

```javascript
let game;

this.init = function (_game) {
    game = _game;
};

this.onStart = function () {
    // Find the player and hold a weak reference
    const player = game.player;
    this._playerRef = player ? new WeakRef(player) : null;
};

this.update = function (deltaTime) {
    // Dereference safely — returns undefined if player was garbage collected
    const player = this._playerRef?.deref();
    if (!player) return; // Player gone, nothing to do

    const dist = this.target.position.distanceTo(player.position);
    if (dist < this.attributes.detectRange) {
        this.chase(player, deltaTime);
    }
};
```

## State Machine — Behavior Modes

Clean pattern for behaviors with distinct modes (idle, active, cooldown):

```javascript
this.onStart = function () {
    this.states = {
        idle: {
            enter: () => { /* reset animations */ },
            update: (dt) => {
                if (this.detectPlayer()) this.changeState('active');
            },
        },
        active: {
            enter: () => { /* start active animation */ },
            update: (dt) => {
                this.pursue(dt);
                if (this.reachedTarget()) this.changeState('cooldown');
            },
        },
        cooldown: {
            enter: () => { this._cooldownTimer = 0; },
            update: (dt) => {
                this._cooldownTimer += dt;
                if (this._cooldownTimer > 2.0) this.changeState('idle');
            },
        },
    };
    this.currentState = 'idle';
    this.states.idle.enter();
};

this.changeState = function (name) {
    this.currentState = name;
    this.states[name].enter();
};

this.update = function (deltaTime) {
    this.states[this.currentState].update(deltaTime);
};
```

## Memoization — Cache Expensive Computations

Avoid recalculating expensive values every frame:

```javascript
this.onStart = function () {
    this._cachedPath = null;
    this._pathDirtyFlag = true;
};

this.getPath = function () {
    if (!this._pathDirtyFlag && this._cachedPath) return this._cachedPath;
    // Expensive computation
    this._cachedPath = this.calculatePathfinding(
        this.target.position, this.attributes.destination
    );
    this._pathDirtyFlag = false;
    return this._cachedPath;
};

this.onEvent = function (msg, data) {
    if (msg === 'waypoint.reached') {
        this._pathDirtyFlag = true; // Invalidate cache
    }
};
```

## Array Methods — Processing Collections

Use declarative array methods for operating on child objects, spawn lists, etc.:

```javascript
this.onStart = function () {
    // Get all enemy behaviors in scene
    const enemies = this.erth.behaviors.findAll('enemy');

    // Filter to alive enemies within range
    const nearbyAlive = enemies
        .filter(e => e.target && e.target.visible)
        .filter(e => e.target.position.distanceTo(this.target.position) < 20);

    // Get closest
    const closest = nearbyAlive.reduce((best, e) => {
        const dist = e.target.position.distanceTo(this.target.position);
        return dist < best.dist ? { enemy: e, dist } : best;
    }, { enemy: null, dist: Infinity });

    if (closest.enemy) this.focusTarget = closest.enemy.target;
};
```

## Dispose Pattern — Resource Tracking

Track all allocations to ensure clean disposal:

```javascript
this.onStart = function () {
    this._disposables = new Set();
    this._timers = new Set();
};

this.createTrackedMesh = function (geo, mat) {
    const mesh = new THREE.Mesh(geo, mat);
    this._disposables.add(geo);
    this._disposables.add(mat);
    this._disposables.add(mesh);
    return mesh;
};

this.setTrackedTimeout = function (fn, delay) {
    const id = setTimeout(fn, delay);
    this._timers.add(id);
    return id;
};

this.dispose = function () {
    // Clear all timers
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();

    // Dispose all Three.js objects
    for (const obj of this._disposables) {
        if (obj.dispose) obj.dispose();
        if (obj.parent) obj.parent.remove(obj);
    }
    this._disposables.clear();
};
```

## Event Loop — Why It Matters for Behaviors

Understanding the event loop helps debug async behavior:

```javascript
// Synchronous code runs immediately in the current frame
this.update = function (deltaTime) {
    // This all runs in ONE frame — fast
    this.target.position.y += deltaTime;
};

// Async code defers to future frames
this.onStart = async function () {
    console.log('1 - Start loading');
    const model = await this.loadModel(); // Pauses here, resumes next microtask
    console.log('2 - Model loaded');       // Runs after load completes (future frame)
    this.target.add(model);
};

// setTimeout defers to a future macrotask
this.triggerDelayed = function () {
    this._timer = setTimeout(() => {
        // This runs in a future frame — MUST check if still valid
        if (!this.target) return; // Behavior might be disposed by now
        EventBus.publish('delayed.action', {});
    }, 1000);
};
```

**Key rule:** Always guard `this.target` in deferred callbacks — the behavior may be disposed before the callback runs.

## Prototype Chain — Why `this` Matters

In StemStudio behaviors, `this` refers to the behavior instance:

```javascript
let game;

this.init = function (_game) {
    game = _game;
};

// Correct: this.target, this.attributes, game, this.erth
this.update = function (deltaTime) {
    const speed = this.attributes.speed || 5;
    this.target.position.z -= speed * deltaTime;
};

// Caution: Arrow functions inherit outer this
this.onStart = function () {
    // Arrow function captures this correctly for callbacks
    game.collisionDetector.onCollision(this.target, (other) => {
        this.handleCollision(other); // 'this' is the behavior instance
    });
};

// If you must use a regular function callback, capture only the data you need
this.onStart = function () {
    const target = this.target;
    setTimeout(function () {
        if (target) target.visible = false;
    }, 1000);
};
```

## Quick Reference

| Concept | Key Point for Behaviors |
|---------|------------------------|
| Closures | Private state that survives across frames |
| `this` | Always refers to behavior instance in lifecycle methods |
| Arrow functions | Use in callbacks to preserve `this` context |
| async/await | Only in `init()` and `onStart()`, never in `update()` |
| WeakRef | Safe cross-behavior references that don't prevent GC |
| Set/Map | Track disposable resources for cleanup |
| Proxy | Observable attribute wrappers (advanced) |
| Event loop | Microtasks (Promises) before macrotasks (setTimeout) |

## See Also

- **stemstudio-behaviors** — Behavior lifecycle, code structure, best practices
- **stemstudio-game-engine** — GameManager API used in behavior code
- **stemstudio-eventbus** — EventBus messaging patterns between behaviors
- **stemstudio-lambdas** — ECS data patterns that behaviors read/write
