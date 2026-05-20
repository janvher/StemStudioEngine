---
title: "Tutorial: NPC State Machine"
slug: tutorial-npc-state-machine
description: "Create an NPC that patrols, detects the player, and responds to interaction using a state machine."
status: draft
audience: technical-creators
prerequisites: [scripting/02-writing-behaviors, gameplay/02-animation]
---

# Tutorial: NPC State Machine

Build a behavior that drives an NPC through five states -- idle, patrol, alert, interact, and return -- using a simple state machine. The NPC walks between two points, notices when the player gets close, faces them, waits for an interaction key, plays a gesture animation, and then returns to its patrol route.

## What You Will Learn

- Defining states as an enum object and tracking the current state
- Centralising transitions through an `enterState()` method
- Switching animations with crossfade when the state changes
- Detecting player proximity with a configurable range and debounce
- Reading keyboard input only when the NPC is ready to interact
- Emitting events so other behaviors can react to the interaction
- Moving an object along a path without physics

## Scene Setup

1. Import a humanoid model (or use a primitive) and place it in the scene -- this is the NPC.
2. Make sure the model has at least three animations: an **idle**, a **walk**, and a **gesture** (wave, talk, etc.).
3. Create an empty object or second primitive and position it a few meters away -- this is the **patrol target**.
4. Attach the **NPC State Machine** behavior to the NPC object.
5. In the behavior attributes, set **Patrol Target** to the patrol target object and adjust **Detection Range** and **Patrol Speed** to taste.
6. Add a player character with a movement controller (e.g. the built-in **Third Person Controller**) so you can walk up to the NPC during play.

## The Behavior

### behavior.json

```json
{
    "id": "npcStateMachine",
    "name": "NPC State Machine",
    "description": "Drives an NPC through idle, patrol, alert, interact, and return states.",
    "author": "StemStudio",
    "version": "1.0.0",
    "tags": ["tutorial", "npc", "state-machine"],
    "main": "script.js",
    "throttleConfig": {
        "throttlePriority": "MEDIUM",
        "enableFrustumCulling": false,
        "enableDistanceThrottling": true,
        "requiresConsistentUpdates": false
    },
    "attributes": {
        "patrolTarget": {
            "name": "Patrol Target",
            "type": "object",
            "description": "Object the NPC walks toward during patrol. The NPC alternates between its start position and this object."
        },
        "patrolSpeed": {
            "name": "Patrol Speed",
            "type": "number",
            "default": 1.5,
            "min": 0.1,
            "max": 10,
            "description": "Movement speed in units per second."
        },
        "detectionRange": {
            "name": "Detection Range",
            "type": "number",
            "default": 5,
            "min": 1,
            "max": 50,
            "description": "Distance at which the NPC notices the player."
        },
        "interactKey": {
            "name": "Interact Key",
            "type": "string",
            "default": "KeyE",
            "description": "Keyboard code that triggers the interaction (e.g. KeyE, KeyF)."
        },
        "interactDuration": {
            "name": "Interact Duration (s)",
            "type": "number",
            "default": 2,
            "min": 0.5,
            "max": 10,
            "description": "How long the gesture animation plays before the NPC returns."
        },
        "idleAnim": {
            "name": "Idle Animation",
            "type": "string",
            "default": "idle",
            "autoFill": "object.animations",
            "description": "Animation to play while idle or alert."
        },
        "walkAnim": {
            "name": "Walk Animation",
            "type": "string",
            "default": "walk",
            "autoFill": "object.animations",
            "description": "Animation to play while patrolling or returning."
        },
        "gestureAnim": {
            "name": "Gesture Animation",
            "type": "string",
            "default": "wave",
            "autoFill": "object.animations",
            "description": "Animation to play during interaction."
        }
    }
}
```

### script.js

