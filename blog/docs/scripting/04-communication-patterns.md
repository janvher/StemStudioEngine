---
title: Communication Patterns
slug: communication-patterns
description: How behaviors, lambdas, and other systems communicate in StemStudio using direct behavior references, the global store, onEvent, and the built-in engine events catalog.
status: draft
audience: technical-creators
prerequisites: [scripting/01-behaviors-vs-lambdas, scripting/02-writing-behaviors, scripting/03-writing-lambdas]
---

# Communication Patterns

Behaviors and lambdas need to communicate with each other. StemStudio provides three mechanisms: **direct behavior references** for targeted access, the **global store** for shared data, and the **onEvent lifecycle hook** for receiving engine events.

## What This Page Is For

Use this page when you need to:

- Send messages between behaviors
- Share data across the scene using the global store
- Look up specific behaviors or lambdas at runtime
- React to built-in engine events (character motion, enemy state, game score)
- Decide which communication pattern fits your use case

---

## Behavior-to-Behavior Communication

The preferred way for behaviors to communicate is through direct references using `findBehavior()` and `findBehaviors()`.

### findBehavior(id, target?)

Find a single behavior by type. Defaults to searching the same object:

```ts
// Find the animation behavior on this object
const anim = this.findBehavior("animation");

// Find the character behavior on a specific object
const char = this.findBehavior("character", playerObject);
```

Returns the first match or `null`.

### findBehaviors(id)

Find all behaviors of a type across the entire scene:

```ts
// Find every enemy behavior in the scene
const enemies = this.findBehaviors("enemy");

for (const enemy of enemies) {
    const health = enemy.getAttribute("health");
    console.log(`Enemy health: ${health}`);
}
```

### Sending Events to Behaviors on an Object

Use `game.behaviorManager.sendEventToObjectBehaviors()` to send events to all behaviors attached to a target object:

```ts
// Notify all behaviors on this object
this.game?.behaviorManager?.sendEventToObjectBehaviors(
    this.target, "door.open", { force: true }
);

// Notify all behaviors on a different object
this.game?.behaviorManager?.sendEventToObjectBehaviors(
    enemyObject, "alert", { position: this.target.position }
);
```

For lambdas, the equivalent is `game.lambdaManager.sendEventToObjectLambdas()`:

```ts
this.game?.lambdaManager?.sendEventToObjectLambdas(
    this.target, "reset", { reason: "respawn" }
);
```

### Reading and Changing Attributes

Read another behavior's attributes or request changes:

```ts
// Read an attribute
const char = this.findBehavior("character", playerObject);
if (char) {
    const health = char.getAttribute("health");
    console.log("Player health:", health);
}

// Request an attribute change
const follow = this.findBehavior("follow");
if (follow) {
    await follow.requestAttributeChange("speed", 10);
}
```

### erth.behaviors API

You can also access behavior queries through `this.erth.behaviors`:

| Method | Returns | Description |
|--------|---------|-------------|
| `find(target, id)` | `Behavior \| null` | Find a behavior by ID on a specific object |
| `findAll(id)` | `Behavior[]` | Find all behaviors of a type across the scene |
| `findOnObject(target)` | `Behavior[]` | Find all behaviors on a specific object |
| `getAttribute(behavior, key)` | `any` | Read an attribute from a behavior |
| `requestChange(behavior, key, value, options?)` | `Promise<AttributeChangeResult>` | Request an attribute change on a behavior |

```ts
// Find all enemies in the scene via erth.behaviors
const enemies = this.erth?.behaviors.findAll("enemy") ?? [];
for (const enemy of enemies) {
    const hp = this.erth?.behaviors.getAttribute(enemy, "health");
    if (hp <= 0) {
        console.log("Dead enemy found");
    }
}
```

---

## Receiving Engine Events: onEvent

The `onEvent(msg, data)` lifecycle hook is how behaviors receive events from the engine and from other behaviors. Built-in behaviors and engine systems emit events that your custom behaviors can react to.

```ts
onEvent(msg: string, data: any): void {
    switch (msg) {
        case "door.open":
            this.handleDoorOpen(data);
            break;
        case "consumable.collected":
            this.updateScoreUI(data);
            break;
    }
}
```

