---
title: "GameObject and Physics API"
slug: gameobject-api
description: "Complete reference for the GameObject wrapper, GameObjectPhysics configuration, PhysicsSettings, RigidBodyHandle, physics materials, and creating dynamic physics objects programmatically."
status: draft
audience: technical-creators
prerequisites: [scripting/01-behaviors-vs-lambdas, apis/01-erth-interface]
---

# GameObject and Physics API

A `GameObject` is the typed wrapper around a Three.js `Object3D`. It provides clean access to position, rotation, scale, visibility, and a physics interface. You get a `GameObject` by calling `this.erth.object.createFromThreeObject()` or `this.erth.asset.model.createInstance()`.

## What This Page Is For

Use this page when you need to:

- Understand what properties and methods a `GameObject` exposes
- Configure physics on an object (body type, shape, material, mass)
- Apply forces, set velocities, or change collision behavior at runtime
- Create dynamic physics objects from scratch in behavior code

---

## GameObject

```typescript
interface GameObject {
    readonly uuid: string;
    readonly position: Vector3;
    readonly rotation: Quaternion;
    readonly scale: Vector3;
    visible: boolean;
    readonly physics: GameObjectPhysics;
}
```

### Properties

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `uuid` | `string` | read-only | Unique identifier for this object |
| `position` | `Vector3` | read-only reference, mutable values | World-space position. Use `position.set(x, y, z)` to move. |
| `rotation` | `Quaternion` | read-only reference, mutable values | Orientation as a quaternion |
| `scale` | `Vector3` | read-only reference, mutable values | Scale in each axis. Use `scale.set(x, y, z)` to resize. |
| `visible` | `boolean` | read/write | Whether the object is rendered |
| `physics` | `GameObjectPhysics` | read-only | Physics configuration and runtime body access |

### Example: Move and hide an object

```javascript
const obj = this.erth.object.createFromThreeObject(mesh);

// Position
obj.position.set(5, 2, -3);

// Scale
obj.scale.set(2, 2, 2);

// Visibility
obj.visible = false;
```

**Note:** The `position`, `rotation`, and `scale` properties are read-only references to mutable Three.js vector/quaternion objects. You cannot reassign them (`obj.position = new Vector3()` will not work), but you can modify their components (`obj.position.x = 5` or `obj.position.set(5, 2, -3)`).

---

## GameObjectPhysics

Every `GameObject` has a `physics` property that provides three methods for configuring and accessing the physics body.

```typescript
interface GameObjectPhysics {
    configure(settings: PhysicsSettings): void;
    getSettings(): PhysicsSettings | undefined;
    getBody(): RigidBodyHandle | undefined;
}
```

### configure(settings)

Set the physics configuration for this object. Call this **before** adding the object to the scene with `erth.scene.addObject()`. The physics body is created when the object enters the scene.

```javascript
obj.physics.configure({
    enabled: true,
    bodyType: "dynamic",
    shape: "sphere",
    mass: 1,
    restitution: 0.7
});
```

### getSettings()

Read back the physics settings that were configured on this object. Returns `undefined` if `configure()` was never called.

```javascript
const settings = obj.physics.getSettings();
if (settings) {
    console.log("Body type:", settings.bodyType);
    console.log("Mass:", settings.mass);
}
```

### getBody()

Get the runtime physics body handle. Returns `undefined` if the object has not been added to the scene yet or if physics is not enabled.

```javascript
const body = obj.physics.getBody();
if (body) {
    body.applyImpulse({ x: 0, y: 10, z: 0 });
}
```

---

## PhysicsSettings

The full configuration object for physics bodies. All properties are optional and have sensible defaults.