```js
const States = {
    IDLE:     "idle",
    PATROL:   "patrol",
    ALERT:    "alert",
    INTERACT: "interact",
    RETURN:   "return",
};

const FADE_DURATION = 0.25;
const RANGE_CHECK_INTERVAL = 0.2; // seconds

export default class NpcStateMachine extends BehaviorBase {

    state = States.IDLE;
    stateTimer = 0;
    rangeTimer = 0;

    startPosition = new THREE.Vector3();
    patrolPosition = new THREE.Vector3();
    movingToTarget = true;

    direction = new THREE.Vector3();

    init(game) {
        super.init(game);
        this.startPosition.copy(this.target.position);
    }

    onStart() {
        // Resolve patrol target position
        const targetId = this.getAttribute("patrolTarget");
        if (targetId) {
            const obj = this.game?.scene?.getObjectByProperty("uuid", targetId);
            if (obj) {
                this.patrolPosition.copy(obj.position);
            }
        }

        this.enterState(States.IDLE);
    }

    update(deltaTime) {
        this.stateTimer += deltaTime;
        this.rangeTimer += deltaTime;

        switch (this.state) {
            case States.IDLE:
                this.updateIdle();
                break;
            case States.PATROL:
                this.updatePatrol(deltaTime);
                break;
            case States.ALERT:
                this.updateAlert();
                break;
            case States.INTERACT:
                this.updateInteract();
                break;
            case States.RETURN:
                this.updateReturn(deltaTime);
                break;
        }
    }

    // ── State updates ──────────────────────────────

    updateIdle() {
        // Wait 2 seconds, then start patrolling
        if (this.stateTimer >= 2) {
            this.enterState(States.PATROL);
            return;
        }
        this.checkPlayerRange();
    }

    updatePatrol(deltaTime) {
        const dest = this.movingToTarget ? this.patrolPosition : this.startPosition;
        const arrived = this.moveToward(dest, deltaTime);

        if (arrived) {
            this.movingToTarget = !this.movingToTarget;
            this.enterState(States.IDLE);
            return;
        }

        this.checkPlayerRange();
    }

    updateAlert() {
        this.facePlayer();

        const interactKey = this.getAttribute("interactKey") ?? "KeyE";
        if (this.game.inputManager.isKeyDown(interactKey)) {
            this.enterState(States.INTERACT);
            return;
        }

        // If the player walks away, go back to patrol
        if (this.rangeTimer >= RANGE_CHECK_INTERVAL) {
            this.rangeTimer = 0;
            if (!this.isPlayerInRange()) {
                this.enterState(States.PATROL);
            }
        }
    }

    updateInteract() {
        this.facePlayer();

        const duration = this.getAttribute("interactDuration") ?? 2;
        if (this.stateTimer >= duration) {
            this.enterState(States.RETURN);
        }
    }

    updateReturn(deltaTime) {
        const dest = this.movingToTarget ? this.patrolPosition : this.startPosition;
        const arrived = this.moveToward(dest, deltaTime);

        if (arrived) {
            this.enterState(States.IDLE);
            return;
        }

        this.checkPlayerRange();
    }

    // ── State transitions ──────────────────────────

    enterState(newState) {
        this.state = newState;
        this.stateTimer = 0;

        const idleAnim    = this.getAttribute("idleAnim") ?? "idle";
        const walkAnim    = this.getAttribute("walkAnim") ?? "walk";
        const gestureAnim = this.getAttribute("gestureAnim") ?? "wave";

        switch (newState) {
            case States.IDLE:
            case States.ALERT:
                this.playAnim(idleAnim);
                break;
            case States.PATROL:
            case States.RETURN:
                this.playAnim(walkAnim);
                break;
            case States.INTERACT:
                this.playAnim(gestureAnim, true);
                // Notify other behaviors on this object about the interaction
                this.game?.behaviorManager?.sendEventToObjectBehaviors(
                    this.target, "npcInteract", { npc: this.target, state: States.INTERACT }
                );
                break;
        }
    }

    // ── Helpers ─────────────────────────────────────

    playAnim(name, once = false) {
        this.game.playBlendedAnimations(
            this.target,
            [
                {
                    name,
                    weight: 1,
                    speed: 1,
                    fadeDuration: FADE_DURATION,
                },
            ],
            once
        );
    }

    moveToward(dest, deltaTime) {
        const speed = this.getAttribute("patrolSpeed") ?? 1.5;

        this.direction.subVectors(dest, this.target.position);
        this.direction.y = 0;
        const dist = this.direction.length();

        if (dist < 0.15) return true;

        this.direction.normalize();

        // Face movement direction
        this.target.rotation.y = Math.atan2(
            this.direction.x, this.direction.z
        );

        const step = Math.min(speed * deltaTime, dist);
        this.target.position.addScaledVector(this.direction, step);
        return false;
    }

    checkPlayerRange() {
        if (this.rangeTimer < RANGE_CHECK_INTERVAL) return;
        this.rangeTimer = 0;

        if (this.isPlayerInRange()) {
            this.enterState(States.ALERT);
        }
    }

    isPlayerInRange() {
        const player = this.game?.player;
        if (!player) return false;

        const range = this.getAttribute("detectionRange") ?? 5;
        return this.target.position.distanceTo(player.position) <= range;
    }

    facePlayer() {
        const player = this.game?.player;
        if (!player) return;

        this.direction.subVectors(player.position, this.target.position);
        this.direction.y = 0;

        if (this.direction.lengthSq() > 0.01) {
            this.target.rotation.y = Math.atan2(
                this.direction.x, this.direction.z
            );
        }
    }

    dispose() {}
}
```

