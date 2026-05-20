---
title: "Tutorial: Cannon Projectile Spawner"
slug: tutorial-cannon-spawner
description: "Spawn dynamic physics projectiles at an interval, launch them forward, and auto-clean them."
status: draft
audience: technical-creators
prerequisites: [scripting/02-writing-behaviors, gameplay/01-physics]
---

# Tutorial: Cannon Projectile Spawner

Build a cannon that spawns cannonball projectiles at a set interval, launches them in the cannon's forward direction, and removes them after a timeout. This teaches runtime object creation, `GameObject` physics setup, and cleanup.

> **Inspired by** the [8th Wall Physics Playground](https://github.com/8thwall/studio-physics-playground-example) `cannonLaunch` component -- adapted to StemStudio behaviors.

## What You Will Learn

- Creating 3D objects at runtime with `THREE.Mesh`
- Adding objects to the scene with `this.erth.scene.addObject()`
- Configuring physics from script (`go.physics.configure()`)
- Setting launch velocity on a physics body
- Scheduling cleanup with `setTimeout` and disposing Three.js resources

## Scene Setup

1. Add a **Cylinder** or **Box** to represent the cannon barrel.
2. Rotate it so its **negative-Z axis** points in the desired fire direction (the script fires along local -Z).
3. Optionally add a floor and some target objects (dynamic crates, etc.) for the cannonballs to hit.
4. Attach the **Cannon Projectile Spawner** behavior to the barrel object.

## The Behavior

### behavior.json

```json
{
    "id": "cannonSpawner",
    "name": "Cannon Projectile Spawner",
    "description": "Spawns cannonball projectiles at a set interval and auto-cleans them.",
    "author": "StemStudio",
    "version": "1.0.0",
    "tags": ["tutorial", "physics", "spawner"],
    "main": "script.js",
    "throttleConfig": {
        "throttlePriority": "HIGH",
        "enableFrustumCulling": false,
        "enableDistanceThrottling": false,
        "requiresConsistentUpdates": true
    },
    "attributes": {
        "firePower": {
            "name": "Fire Power",
            "type": "number",
            "default": 25,
            "min": 1,
            "max": 100,
            "description": "Initial speed of each cannonball."
        },
        "fireInterval": {
            "name": "Fire Interval (s)",
            "type": "number",
            "default": 2,
            "min": 0.1,
            "max": 10,
            "description": "Seconds between each shot."
        },
        "ballRadius": {
            "name": "Ball Radius",
            "type": "number",
            "default": 0.25,
            "min": 0.05,
            "max": 2,
            "description": "Radius of the spawned cannonball."
        },
        "ballMass": {
            "name": "Ball Mass",
            "type": "number",
            "default": 2,
            "min": 0.1,
            "max": 20,
            "description": "Mass of each cannonball."
        },
        "deleteTimeout": {
            "name": "Delete Timeout (s)",
            "type": "number",
            "default": 5,
            "min": 1,
            "max": 30,
            "description": "Seconds before a cannonball is removed from the scene."
        }
    }
}
```

### script.js

```js
export default class CannonSpawner extends BehaviorBase {

    timer = 0;
    spawnedBalls = [];

    init(game) {
        super.init(game);
    }

    update(deltaTime) {
        const interval = this.getAttribute("fireInterval") ?? 2;
        this.timer += deltaTime;

        if (this.timer >= interval) {
            this.timer = 0;
            void this.fire();
        }
    }

    async fire() {
        const power   = this.getAttribute("firePower") ?? 25;
        const radius  = this.getAttribute("ballRadius") ?? 0.25;
        const mass    = this.getAttribute("ballMass") ?? 2;
        const timeout = this.getAttribute("deleteTimeout") ?? 5;

        // Create a sphere mesh
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const mesh = new THREE.Mesh(geometry, material);

        // Position at the cannon's world location
        const spawnPos = new THREE.Vector3();
        this.target.getWorldPosition(spawnPos);
        mesh.position.copy(spawnPos);

        // Wrap as a GameObject so we can configure physics before adding it
        const ball = this.erth.object.createFromThreeObject(mesh);
        ball.physics.configure({
            enabled: true,
            bodyType: "dynamic",
            shape: "sphere",
            mass: mass,
        });

        // Add to scene
        await this.erth.scene.addObject(ball);

        // Compute forward direction from the cannon's orientation
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.target.quaternion);
        forward.normalize();

        // Set launch velocity
        const body = ball.physics.getBody();
        if (body) {
            body.setVelocity({
                x: forward.x * power,
                y: forward.y * power,
                z: forward.z * power,
            });
        }

        // Schedule cleanup
        const timeoutId = setTimeout(() => {
            this.removeBall(mesh);
        }, timeout * 1000);

        this.spawnedBalls.push({ mesh, timeoutId });
    }

    removeBall(mesh) {
        this.game.removeObject(mesh);
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat.dispose());
        } else {
            mesh.material?.dispose();
        }
        this.spawnedBalls = this.spawnedBalls.filter((b) => b.mesh !== mesh);
    }

    dispose() {
        for (const ball of this.spawnedBalls) {
            clearTimeout(ball.timeoutId);
            this.game.removeObject(ball.mesh);
            ball.mesh.geometry?.dispose();
            if (Array.isArray(ball.mesh.material)) {
                ball.mesh.material.forEach((mat) => mat.dispose());
            } else {
                ball.mesh.material?.dispose();
            }
        }
        this.spawnedBalls = [];
    }
}
```

## How It Works

### Interval timer

A simple accumulator in `update()` counts up by `deltaTime` each frame. When it exceeds `fireInterval`, the cannon fires and the timer resets. This is a common pattern for periodic actions in game loops.

### Dynamic object creation

Each cannonball starts as a fresh `THREE.Mesh`, then gets wrapped with `this.erth.object.createFromThreeObject()`. Physics is configured on the `GameObject` before calling `await this.erth.scene.addObject(ball)`. This mirrors the current runtime object-creation flow used elsewhere in the engine.

### Forward direction

The cannon's local negative-Z axis (`0, 0, -1`) is transformed to world space using the object's quaternion. This means rotating the cannon in the editor changes the fire direction automatically.

### Auto-cleanup

Each cannonball schedules its own removal with `setTimeout`. The `removeBall` helper first calls `this.game.removeObject(mesh)` so behaviors and physics are cleaned up correctly, then disposes the Three.js geometry and material. The `dispose()` method repeats that cleanup for any balls still alive when the spawner is removed.

## Try It

- Increase **Fire Power** to `60` and watch the cannonballs fly farther.
- Set **Fire Interval** to `0.2` for a rapid-fire machine gun effect.
- Change the material color to `0xff4400` for fiery-looking projectiles.
- Add collision listeners to the cannonballs (create a second behavior) to trigger explosions or particle effects on impact.
- Aim the cannon upward at a 45-degree angle for an arc trajectory.

## Next Steps

- [Physics](01-physics.md) -- Body types, materials, and joints reference
- [Tutorial: Rolling Ball Controller](08-tutorial-rolling-ball.md) -- Player-controlled physics movement
- [Tutorial: Collision Pickup](10-tutorial-collision-pickup.md) -- React to collisions with animation sequences
- [Particles and VFX](03-particles-vfx.md) -- Add explosion effects when cannonballs hit