```typescript
interface PhysicsSettings {
    enabled?: boolean;                // default: false
    bodyType?: PhysicsBodyType;       // default: "static"
    shape?: PhysicsShape;             // default: "box"
    mass?: number;                    // default: 0
    friction?: number;                // default: 0
    restitution?: number;             // default: 0
    rollingFriction?: number;         // default: 0
    spinningFriction?: number;        // default: 0
    material?: PhysicsMaterial;       // default: "ground"
    climbable?: boolean;              // default: false
    rotationLock?: {
        x?: boolean;
        y?: boolean;
        z?: boolean;
    };
    shapeOffset?: Vector3Like;
    shapeScale?: Vector3Like;
    excludeHiddenObjects?: boolean;   // default: false
    shapeDimensions?: ShapeDimensions;
}
```

### Body Types

```typescript
type PhysicsBodyType = "static" | "dynamic" | "kinematic";
```

| Type | Description | Use for |
|------|-------------|---------|
| `"static"` | Does not move. Other objects collide with it. | Floors, walls, platforms |
| `"dynamic"` | Affected by gravity and forces. Responds to collisions. | Balls, crates, characters |
| `"kinematic"` | Moved by code only. Not affected by gravity or collisions. | Moving platforms, doors, elevators |

### Collision Shapes

```typescript
type PhysicsShape = "box" | "sphere" | "capsule" | "convexHull" | "concaveHull";
```

| Shape | Description | Best for |
|-------|-------------|----------|
| `"box"` | Axis-aligned bounding box | Crates, walls, platforms |
| `"sphere"` | Bounding sphere | Balls, projectiles |
| `"capsule"` | Cylinder with rounded ends | Characters, NPCs |
| `"convexHull"` | Tightest convex shape around the mesh | Irregular convex objects |
| `"concaveHull"` | Matches mesh geometry exactly | Complex static environments (expensive, use sparingly) |

### Physics Materials (14 Types)

```typescript
type PhysicsMaterial =
    | "metal"
    | "dirt"
    | "ground"
    | "plastic"
    | "snow"
    | "wood"
    | "concrete"
    | "mud"
    | "ice"
    | "slime"
    | "water"
    | "slipperyGround"
    | "rubber"
    | "sand";
```

Physics materials affect how objects interact during collisions. Each material has pre-configured friction and restitution values that combine with the explicit `friction` and `restitution` settings.

| Material | Character | Example use |
|----------|-----------|-------------|
| `"metal"` | Low friction, medium bounce | Metal floors, rails |
| `"dirt"` | Medium friction, low bounce | Outdoor terrain |
| `"ground"` | Default. Medium friction, low bounce | General surfaces |
| `"plastic"` | Low friction, medium bounce | Smooth objects |
| `"snow"` | Low friction, no bounce | Snowy terrain |
| `"wood"` | Medium friction, low bounce | Wooden platforms, crates |
| `"concrete"` | High friction, no bounce | Urban surfaces |
| `"mud"` | High friction, no bounce | Swamp, wet terrain |
| `"ice"` | Very low friction, low bounce | Icy surfaces, sliding |
| `"slime"` | High friction, medium bounce | Sticky surfaces |
| `"water"` | Low friction, no bounce | Water surfaces |
| `"slipperyGround"` | Very low friction, no bounce | Oil slicks, polished floors |
| `"rubber"` | High friction, high bounce | Bouncy surfaces |
| `"sand"` | High friction, no bounce | Desert, beach |

### Rotation Lock

Prevent rotation on specific axes. Useful for characters or objects that should remain upright.

```javascript
obj.physics.configure({
    enabled: true,
    bodyType: "dynamic",
    shape: "capsule",
    mass: 1,
    rotationLock: { x: true, z: true }  // Only rotate around Y axis
});
```

### Shape Offset and Scale

Adjust the collision shape position and size relative to the visual mesh.

```javascript
obj.physics.configure({
    enabled: true,
    bodyType: "static",
    shape: "box",
    shapeOffset: { x: 0, y: 0.5, z: 0 },  // Move shape up
    shapeScale: { x: 1, y: 1.2, z: 1 }     // Scale shape taller
});
```

