# GameObject and GameManager API

`GameObject` is the behavior-friendly wrapper around a Three.js `Object3D`. `GameManager` is the lower-level runtime controller passed to behavior `init(game)`.

Use `this.erth` for normal gameplay code. Reach for `this.game` only after storing the `game` argument yourself, and only when you need lower-level systems that are not exposed through `this.erth`.

```ts
this.init = function (game) {
  this.game = game;
};
```

## GameObject

You get a `GameObject` from:

- `this.gameObject`
- `this.erth.object.createFromThreeObject(object3d)`
- `this.erth.asset.model.createInstance(ref)`
- `this.erth.asset.stem.createInstance(ref)`

```ts
interface GameObject {
  readonly uuid: string;
  readonly position: THREE.Vector3;
  readonly rotation: THREE.Quaternion;
  readonly scale: THREE.Vector3;
  visible: boolean;
  readonly physics: GameObjectPhysics;
  readonly _internal: {three?: THREE.Object3D};
}
```

`position`, `rotation`, and `scale` are read-only references to mutable Three.js objects. Change their components instead of replacing the property.

```ts
this.gameObject.position.set(0, 2, 0);
this.gameObject.scale.set(2, 2, 2);
this.gameObject.visible = false;
```

Use `this.target` when an API requires the raw `THREE.Object3D`. Use `this.gameObject` when you want the wrapper and its physics helper.

## Physics helper

Every `GameObject` has:

```ts
interface GameObjectPhysics {
  configure(settings: PhysicsSettings): void;
  getSettings(): PhysicsSettings | undefined;
  getBody(): RigidBodyHandle | undefined;
}
```

Call `configure()` before adding a new runtime object to the scene. The runtime body is created when the object is initialized by `erth.scene.addObject()` or `game.addObject()`.

```ts
this.onStart = async function () {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 16),
    new THREE.MeshStandardMaterial({color: 0xffaa00}),
  );

  const ball = this.erth.object.createFromThreeObject(mesh);
  ball.position.set(0, 6, 0);
  ball.physics.configure({
    enabled: true,
    bodyType: "dynamic",
    shape: "sphere",
    mass: 1,
    restitution: 0.6,
    material: "rubber",
  });

  await this.erth.scene.addObject(ball);
  ball.physics.getBody()?.applyImpulse({x: 2, y: 0, z: -4});
};
```

## PhysicsSettings

```ts
interface PhysicsSettings {
  enabled?: boolean;
  bodyType?: "static" | "dynamic" | "kinematic";
  shape?: "box" | "sphere" | "capsule" | "convexHull" | "concaveHull";
  mass?: number;
  friction?: number;
  restitution?: number;
  rollingFriction?: number;
  spinningFriction?: number;
  material?: PhysicsMaterial;
  climbable?: boolean;
  rotationLock?: {x?: boolean; y?: boolean; z?: boolean};
  shapeOffset?: {x: number; y: number; z: number};
  shapeScale?: {x: number; y: number; z: number};
  excludeHiddenObjects?: boolean;
  shapeDimensions?: BoxShapeDimensions | SphereShapeDimensions | CapsuleShapeDimensions;
}
```

Body types:

| Type | Use for |
|---|---|
| `static` | Floors, walls, static level geometry |
| `dynamic` | Objects affected by gravity and impulses |
| `kinematic` | Objects moved by code, such as platforms and doors |

Physics materials:

