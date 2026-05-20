---
title: "Global Store"
slug: global-store
description: "How to use erth.store for shared key-value state across behaviors: API reference, 128-key limit, reset behavior, and guidance on when to use the store vs events vs behavior attributes."
status: draft
audience: technical-creators
prerequisites: [scripting/01-behaviors-vs-lambdas, apis/01-erth-interface]
---

# Global Store

The global store is a shared key-value map accessible to every behavior through `this.erth.store`. Use it when multiple behaviors need to read or write the same piece of data and events are not the right fit.

## What This Page Is For

Use this page when you need to:

- Share data between behaviors that do not have direct references to each other
- Understand the 128-key limit and what happens when it is exceeded
- Decide whether to use the store, behavior attributes, or events for a given problem

## API Reference

```typescript
interface ErthStore {
    get<T = unknown>(key: string): T | undefined;
    set<T = unknown>(key: string, value: T): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    keys(): string[];
    readonly size: number;
}
```

Access the store from any behavior:

```javascript
this.erth.store.get("myKey");
this.erth.store.set("myKey", myValue);
```

### get\<T\>(key)

Retrieve a value by key. Returns `undefined` if the key does not exist.

```javascript
const score = this.erth.store.get("score");
// score is undefined if never set, otherwise the stored value
```

The generic type parameter `T` is for TypeScript users:

```typescript
const score = this.erth.store.get<number>("score");
// score is number | undefined
```

### set\<T\>(key, value)

Store a value. Any serializable type is accepted: numbers, strings, booleans, objects, arrays.

```javascript
this.erth.store.set("score", 42);
this.erth.store.set("player.name", "Alice");
this.erth.store.set("inventory", ["sword", "shield"]);
this.erth.store.set("settings", { difficulty: "hard", volume: 0.8 });
```

**Throws an error if storing the value would exceed the 128-key limit.** Always check `this.erth.store.size` before adding many keys dynamically.

### has(key)

Check whether a key exists in the store.

```javascript
if (this.erth.store.has("bossDefeated")) {
    this.openDoor();
}
```

### delete(key)

Remove a key from the store. Returns `true` if the key existed, `false` otherwise.

```javascript
const wasDeleted = this.erth.store.delete("temporaryBuff");
```

### keys()

Get an array of all keys currently in the store.

```javascript
const allKeys = this.erth.store.keys();
console.log("Stored keys:", allKeys);
```

### size

Read-only property returning the current number of keys.

```javascript
console.log("Keys used:", this.erth.store.size, "/ 128");
```

---

## Key Limit: 128 Keys Maximum

The store enforces a hard limit of 128 keys. If you call `set()` with a new key when the store already has 128 entries, it throws an error.

This limit exists to prevent accidental memory growth. In practice, 128 keys is more than enough for game-level shared state. If you find yourself approaching the limit, consider:

- Grouping related values into a single object key instead of many separate keys
- Using behavior attributes for per-object data instead of the global store
- Cleaning up keys you no longer need with `delete()`

### Example: Grouping data to conserve keys

```javascript
// Bad: 4 separate keys per quest
this.erth.store.set("quest.forest.started", true);
this.erth.store.set("quest.forest.progress", 3);
this.erth.store.set("quest.forest.total", 5);
this.erth.store.set("quest.forest.reward", "sword");

// Better: 1 key per quest
this.erth.store.set("quest.forest", {
    started: true,
    progress: 3,
    total: 5,
    reward: "sword"
});
```

---

## Store Resets When Game Starts

The store is cleared every time a new game session starts (when the player presses Play). This means:

- Values from a previous play session do not carry over
- You cannot use the store for persistence across sessions
- You should initialize any required keys in `onStart()`

```javascript
this.onStart = function() {
    // Always initialize -- store is empty at game start
    if (!this.erth.store.has("score")) {
        this.erth.store.set("score", 0);
    }
    if (!this.erth.store.has("level")) {
        this.erth.store.set("level", 1);
    }
};
```

If you need data to persist across sessions, consider using `this.game.ajax` to save data to a backend, or localStorage through standard browser APIs.

---

## When to Use Store vs Behavior Attributes vs Events

Each mechanism solves a different communication problem.

### Use the Global Store When

- Multiple unrelated behaviors need to read or write the same value
- You need a "current state" that can be checked at any time (pull model)
- The data is game-level (score, level, flags) rather than object-level

### Use Behavior Attributes When