### Shape Dimensions

Override the automatically computed collision shape dimensions. Only works for `box`, `sphere`, and `capsule` shapes.

```typescript
// Box
interface BoxShapeDimensions {
    width: number;
    height: number;
    length: number;
}

// Sphere
interface SphereShapeDimensions {
    radius: number;
}

// Capsule
interface CapsuleShapeDimensions {
    radius: number;
    height: number;
}
```

```javascript
obj.physics.configure({
    enabled: true,
    bodyType: "dynamic",
    shape: "box",
    mass: 1,
    shapeDimensions: { width: 2, height: 1, length: 3 }
});
```

---

## RigidBodyHandle

The runtime physics body, obtained via `gameObject.physics.getBody()` after the object is added to the scene.

```typescript
interface RigidBodyHandle {
    readonly uuid: string;
    applyImpulse(impulse: Vector3Like, relativePosition?: Vector3Like): void;
    setVelocity(velocity: Vector3Like): void;
    setCollisionBehavior(behavior: "regular" | "ghost"): void;
    remove(): void;
}
```

### applyImpulse(impulse, relativePosition?)

Apply an instantaneous force to the body. The impulse is a `Vector3Like` (`{ x, y, z }`). The optional `relativePosition` applies the impulse at an offset from the body's center, which creates torque.

```javascript
const body = obj.physics.getBody();
if (body) {
    // Push straight up
    body.applyImpulse({ x: 0, y: 10, z: 0 });

    // Push forward and slightly right
    body.applyImpulse({ x: 2, y: 0, z: -5 });

    // Apply impulse at an offset (creates spin)
    body.applyImpulse(
        { x: 5, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }  // offset from center
    );
}
```

### setVelocity(velocity)

Set the body's velocity directly. Overrides any existing velocity.

```javascript
const body = obj.physics.getBody();
if (body) {
    // Move at constant speed along X
    body.setVelocity({ x: 5, y: 0, z: 0 });

    // Stop all movement
    body.setVelocity({ x: 0, y: 0, z: 0 });
}
```

### setCollisionBehavior(behavior)

Change how the body interacts with other physics bodies.

| Behavior | Description |
|----------|-------------|
| `"regular"` | Normal collisions -- the body blocks and bounces off other bodies |
| `"ghost"` | Passes through other bodies. Still triggers collision events, but does not physically block. Useful for triggers and sensors. |

```javascript
const body = obj.physics.getBody();
if (body) {
    // Make this object a trigger (other objects pass through it)
    body.setCollisionBehavior("ghost");
}
```

### remove()

Remove the physics body from the simulation. The visual object remains in the scene but is no longer affected by physics.

```javascript
const body = obj.physics.getBody();
if (body) {
    body.remove();
}
```

---

## Creating Objects Programmatically

The standard workflow for creating a dynamic physics object from code:

1. Create a Three.js mesh
2. Wrap it with `erth.object.createFromThreeObject()`
3. Set position, rotation, scale
4. Configure physics with `physics.configure()`
5. Add to the scene with `erth.scene.addObject()`
6. Optionally get the body handle to apply forces

### Full Example: Dynamic Bouncing Ball

```javascript
this.onStart = async function() {
    // Step 1: Create the Three.js mesh
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        roughness: 0.3,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Step 2: Wrap as a GameObject
    const ball = this.erth.object.createFromThreeObject(mesh);

    // Step 3: Set position
    ball.position.set(0, 10, 0);

    // Step 4: Configure physics
    ball.physics.configure({
        enabled: true,
        bodyType: "dynamic",
        shape: "sphere",
        mass: 2,
        friction: 0.5,
        restitution: 0.7,
        material: "rubber"
    });

    // Step 5: Add to the scene
    await this.erth.scene.addObject(ball);

    // Step 6: Apply an initial impulse
    const body = ball.physics.getBody();
    if (body) {
        body.applyImpulse({ x: 5, y: 0, z: 0 });
    }
};
```

