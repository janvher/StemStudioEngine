---
title: "Tutorial: Rolling Ball Controller"
slug: tutorial-rolling-ball
description: "Build a physics-driven ball controller with camera-relative movement, ground detection, and jumping."
status: draft
audience: technical-creators
prerequisites: [scripting/02-writing-behaviors, gameplay/01-physics]
---

# Tutorial: Rolling Ball Controller

Build a sphere that rolls around a level using WASD keys, with camera-relative direction, ground detection via collision events, and a jump impulse. This is a good foundation for marble games, physics playgrounds, and rolling-character prototypes.

> **Inspired by** the [8th Wall Physics Playground](https://github.com/8thwall/studio-physics-playground-example) `ballController` component -- adapted to StemStudio behaviors.

## What You Will Learn

- Applying impulses to a dynamic physics body every frame
- Computing camera-relative movement directions
- Tracking ground contact with collision event counters
- Applying an impulse for jumping
- Reducing control while airborne with an air-control factor

## Scene Setup

1. Add a **Sphere** primitive -- this is the ball.
2. In the right panel, enable **Physics**: body type **Dynamic**, shape **Sphere**, mass **1**.
3. Add a large **Box** below it for the floor: body type **Static**, shape **Box**.
4. Optionally add ramps and platforms (static boxes) to test rolling and jumping.
5. Attach the **Rolling Ball Controller** behavior to the Sphere.

## The Behavior

### behavior.json

```json
{
    "id": "rollingBallController",
    "name": "Rolling Ball Controller",
    "description": "Camera-relative ball movement with ground detection and jump.",
    "author": "StemStudio",
    "version": "1.0.0",
    "tags": ["tutorial", "physics", "movement"],
    "main": "script.js",
    "throttleConfig": {
        "throttlePriority": "CRITICAL",
        "enableFrustumCulling": false,
        "enableDistanceThrottling": false,
        "requiresConsistentUpdates": true
    },
    "objectSettings": {
        "physics": {
            "enabled": true,
            "type": "dynamic",
            "shape": "sphere",
            "mass": 1
        }
    },
    "attributes": {
        "moveForce": {
            "name": "Move Force",
            "type": "number",
            "default": 12,
            "min": 1,
            "max": 50,
            "description": "Force applied for horizontal movement."
        },
        "jumpImpulse": {
            "name": "Jump Impulse",
            "type": "number",
            "default": 8,
            "min": 1,
            "max": 30,
            "description": "Upward impulse applied on jump."
        },
        "airControlFactor": {
            "name": "Air Control Factor",
            "type": "slider",
            "default": 0.3,
            "min": 0,
            "max": 1,
            "step": 0.05,
            "description": "Movement force multiplier while airborne (0 = none, 1 = full)."
        },
        "maxSpeed": {
            "name": "Max Speed",
            "type": "number",
            "default": 15,
            "min": 1,
            "max": 50,
            "description": "Maximum horizontal speed."
        }
    }
}
```

### script.js

```js
export default class RollingBallController extends BehaviorBase {

    // ── Internal state ────────────────────────────────────────
    isGrounded = false;
    groundContactCount = 0;
    forward = new THREE.Vector3();
    right = new THREE.Vector3();

    // ── Lifecycle ─────────────────────────────────────────────

    init(game) {
        super.init(game);
    }

    onStart() {
        // Grounding is tracked entirely via onEvent.
    }

    update(deltaTime) {
        const body = this.gameObject.physics.getBody();
        if (!body) return;

        // --- Read attributes ---
        const moveForce = this.getAttribute("moveForce") ?? 12;
        const jumpImpulse = this.getAttribute("jumpImpulse") ?? 8;
        const airControl = this.getAttribute("airControlFactor") ?? 0.3;
        const maxSpeed = this.getAttribute("maxSpeed") ?? 15;

        // --- Camera-relative directions (flatten to XZ plane) ---
        const cam = this.game.camera;
        if (!cam) return;

        cam.getWorldDirection(this.forward);
        this.forward.y = 0;
        this.forward.normalize();

        this.right.crossVectors(this.forward, new THREE.Vector3(0, 1, 0)).normalize();

        // --- Gather input ---
        const input = { x: 0, z: 0 };
        const keys = this.game.inputManager;
        if (keys.isKeyDown("KeyW") || keys.isKeyDown("ArrowUp"))    input.z += 1;
        if (keys.isKeyDown("KeyS") || keys.isKeyDown("ArrowDown"))  input.z -= 1;
        if (keys.isKeyDown("KeyA") || keys.isKeyDown("ArrowLeft"))  input.x -= 1;
        if (keys.isKeyDown("KeyD") || keys.isKeyDown("ArrowRight")) input.x += 1;

        // --- Compute force direction ---
        const dir = new THREE.Vector3()
            .addScaledVector(this.forward, input.z)
            .addScaledVector(this.right, input.x);

        if (dir.lengthSq() > 0) {
            dir.normalize();

            const impulseMag = moveForce * (this.isGrounded ? 1.0 : airControl);

            // Speed cap
            const vel = this.game.physics?.getLinearVelocity(this.target.uuid);
            const hSpeed = vel ? Math.sqrt(vel.x * vel.x + vel.z * vel.z) : 0;

            if (hSpeed < maxSpeed) {
                body.applyImpulse({
                    x: dir.x * impulseMag * deltaTime,
                    y: 0,
                    z: dir.z * impulseMag * deltaTime,
                });
            }
        }

        // --- Jump ---
        if (this.isGrounded && keys.isKeyDown("Space")) {
            body.applyImpulse({ x: 0, y: jumpImpulse, z: 0 });
            this.isGrounded = false;
            this.groundContactCount = 0;
        }
    }

    // ── Collision events ──────────────────────────────────────

    onEvent(msg, data) {
        if (msg === "collision") {
            if (data.normal && data.normal.y > 0.5) {
                if (data.state === "start") {
                    this.groundContactCount++;
                    this.isGrounded = true;
                } else if (data.state === "end") {
                    this.groundContactCount = Math.max(0, this.groundContactCount - 1);
                    if (this.groundContactCount === 0) {
                        this.isGrounded = false;
                    }
                }
            }
        }
    }

    dispose() {}
}
```

## How It Works

### Camera-relative direction

The camera's world-space forward direction is projected onto the XZ plane by zeroing the Y component and normalizing. The right vector is computed with a cross product. This means "W" always pushes the ball away from the camera, regardless of camera rotation.

### Ground detection with contact counting

A simple boolean is not enough -- if the ball rests on two surfaces simultaneously and one contact ends, it would incorrectly report "not grounded". The `groundContactCount` tracks overlapping ground contacts. The ball is grounded as long as the count is above zero. Only contacts whose normal points upward (`y > 0.5`) count as ground.

### Air control factor

When airborne, impulses are multiplied by `airControlFactor` (default 0.3). This lets the player steer mid-air but with less authority, which feels natural.

### Speed cap

Before applying another impulse, the script checks horizontal speed against `maxSpeed` using `this.game.physics.getLinearVelocity()`. This prevents the ball from accelerating indefinitely.

### Jump

Jumping applies a single upward impulse and immediately clears the grounded state to prevent double-jumping.

## Try It

- Change **Move Force** to `30` for a heavier, slower-to-start feel.
- Set **Air Control Factor** to `0` for no air steering, or `1` for full air control.
- Add the [Reset / Respawn](../scripting/07-tutorial-reset-respawn.md) behavior to the same object so the ball teleports back when it falls off the level.
- Build an obstacle course with ramps and moving platforms.

## Next Steps

- [Physics](01-physics.md) -- Full physics reference (body types, shapes, materials, joints)
- [Tutorial: Cannon Projectile Spawner](09-tutorial-cannon-spawner.md) -- Spawn dynamic objects at runtime
- [Writing Behaviors](../scripting/02-writing-behaviors.md) -- Lifecycle, attributes, and behavior patterns
