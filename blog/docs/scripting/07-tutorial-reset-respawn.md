---
title: "Tutorial: Reset / Respawn System"
slug: tutorial-reset-respawn
description: "Save an object's spawn point and teleport it back on key press or when it falls off the level."
status: draft
audience: technical-creators
prerequisites: [scripting/02-writing-behaviors, gameplay/01-physics]
---

# Tutorial: Reset / Respawn System

Build a utility behavior that saves an object's initial position, teleports it back on key press or when it falls below a Y threshold, and clears its velocity so it starts fresh. This pattern is useful for fall-off zones, checkpoints, and manual restart buttons.

> **Inspired by** the [8th Wall Physics Playground](https://github.com/8thwall/studio-physics-playground-example) `resetTransform` component -- adapted to StemStudio behaviors.

## What You Will Learn

- Saving and restoring object transforms (position and rotation)
- Clearing physics velocity after teleporting
- Implementing debounce to prevent rapid re-triggering
- Emitting events to notify other behaviors of a respawn
- Listening for events to update the spawn point dynamically

## Scene Setup

1. Use any dynamic object that can move and fall -- the [Rolling Ball](../gameplay/08-tutorial-rolling-ball.md) is a great choice.
2. Make sure the object has **Physics** enabled with body type **Dynamic**.
3. Position the object where you want the respawn point to be.
4. Attach the **Reset / Respawn** behavior to the object.
5. Press **Play**, move the object off a ledge or press **R** to test the reset.

## The Behavior

### behavior.json

```json
{
    "id": "resetRespawn",
    "name": "Reset / Respawn",
    "description": "Resets the object to a saved position on key press or when it falls below a threshold.",
    "author": "StemStudio",
    "version": "1.0.0",
    "tags": ["tutorial", "utility", "respawn"],
    "main": "script.js",
    "throttleConfig": {
        "throttlePriority": "HIGH",
        "enableFrustumCulling": false,
        "enableDistanceThrottling": false,
        "requiresConsistentUpdates": true
    },
    "attributes": {
        "resetKey": {
            "name": "Reset Key",
            "type": "string",
            "default": "KeyR",
            "description": "Keyboard code that triggers a manual reset (e.g. KeyR, KeyT)."
        },
        "autoReset": {
            "name": "Auto-Reset on Fall",
            "type": "boolean",
            "default": true,
            "description": "Automatically reset when the object falls below the Y threshold."
        },
        "resetY": {
            "name": "Reset Y Threshold",
            "type": "number",
            "default": -20,
            "min": -500,
            "max": 0,
            "description": "Y position below which the object auto-resets.",
            "visibleIf": { "autoReset": true }
        },
        "debounceCooldown": {
            "name": "Debounce Cooldown (s)",
            "type": "number",
            "default": 0.5,
            "min": 0,
            "max": 5,
            "description": "Minimum seconds between resets to prevent spamming."
        }
    }
}
```

### script.js

```js
export default class ResetRespawn extends BehaviorBase {

    spawnPosition = new THREE.Vector3();
    spawnRotation = new THREE.Euler();
    cooldownTimer = 0;

    init(game) {
        super.init(game);
        this.spawnPosition.copy(this.target.position);
        this.spawnRotation.copy(this.target.rotation);
    }

    update(deltaTime) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
            return;
        }

        const resetKey  = this.getAttribute("resetKey") ?? "KeyR";
        const autoReset = this.getAttribute("autoReset") ?? true;
        const resetY    = this.getAttribute("resetY") ?? -20;

        // Manual reset
        if (this.game.inputManager.isKeyDown(resetKey)) {
            this.resetToSpawn();
            return;
        }

        // Auto-reset on fall
        if (autoReset && this.target.position.y < resetY) {
            this.resetToSpawn();
        }
    }

    resetToSpawn() {
        const cooldown = this.getAttribute("debounceCooldown") ?? 0.5;

        this.target.position.copy(this.spawnPosition);
        this.target.rotation.copy(this.spawnRotation);

        // Clear velocity
        const body = this.gameObject.physics.getBody();
        if (body) {
            body.setVelocity({ x: 0, y: 0, z: 0 });
        }
        this.game.physics?.setAngularVelocity(this.target.uuid, new THREE.Vector3(0, 0, 0));

        this.cooldownTimer = cooldown;

        // Notify other behaviors on this object about the respawn
        this.game?.behaviorManager?.sendEventToObjectBehaviors(
            this.target, "respawn", { object: this.target, position: this.spawnPosition.clone() }
        );
    }

    // Allow other behaviors to move the spawn point
    onEvent(msg, data) {
        if (msg === "setSpawnPoint" && data?.position) {
            this.spawnPosition.copy(data.position);
            if (data.rotation) {
                this.spawnRotation.copy(data.rotation);
            }
        }
    }

    dispose() {}
}
```

## How It Works

### Saving the spawn point

In `init()`, the script copies the object's current position and rotation into `spawnPosition` and `spawnRotation`. These are the values the object teleports back to on reset.

### Manual reset

Every frame, the script checks if the reset key is held using `this.game.inputManager.isKeyDown()`. The key code is an attribute so creators can remap it without editing code.

### Auto-reset on fall

When `autoReset` is enabled, the script compares `this.target.position.y` against `resetY`. If the object is below the threshold, it resets. The `visibleIf` on `resetY` means this field only appears in the editor when auto-reset is turned on.

### Clearing velocity

After teleporting the position, the script zeroes linear velocity through `gameObject.physics.getBody()` and clears angular velocity through the lower-level `this.game.physics` API. Without this step, the object would continue moving with whatever momentum it had before the reset.

### Debounce

The `cooldownTimer` prevents resets from firing every frame while the key is held or while the object is below the threshold. During cooldown, `update()` returns early.

### Dynamic spawn point

The `onEvent` handler listens for `"setSpawnPoint"` messages. A checkpoint behavior could emit this event when the player reaches a new checkpoint, updating the respawn location.

## Try It

- Change **Reset Key** to `"KeyT"` to avoid conflicts with other behaviors.
- Set **Reset Y Threshold** to `-5` for a quick fall-off on a floating platform level.
- Create a checkpoint object that emits `"setSpawnPoint"` when the player passes through it.
- Combine with the [Rolling Ball Controller](../gameplay/08-tutorial-rolling-ball.md) for a complete playable character with respawn.

## Next Steps

- [Communication Patterns](04-communication-patterns.md) -- Event patterns for respawn notifications
- [Tutorial: Vehicle / Behavior Swapping](08-tutorial-vehicle-swap.md) -- Switch between controllers at runtime
- [Writing Behaviors](02-writing-behaviors.md) -- Full behavior lifecycle reference