## How It Works

### States as an enum

The `States` object at the top of the file defines five named constants. Using an object instead of raw strings prevents typos and makes it easy to add new states later.

### The state machine loop

Each frame, `update()` runs a `switch` on `this.state` and calls the matching `update*` method. Each method contains only the logic relevant to that state, keeping the code readable.

### Centralised transitions

All state changes go through `enterState()`. This method resets `stateTimer`, picks the right animation, and emits events when needed. Centralising transitions means you never forget to reset a timer or play the wrong animation.

### Player proximity detection

`checkPlayerRange()` runs at most once every 200 ms (controlled by `RANGE_CHECK_INTERVAL`). This avoids running a distance check every frame, which matters when many NPCs are in the scene. When the player is within `detectionRange`, the NPC moves to the ALERT state.

### Keyboard interaction

The interact key is only checked during the ALERT state. This prevents the player from triggering interactions while the NPC is patrolling or already interacting.

### Animation switching

`playAnim()` wraps `this.game.playBlendedAnimations()` with a single blend entry and a fixed crossfade duration. When `enterState()` picks a new animation, the previous one blends out smoothly over 0.25 seconds. The gesture animation uses `playOnce = true` so it plays a single cycle.

### Event notification

When the NPC enters the INTERACT state, it calls `sendEventToObjectBehaviors()` to emit `"npcInteract"` to all behaviors on the object. Other behaviors implement the `onEvent` lifecycle hook to react and trigger dialogue, open a shop UI, or start a quest.

## Try It

- Add a sixth **FLEE** state where the NPC runs away when the player gets too close during INTERACT.
- Replace the fixed idle timer with a random duration between 1 and 4 seconds for more natural behaviour.
- Implement `onEvent("npcInteract", ...)` in a separate HUD behavior to show a dialogue bubble above the NPC.
- Add a second patrol target and extend the path so the NPC walks a triangle instead of a line.
- Swap `position.addScaledVector()` for physics-based movement if the NPC needs to collide with walls.

## Next Steps

- [Communication Patterns](04-communication-patterns.md) -- Event patterns for NPC interaction events
- [Built-in Behaviors Reference](05-built-in-behaviors.md) -- Built-in AI NPC behavior pack with LLM-driven dialogue
- [Tutorial: Vehicle / Behavior Swapping](08-tutorial-vehicle-swap.md) -- Swap NPC controller behaviors at runtime
- [Tutorial: Reset / Respawn](07-tutorial-reset-respawn.md) -- Reset NPC to its start position
- [Animation](../gameplay/02-animation.md) -- Full animation API reference