```ts
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

Manual dimensions are supported for `box`, `sphere`, and `capsule` shapes.

```ts
wall.physics.configure({
  enabled: true,
  bodyType: "static",
  shape: "box",
  material: "concrete",
  shapeDimensions: {width: 1, height: 3, length: 10},
});
```

## RigidBodyHandle

After the object has been added to the scene, `gameObject.physics.getBody()` can return:

```ts
interface RigidBodyHandle {
  readonly uuid: string;
  applyImpulse(impulse, relativePosition?): void;
  setVelocity(velocity): void;
  setCollisionBehavior(behavior: "regular" | "ghost"): void;
  remove(): void;
}
```

```ts
const body = this.gameObject.physics.getBody();
body?.setVelocity({x: 0, y: 0, z: 8});
body?.setCollisionBehavior("ghost");
```

`ghost` bodies pass through other bodies but can still be used for trigger-style detection.

## GameManager state

`GameManager` is passed to `init(game)`:

```ts
this.init = function (game) {
  this.game = game;
};
```

Game state values:

```ts
this.game.state;
this.game.score;
this.game.lives;
this.game.health;
this.game.initialLives;
this.game.initialHealth;
this.game.maxScore;
```

State helpers:

```ts
this.game.isGameOver();
this.game.isWinner();
this.game.isGameStarted();
```

The current states are `NOT_STARTED`, `STARTED`, `FINISHED`, and `PAUSED`. `isGameStarted()` only returns true after startup initialization has completed.

## GameManager object methods

```ts
await this.game.addObject(object3d, parent?);
this.game.removeObject(object3d);
const clone = this.game.cloneObject(sourceObject);
this.game.pauseObject(object3d, pauseChildren?);
this.game.resumeObject(object3d, resumeChildren?);
```

Prefer `this.erth.object.createFromThreeObject()` plus `this.erth.scene.addObject()` when you are creating new runtime objects from behavior code. Use `game.addObject()` when you intentionally need to work with raw Three.js objects.

## GameManager behavior methods

```ts
await this.game.addBehaviorToObject(target, behaviorId, options?);
this.game.removeBehaviorByUUID(uuid);
this.game.updateBehaviorAttributes(uuid, updatedProperties);
```

For most cross-behavior work, prefer the higher-level `this.erth.behaviors` helpers. They return foreign behavior views and route attribute updates through the behavior change pipeline.

## Sound and animation

Sound helpers delegate to the active HUD sound manager:

```ts
this.game.loadSounds(sounds);
this.game.playSound(soundId);
this.game.stopSound(soundId);
this.game.clearSounds();
```

Animation helpers delegate to the animation controller:

```ts
this.game.playBlendedAnimations(this.target, [
  {name: "walk", weight: 0.7},
  {name: "wave", weight: 0.3},
]);

this.game.updateBlendedAnimationWeights(this.target, {
  walk: 0.2,
  run: 0.8,
});
```

## Input

Use `inputManager.getAction(actionId)` for boolean buttons and `inputManager.getMotion(motionId)` for continuous axes.

```ts
this.update = function () {
  if (this.game?.inputManager.getAction("jump")) {
    this.gameObject.physics.getBody()?.applyImpulse({x: 0, y: 4, z: 0});
  }
};
```

```ts
this.update = function () {
  const steer = this.game?.inputManager.getMotion("lateral") ?? 0;
  const throttle = this.game?.inputManager.getMotion("forward") ?? 0;
  this.drive(steer, throttle);
};
```

Current built-in action names include `jump`, `run`, `use`, `drop`, `pull`, and `primary`. Common motion names include `forward`, `lateral`, `view_x`, and `view_y`.

## Direct subsystem access

GameManager exposes engine subsystems for advanced cases:

| Property | Use |
|---|---|
| `scene` | Active Three.js scene |
| `camera` | Active perspective camera |
| `renderer` | Active renderer |
| `physics` | Physics engine interface |
| `animationController` | Animation playback |
| `animationGraphController` | Animation graph playback |
| `audioController` | Audio subsystem |
| `cameraControl` | Camera control system |
| `collisionDetector` | Collision detection updates |
| `objectPicker` | Pointer/raycast object picking |
| `inputManager` | Keyboard, mouse, touch, gamepad action state |
| `pointerEventManager` | Pointer input |
| `behaviorManager` | Behavior lifecycle and targeted events |
| `lambdaManager` | Lambda lifecycle and object registration |
| `multiplayerState` | Multiplayer state bridge |
| `player` | Current player object, if assigned |
| `discord` | Discord integration service |

This surface is intentionally lower-level and can change faster than `this.erth`.

## Events handled by GameManager

GameManager listens to the `game` event namespace and handles:

```ts
game.start
game.resume
game.pause
game.stop
game.score.inc
game.score.dec
game.lives.inc
game.lives.dec
game.health.inc
game.health.dec
game.time.inc
game.time.dec
game.loadSounds
game.playSound
game.stop_sound
game.clear_sounds
game.loginSuccess
```

Direct `EventBus` sending still exists for legacy scripts, but new behavior-to-behavior messages should use:

```ts
this.game.behaviorManager.sendEventToObjectBehaviors(target, "custom.topic", data);
```

and receive them with:

```ts
this.onEvent = function (msg, data) {
  if (msg === "custom.topic") {
    // react here
  }
};
```

## Patterns from real playground games

These examples are adapted from game behaviors and keep to the current supported API surface.

### Controller loop with input, motion, and telemetry

Vehicle and flight behaviors usually store the `GameManager`, read input every frame, mutate the `GameObject` transform, then publish plain telemetry for HUD and audio behaviors.

```ts
const forward = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

