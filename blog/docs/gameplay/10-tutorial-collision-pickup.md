---
title: "Tutorial: Collision Pickup"
slug: tutorial-collision-pickup
description: "Detect collisions to trigger a pickup, play a rise-and-spin animation, and update shared game state."
status: draft
audience: technical-creators
prerequisites: [scripting/02-writing-behaviors, gameplay/01-physics]
---

# Tutorial: Collision Pickup with Animation Sequence

Build a collectible object that detects when the player touches it, plays a rise-and-spin animation using manual lerping in `update()`, and updates shared game state so scoreboards or other systems can react.

> **Inspired by** the [8th Wall Physics Playground](https://github.com/8thwall/studio-physics-playground-example) `objectPickup` component -- adapted to StemStudio behaviors.

## What You Will Learn

- Listening for collision events with `onEvent("collision", data)`
- Filtering collisions by object name/tag
- Driving a multi-step animation manually in `update()` (rise, spin, shrink)
- Using easing functions for smooth motion
- Updating shared state with `this.erth.store`
- Restoring state on game reset with `onReset()`

## Scene Setup

1. Add a small **Box** or **Sphere** to act as the collectible (a coin, gem, or power-up).
2. Enable **Physics** on it: body type **Static**, collision behavior **Ghost** (so the player passes through it).
3. Add a player object with a name that contains `"player"` (or change the **Player Tag** attribute to match).
4. Attach the **Collision Pickup** behavior to the collectible.
5. Duplicate the collectible around the level to create a collection challenge.

## The Behavior

### behavior.json

```json
{
    "id": "collisionPickup",
    "name": "Collision Pickup",
    "description": "Picks up an object on collision and plays a multi-step animation sequence.",
    "author": "StemStudio",
    "version": "1.0.0",
    "tags": ["tutorial", "collision", "animation"],
    "main": "script.js",
    "throttleConfig": {
        "throttlePriority": "HIGH",
        "enableFrustumCulling": false,
        "enableDistanceThrottling": false,
        "requiresConsistentUpdates": true
    },
    "objectSettings": {
        "physics": {
            "enabled": true,
            "type": "static",
            "shape": "box"
        }
    },
    "attributes": {
        "playerTag": {
            "name": "Player Tag",
            "type": "string",
            "default": "player",
            "description": "Tag on the colliding object that qualifies as a valid pickup."
        },
        "riseHeight": {
            "name": "Rise Height",
            "type": "number",
            "default": 2,
            "min": 0,
            "max": 10,
            "description": "How far the object rises during the pickup animation."
        },
        "riseDuration": {
            "name": "Rise Duration (s)",
            "type": "number",
            "default": 0.8,
            "min": 0.1,
            "max": 5,
            "description": "Seconds for the object to rise to its peak."
        },
        "spinSpeed": {
            "name": "Spin Speed",
            "type": "number",
            "default": 4,
            "min": 0,
            "max": 20,
            "description": "Rotation speed (radians/s) during the rise animation."
        },
        "fadeAfterPickup": {
            "name": "Hide After Pickup",
            "type": "boolean",
            "default": true,
            "description": "Hide the object after the animation completes."
        }
    }
}
```

### script.js

```js
export default class CollisionPickup extends BehaviorBase {

    collected = false;
    animating = false;
    animTime = 0;
    startY = 0;

    init(game) {
        super.init(game);
        this.startY = this.target.position.y;
    }

    update(deltaTime) {
        if (!this.animating) return;

        const riseHeight = this.getAttribute("riseHeight") ?? 2;
        const duration   = this.getAttribute("riseDuration") ?? 0.8;
        const spinSpeed  = this.getAttribute("spinSpeed") ?? 4;
        const hideAfter  = this.getAttribute("fadeAfterPickup") ?? true;

        this.animTime += deltaTime;
        const t = Math.min(this.animTime / duration, 1);

        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - t, 3);

        // Rise upward
        this.target.position.y = this.startY + riseHeight * eased;

        // Spin around Y axis
        this.target.rotation.y += spinSpeed * deltaTime;

        // Scale down near the end
        if (t > 0.7) {
            const shrink = 1 - ((t - 0.7) / 0.3);
            this.target.scale.setScalar(Math.max(shrink, 0));
        }

        // Animation complete
        if (t >= 1) {
            this.animating = false;
            if (hideAfter) {
                this.target.visible = false;
            }
            const pickupCount = (this.erth.store.get("pickupCount") ?? 0) + 1;
            this.erth.store.set("pickupCount", pickupCount);

            this.game?.behaviorManager?.sendEventToObjectBehaviors(
                this.target,
                "pickup",
                {
                    object: this.target,
                    name: this.target.name,
                    total: pickupCount,
                }
            );
        }
    }

    onEvent(msg, data) {
        if (msg !== "collision" || this.collected) return;
        if (data.state !== "start") return;

        const tag = this.getAttribute("playerTag") ?? "player";
        const otherName = data.other?.name ?? "";
        if (!otherName.toLowerCase().includes(tag.toLowerCase())) return;

        this.collected = true;
        this.animating = true;
        this.animTime = 0;

        // We keep the object in the scene while the animation finishes.
        // The collected flag prevents repeated pickups from duplicate collisions.
    }

    onReset() {
        this.collected = false;
        this.animating = false;
        this.animTime = 0;
        this.target.position.y = this.startY;
        this.target.scale.setScalar(1);
        this.target.visible = true;
    }

    dispose() {}
}
```

## How It Works

### Collision filtering

The `onEvent` handler only reacts to `"collision"` messages with `state === "start"`. It checks the other object's name against the `playerTag` attribute using a case-insensitive substring match. This prevents pickups from being triggered by cannonballs or debris.

### Manual animation in update()

Instead of using the animation controller, this script drives position, rotation, and scale directly in `update()`. A normalized time value `t` (0 to 1) is computed from elapsed time divided by duration. This is a useful pattern whenever you need a quick, self-contained animation without creating keyframe clips.

### Easing

The ease-out cubic formula `1 - (1 - t)^3` makes the object rise quickly at first and decelerate smoothly at the top. This one line replaces the need for an external tween library.

### Shrink-to-vanish

During the final 30% of the animation (`t > 0.7`), the object scales down from 1 to 0. Combined with hiding it at `t = 1`, this creates a clean disappearance.

### Shared state update

After the animation, the script increments `this.erth.store` under `pickupCount`. Any HUD or manager behavior can read that shared value. The example also sends a `"pickup"` message to sibling behaviors on the same object for local reactions like sound or VFX.

### Reset support

`onReset()` restores the object to its original state so the game can be replayed without reloading the scene.

## Try It

- Set **Rise Height** to `5` and **Rise Duration** to `2` for a dramatic slow-motion pickup.
- Set **Spin Speed** to `0` for a calm upward float instead of a spin.
- Create a HUD behavior that reads `this.erth.store.get("pickupCount")` and displays it with UIKit.
- Change the collision shape to **Sphere** with a larger radius for a more forgiving pickup zone.

## Next Steps

- [Physics](01-physics.md) -- Ghost mode, collision shapes, and triggers
- [Tutorial: Rolling Ball Controller](08-tutorial-rolling-ball.md) -- The player that collides with these pickups
- [Communication Patterns](../scripting/04-communication-patterns.md) -- Store and behavior-event communication patterns
- [HUD and UI](05-hud-and-ui.md) -- Build a score display that reacts to pickup events