### Full Example: Kinematic Moving Platform

```javascript
this.onStart = async function() {
    const geometry = new THREE.BoxGeometry(4, 0.5, 4);
    const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geometry, material);

    const platform = this.erth.object.createFromThreeObject(mesh);
    platform.position.set(0, 3, 0);
    platform.physics.configure({
        enabled: true,
        bodyType: "kinematic",
        shape: "box",
        mass: 0,
        friction: 1.0,
        material: "concrete"
    });
    await this.erth.scene.addObject(platform);

    // Store reference for update loop
    this.platform = platform;
    this.time = 0;
};

this.update = function(deltaTime) {
    if (!this.platform) return;
    this.time += deltaTime;

    // Move the platform back and forth
    this.platform.position.x = Math.sin(this.time) * 5;
};
```

### Full Example: Static Wall With Custom Dimensions

```javascript
this.onStart = async function() {
    const geometry = new THREE.BoxGeometry(1, 3, 10);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, material);

    const wall = this.erth.object.createFromThreeObject(mesh);
    wall.position.set(10, 1.5, 0);
    wall.physics.configure({
        enabled: true,
        bodyType: "static",
        shape: "box",
        friction: 0.8,
        material: "concrete",
        shapeDimensions: { width: 1, height: 3, length: 10 }
    });
    await this.erth.scene.addObject(wall);
};
```

### Full Example: Ghost Trigger Volume

```javascript
this.onStart = async function() {
    const geometry = new THREE.BoxGeometry(5, 5, 5);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);

    const trigger = this.erth.object.createFromThreeObject(mesh);
    trigger.position.set(0, 2.5, 0);
    trigger.physics.configure({
        enabled: true,
        bodyType: "static",
        shape: "box"
    });
    await this.erth.scene.addObject(trigger);

    // Make it a ghost so objects pass through
    const body = trigger.physics.getBody();
    if (body) {
        body.setCollisionBehavior("ghost");
    }
};
```

---

## Important Notes

### Physics Configuration Timing

- Call `physics.configure()` **before** `erth.scene.addObject()`. The physics body is created when the object enters the scene.
- Call `physics.getBody()` **after** `erth.scene.addObject()`. The body does not exist until the object is in the scene.

### Disposing Objects

When you remove objects from the scene, always use `this.game.removeObject()` or the scene management API to ensure the physics body is cleaned up. Do not just call `parent.remove(child)` -- this will leave orphaned physics bodies.

### Memory Management

When creating Three.js geometries and materials in behavior code, keep references so you can dispose them in `onStop()`:

```javascript
this.onStart = async function() {
    this.geometry = new THREE.SphereGeometry(0.5);
    this.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(this.geometry, this.material);
    // ... create and add to scene
};

this.onStop = function() {
    this.geometry?.dispose();
    this.material?.dispose();
};
```

---

## Common Mistakes

- **Calling getBody() before addObject()** -- The body does not exist until the object is in the scene. Always await `addObject()` first.
- **Using concaveHull on dynamic objects** -- Concave hull shapes are only supported on static bodies. Use convexHull for dynamic objects with complex shapes.
- **Forgetting to set enabled: true** -- Physics is disabled by default. If your object is not colliding, check that `enabled` is `true`.
- **Setting mass: 0 on dynamic bodies** -- A mass of 0 makes the body immovable. Dynamic bodies should have mass > 0.
- **Not disposing geometries and materials** -- Three.js does not garbage-collect GPU resources. Always call `.dispose()` on geometries, materials, and textures when done.

## Next Steps

- Read [Erth Interface](01-erth-interface.md) for the full API surface including asset management and store.
- See [Built-in Events Reference](02-eventbus.md) for collision-related events and gameplay event handling.
- See [GameManager](04-game-manager.md) for direct engine access and advanced object management.