this.init = function (game) {
  this.game = game;
  this.speed = 0;
  this.drift = 0;
};

this.update = function (deltaTime) {
  const input = this.game.inputManager;
  const steer = input.getMotion("lateral");
  const throttle = input.getMotion("forward");
  const boost = input.getAction("use");

  const acceleration = boost ? 26 : 14;
  this.speed = THREE.MathUtils.clamp(
    this.speed + throttle * acceleration * deltaTime,
    -8,
    38,
  );

  this.target.getWorldDirection(forward);
  this.gameObject.position.addScaledVector(forward, this.speed * deltaTime);
  this.target.rotateOnAxis(up, -steer * deltaTime * 1.7);

  this.drift = Math.abs(steer) * Math.min(Math.abs(this.speed) / 24, 1);
  this.erth.store.set("vehicle.telemetry", {
    speed: this.speed,
    boost,
    drift: this.drift,
  });
};
```

Keep the controller authoritative for movement. Let HUD, sound, particles, and camera behaviors read telemetry instead of duplicating the driving math.

### Camera follow behavior

Rail and vehicle games often keep camera logic in a separate behavior so the player controller can stay focused on movement.

```ts
const desired = new THREE.Vector3();
const offset = new THREE.Vector3(0, 4, 9);

this.init = function (game) {
  this.game = game;
};

this.update = function (deltaTime) {
  desired.copy(offset)
    .applyQuaternion(this.target.quaternion)
    .add(this.gameObject.position);

  const camera = this.game.camera;
  camera.position.lerp(desired, Math.min(deltaTime * 5, 1));
  camera.lookAt(this.gameObject.position);
};
```

Use `this.game.camera` when you need the raw Three.js camera. Use `this.erth.camera.lookAt(x, y, z)` for simpler camera aiming.

### Targeted behavior events

Chess, weapon, and vehicle systems use targeted behavior messages when one object owns a gameplay decision and another behavior should respond.

```ts
// Sender behavior
this.fire = function () {
  this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "weapon.fire", {
    origin: this.gameObject.position.toArray(),
    speed: 32,
  });
};
```

```ts
// Receiver behavior on the same object, or on a targeted object
this.onEvent = function (msg, data) {
  if (msg !== "weapon.fire") return;

  const projectile = this.spawnProjectile();
  projectile.position.fromArray(data.origin);
  projectile.physics.getBody()?.setVelocity({x: 0, y: 0, z: -data.speed});
};
```

This is the right tool when a message is about a specific object. For broad engine state such as login, score, or health topics, use `this.erth.events.on()`.