See [Built-in Engine Events](#built-in-engine-events) below for the full catalog of events emitted by engine systems.

---

## erth.store: Global Key-Value Store

The global store is a simple key-value map shared by all behaviors in the scene. It is useful for lightweight state that multiple behaviors need to read.

### API

Access the store via `this.erth.store`:

| Method | Returns | Description |
|--------|---------|-------------|
| `get<T>(key)` | `T \| undefined` | Read a value |
| `set<T>(key, value)` | `void` | Write a value |
| `has(key)` | `boolean` | Check if a key exists |
| `delete(key)` | `boolean` | Remove a key |
| `keys()` | `string[]` | List all keys |
| `size` | `number` | Number of stored keys |

### Usage

```ts
// Set a value
this.erth?.store.set("totalCoins", 0);

// Read a value
const coins = this.erth?.store.get<number>("totalCoins") ?? 0;

// Update a value
this.erth?.store.set("totalCoins", coins + 1);

// Check existence
if (this.erth?.store.has("bossDefeated")) {
    this.unlockDoor();
}

// Delete a key
this.erth?.store.delete("temporaryFlag");
```

### Limits

- Maximum **128 keys**. The store throws an error if you exceed this limit.
- The store is **reset when the game starts**. Do not rely on it for persistent data.
- Values can be any type (numbers, strings, objects, arrays), but they are not automatically synced in multiplayer.

### When To Use the Store

- Sharing simple state between unrelated behaviors (score, coins, flags)
- Tracking game progress (levels completed, items found)
- Temporary flags (boss defeated, tutorial shown)

### When Not To Use the Store

- For large or complex data structures (use a dedicated manager behavior instead)
- For data that needs multiplayer synchronization (use the state system instead)
- For high-frequency updates every frame (use direct references instead)

---

## erth.lambdas: Direct Lambda Access

For communicating with lambda instances, use `this.erth.lambdas`:

| Method | Returns | Description |
|--------|---------|-------------|
| `getInstance(instanceId)` | `Lambda \| null` | Get a lambda by instance UUID |
| `getInstancesByType(lambdaId)` | `Lambda[]` | Get all instances of a lambda type |
| `getObjectLambdas(target)` | `Lambda[]` | Get all lambdas an object belongs to |
| `registerObject(instanceId, target, data?)` | `boolean` | Add an object to a lambda |
| `deregisterObject(instanceId, target)` | `void` | Remove an object from a lambda |

### Usage

```ts
// Get the velocity lambda and apply it
const velocity = this.erth?.lambdas.getInstancesByType("velocity")[0];
velocity?.apply(deltaTime);

// Register an object dynamically
this.erth?.lambdas.registerObject(
    velocity.uuid,
    newObject,
    { vx: 5, vy: 0, vz: 0 }
);

// Read component data
const data = velocity?.getComponentData(myObject);
if (data) {
    console.log("Velocity X:", data.vx);
}
```

---

## Decision Guide

| Question | Direct Reference | Store | onEvent |
|----------|-----------------|-------|---------|
| Who needs to know? | One specific behavior or lambda | Any behavior, at any time | Engine events, broad notifications |
| How often? | Every frame (tight coupling OK) | Occasionally (read/write state) | Occasionally (on triggers, state changes) |
| Direction? | One-to-one or one-to-many targeted | Shared read/write | Push from engine systems |
| Coupling? | High (requires behavior reference) | Low (key strings only) | None (topic strings only) |
| Examples | Health bar reading player health | Total score, game flags, progress | "enemy died", "score changed", "door opened" |

---

## Common Patterns

### Pattern 1: Cross-Behavior Communication

One behavior sends a message to all behaviors on a target object.

```ts
// Door trigger behavior notifies behaviors on the door object
onCollisionEnter(other: Object3D) {
    this.game?.behaviorManager?.sendEventToObjectBehaviors(
        doorObject, "door.open", { triggeredBy: other.uuid }
    );
}
```

### Pattern 2: Broadcast to Multiple Objects

A manager behavior notifies all enemies in the scene.

```ts
alertAllEnemies(position: THREE.Vector3) {
    const enemies = this.findBehaviors("enemy");
    for (const enemy of enemies) {
        this.game?.behaviorManager?.sendEventToObjectBehaviors(
            enemy.target, "alert", { position }
        );
    }
}
```

### Pattern 3: Shared State

Multiple behaviors read a shared flag to decide whether to act.

```ts
// Boss behavior sets the flag
onDefeated() {
    this.erth?.store.set("bossDefeated", true);
}

// Door behavior checks the flag
update(deltaTime: number) {
    if (this.erth?.store.get("bossDefeated")) {
        this.openDoor(deltaTime);
    }
}
```

### Pattern 4: Direct Orchestration

A behavior directly controls a lambda's execution.

```ts
// Physics controller behavior
update(deltaTime: number) {
    // Step systems in order
    this.rigidBody?.apply(deltaTime);
    this.velocity?.apply(deltaTime);
    this.collider?.apply(deltaTime);
}
```

### Pattern 5: Attribute Change Request

One behavior modifies another behavior's configuration.

```ts
// Difficulty manager changes enemy speed
const enemies = this.findBehaviors("enemy");
for (const enemy of enemies) {
    await enemy.requestAttributeChange("speed", 10);
}
```

---

## Built-in Engine Events

These events are emitted by built-in behaviors and engine systems. Your custom behaviors receive them through the `onEvent(msg, data)` lifecycle hook.

### Game Events

| Event | When It Fires |
|-------|--------------|
| `game.lives.inc` | Player gains a life |
| `game.lives.dec` | Player loses a life |
| `game.health.inc` | Player health increases |
| `game.health.dec` | Player health decreases |
| `game.score.inc` | Player score increases |
| `game.score.dec` | Player score decreases |
| `game.time.inc` | Game timer increases |
| `game.time.dec` | Game timer decreases |
| `game.loginSuccess` | Player login completes |

### Enemy Events

| Event | When It Fires |
|-------|--------------|
| `enemy.spawned` | An enemy spawns into the scene |
| `enemy.died` | An enemy's health reaches zero |
| `enemy.got.hit` | An enemy takes damage |
| `enemy.state.changed` | An enemy transitions between AI states |
| `enemy.player.detected` | An enemy detects the player |
| `enemy.player.lost` | An enemy loses sight of the player |
| `enemy.attack.started` | An enemy begins an attack animation |
| `enemy.attack` | An enemy attack connects (deals damage) |
| `enemy.attack.ended` | An enemy finishes an attack animation |

### Character Motion Events

| Event | When It Fires |
|-------|--------------|
| `character.motion.none` | Character is idle (not moving) |
| `character.motion_start` | Character begins moving |
| `character.motion` | Character is moving (fires continuously) |
| `character.motion_end` | Character stops moving |
| `character.motion.walk_start` | Character begins walking |
| `character.motion.walk` | Character is walking |
| `character.motion.walk_end` | Character stops walking |
| `character.motion.run_start` | Character begins running |
| `character.motion.run` | Character is running |
| `character.motion.run_end` | Character stops running |

### Character Action Events

| Event | When It Fires |
|-------|--------------|
| `character.action.jump_start` | Character begins a jump |
| `character.action.jump` | Character is airborne from a jump |
| `character.action.land` | Character lands after a jump or fall |
| `character.action.climb_start` | Character begins climbing |
| `character.action.climb` | Character is climbing |
| `character.action.climb_end` | Character stops climbing |
| `character.action.crouch_start` | Character begins crouching |
| `character.action.crouch` | Character is crouching |
| `character.action.crouch_end` | Character stops crouching |
| `character.action.fall_start` | Character begins falling |
| `character.action.fall` | Character is falling |
| `character.action.fall_end` | Character stops falling |
| `character.action.fall_back` | Character falls backward (knockback) |
| `character.action.dead` | Character dies |
| `character.action.interact` | Character interacts with an object |

### Animation Events

| Event | When It Fires |
|-------|--------------|
| `character.animation.trigger` | An animation is triggered on the character |
| `character.animation.stop` | An animation is stopped on the character |
| `character.animation.complete` | An animation finishes playing |

### Consumable Events

| Event | When It Fires |
|-------|--------------|
| `consumable.in.range` | Player enters collection range of a consumable |
| `consumable.not.in.range` | Player leaves collection range of a consumable |
| `consumable.collected` | Player collects a consumable item |
| `consumable.collided` | A consumable collides with an object |

### Trigger and System Events

| Event | When It Fires |
|-------|--------------|
| `jumppad.activated` | A jump pad launches an object |
| `platform.activated` | A platform begins moving |
| `platform.moving` | A platform is in motion |
| `platform.deactivated` | A platform stops moving |
| `volume.activated` | An object enters a volume zone |
| `spawner.activated` | A spawner creates an object |
| `randomized.spawner.activated` | A randomized spawner creates an object |
| `teleport.activated` | A teleport transports an object |

### NPC Events

| Event | When It Fires |
|-------|--------------|
| `npc.interaction.started` | Player begins interacting with an NPC |
| `npc.interaction.ended` | Player stops interacting with an NPC |
| `npc.action.started` | An NPC begins performing an action |
| `npc.action.ended` | An NPC finishes performing an action |

---

## Best Practices

### Keep Store Keys Predictable

Use consistent, descriptive key names:

```ts
// Good
this.erth?.store.set("game.totalCoins", 42);
this.erth?.store.set("player.hasKey", true);

// Bad
this.erth?.store.set("x", 42);
this.erth?.store.set("flag1", true);
```

### Prefer onEvent Over Polling

Instead of checking a condition every frame:

```ts
// Less efficient: polling
update(deltaTime: number) {
    if (this.erth?.store.get("doorUnlocked")) {
        this.openDoor();
    }
}
```

React only when the state changes:

```ts
// More efficient: event-driven
onEvent(msg: string, data: any) {
    if (msg === "door.unlocked") {
        this.openDoor();
    }
}
```

### Clean Up References

Null out behavior references in `onStop()` or `dispose()` to prevent holding stale references:

```ts
private enemyBehavior: Behavior | null = null;

onStart() {
    this.enemyBehavior = this.findBehavior("enemy");
}

onStop() {
    this.enemyBehavior = null;
}
```

## Next Steps

- Browse the [Built-in Behaviors Reference](05-built-in-behaviors.md) to see what is already available.
- Read [Erth Interface](../apis/01-erth-interface.md) for the full runtime API surface.