- The data belongs to one specific behavior instance
- The data is configured in the editor (exposed in the Properties panel)
- Other behaviors modify it through `erth.behaviors.requestChange()`
- The data is per-object, not global

### Use Direct References / onEvent When

- You need to notify other behaviors that something happened (push model)
- You want targeted communication via `findBehaviors()` + `onEvent()`
- The communication is fire-and-forget with no need to query the value later
- You want to react to built-in engine events via the `onEvent` lifecycle hook

### Decision Table

| Question | Store | Attributes | Direct Refs / onEvent |
|----------|-------|------------|----------------------|
| Who needs the data? | Many behaviors | One behavior/object | Specific behaviors or engine events |
| Is the data global? | Yes | No (per-object) | N/A |
| Can it be queried later? | Yes | Yes (via `erth.behaviors`) | No |
| Is it editor-configurable? | No | Yes | No |
| Push or pull? | Pull | Pull | Push |
| Persists across frames? | Yes (until reset) | Yes | No |

### Common Patterns

```javascript
// Store: global game state
this.erth.store.set("bossDefeated", true);
// Any behavior can check this later:
if (this.erth.store.get("bossDefeated")) { ... }

// Attributes: per-object configuration
// Set in editor, queried at runtime:
const speed = this.erth.behaviors.getAttribute(followBehavior, "speed");

// onEvent: fire-and-forget notifications
const listeners = this.findBehaviors("bossListener");
for (const listener of listeners) {
    listener.onEvent("boss.defeated", { bossId: "dragon" });
}
// Listeners react immediately, no state stored
```

---

## Multiplayer Sync Considerations

The global store is **local to each client**. In multiplayer games, each player has their own independent store instance. Changes made by one player's behaviors are not automatically replicated to other players.

If you need shared state in multiplayer:

- Use the multiplayer state system (`this.game.multiplayerState`) for values that must be synchronized across all players
- Use events routed through the multiplayer layer for notifications
- Use the store only for client-local state (UI preferences, local flags, client-side caches)

### Example: Multiplayer-safe score tracking

```javascript
// Wrong: store is local, other players will not see this
this.erth.store.set("score", this.erth.store.get("score") + 10);

// Right: use game state events, which GameManager processes
// and can sync through the multiplayer state
// (game.score.inc is handled by the engine's event system)
```

---

## Full Example: Checkpoint System

This example shows a checkpoint behavior and a respawn behavior sharing state through the store.

### Checkpoint behavior (attached to checkpoint objects)

```javascript
this.onEvent = function(msg, data) {
    if (msg === "volume.activated") {
        // Store the last checkpoint position
        this.erth.store.set("checkpoint.position", {
            x: this.target.position.x,
            y: this.target.position.y,
            z: this.target.position.z
        });
        this.erth.store.set("checkpoint.id", this.target.uuid);
        console.log("Checkpoint saved:", this.target.name);
    }
};
```

### Respawn behavior (attached to the player)

```javascript
this.respawnAtCheckpoint = function() {
    const checkpointPos = this.erth.store.get("checkpoint.position");
    if (checkpointPos) {
        this.target.position.set(checkpointPos.x, checkpointPos.y + 1, checkpointPos.z);
        console.log("Respawned at checkpoint");
    } else {
        // No checkpoint saved yet, respawn at origin
        this.target.position.set(0, 5, 0);
        console.log("Respawned at origin (no checkpoint)");
    }
};

this.onEvent = function(msg, data) {
    if (msg === "character.action.dead") {
        this.respawnAtCheckpoint();
    }
};
```

---

## Common Mistakes

- **Exceeding 128 keys** -- Use objects to group related data under a single key. Delete keys you no longer need.
- **Assuming store persists across sessions** -- It resets every time the game starts. Initialize keys in `onStart()`.
- **Using store for per-object data** -- If only one object needs the data, use behavior attributes instead.
- **Relying on store for multiplayer sync** -- The store is local. Use the multiplayer state system for shared data.
- **Storing non-serializable values** -- Avoid storing Three.js objects, DOM elements, or functions in the store. Store plain data (numbers, strings, objects, arrays).

## Next Steps

- See the [Built-in Events Reference](02-eventbus.md) for engine events you can react to via `onEvent()`.
- See [GameManager](04-game-manager.md) for how game state events update score, lives, and health.
- Read [Communication Patterns](../scripting/04-communication-patterns.md) for behavior-to-behavior messaging.
