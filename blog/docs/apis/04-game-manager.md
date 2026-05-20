---
title: "GameManager Reference"
slug: game-manager
description: "Advanced reference for GameManager: game state lifecycle, score/lives/health management, object and behavior control, sound, animation, and direct engine access for advanced creators."
status: draft
audience: technical-creators
prerequisites: [scripting/01-behaviors-vs-lambdas, apis/01-erth-interface]
---

# GameManager Reference

GameManager is the central runtime controller for a StemStudio game session. It manages game state, processes score/lives/health events, initializes and updates behaviors and lambdas, and provides direct access to engine subsystems.

Most behavior code should use `this.erth` for everyday tasks. GameManager (`this.game`) is for advanced use cases that require direct engine access, such as animation playback, audio control, camera manipulation, collision detection, or input handling.

## What This Page Is For

Use this page when you need to:

- Check or react to the game state (started, paused, finished)
- Understand how score, lives, and health are managed
- Add, remove, or clone objects at runtime
- Manage behaviors on objects dynamically
- Play sounds or animations programmatically
- Access engine subsystems directly

---

## Game State

### GAME_STATE Enum

```typescript
enum GAME_STATE {
    NOT_STARTED = 0,
    STARTED,
    FINISHED,
    PAUSED,
}
```

The game progresses through these states:

```
NOT_STARTED  -->  STARTED  -->  PAUSED  -->  STARTED  (resume)
                     |                          |
                     +---------> FINISHED <-----+
```

- `NOT_STARTED` -- Game has been created but Play has not been pressed yet
- `STARTED` -- Game is actively running, behaviors update every frame
- `PAUSED` -- Game is temporarily paused, behaviors stop updating, physics frozen
- `FINISHED` -- Game ended (lives or health reached 0, max score reached, or timer expired)

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `state` | `GAME_STATE` | Current game state |
| `score` | `number` | Current score |
| `lives` | `number` | Current lives remaining |
| `health` | `number` | Current health value |
| `initialLives` | `number` | Lives at game start (configured in scene settings) |
| `initialHealth` | `number` | Health at game start (default: 100) |
| `maxScore` | `number` | Score threshold that ends the game (0 = no limit) |

### State Query Methods

```javascript
// Check if the game has ended
if (this.game.isGameOver()) {
    console.log("Game is finished");
}

// Check if the player won (game over with lives > 0)
if (this.game.isWinner()) {
    console.log("Player won!");
}

// Check if the game is actively running (STARTED and fully initialized)
if (this.game.isGameStarted()) {
    // Safe to run gameplay logic
}
```

**Note:** `isGameStarted()` returns `false` during the initialization phase even when the state is `STARTED`. It only returns `true` after all behaviors and lambdas have been created.

---

## Game State Events

GameManager listens for the following game state events and processes them automatically:

| Event Topic | What GameManager Does |
|-------------|----------------------|
| `game.start` | Initialize all behaviors and lambdas, set state to STARTED |
| `game.pause` | Set state to PAUSED, freeze physics |
| `game.resume` | Set state to STARTED, unfreeze physics |
| `game.stop` | Dispose behaviors and lambdas, end session |
| `game.score.inc` | Add to score; end game if maxScore reached |
| `game.score.dec` | Subtract from score (will not go below 0) |
| `game.lives.inc` | Add lives |
| `game.lives.dec` | Subtract lives; end game if lives reach 0 |
| `game.health.inc` | Add health |
| `game.health.dec` | Subtract health; end game if health reaches 0 |
| `game.time.inc` | Add time to the countdown timer |
| `game.time.dec` | Subtract time; end game if timer reaches 0 |
| `game.loginSuccess` | Store login data |

These events are emitted by built-in behaviors and engine systems. Your behaviors can react to them via the `onEvent` lifecycle hook. See the [Built-in Events Reference](02-eventbus.md) for the full catalog.

You generally should not modify `this.game.score` directly. The event system ensures GameManager processes the update, checks win/lose conditions, and updates the HUD.

---

## Object Management

### addObject(object, parent?)

Add a Three.js Object3D to the scene at runtime. This initializes behaviors and physics for the object and all its children.

```javascript
this.onStart = async function() {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 5, 0);

    await this.game.addObject(mesh);
};
```

If a parent is provided, the object is added as a child of that parent. Otherwise it is added to the scene root.

**Tip:** For most cases, prefer the `erth.object.createFromThreeObject()` + `erth.scene.addObject()` pattern, which gives you a `GameObject` with typed physics access. Use `this.game.addObject()` when you need to work directly with Three.js objects.

### removeObject(object)

Remove an object from the scene. This:

1. Removes all behaviors from the object
2. Removes the physics body
3. Removes the object from its parent
4. Disposes of game-related resources

```javascript
this.game.removeObject(this.target);
```

### cloneObject(sourceObject)

Deep-clone an Object3D including all userData, behaviors data, and physics configuration. Returns a new Object3D or `null` if cloning failed.

```javascript
const clone = this.game.cloneObject(this.target);
if (clone) {
    clone.position.x += 3;
    await this.game.addObject(clone);
}
```

### pauseObject(object, pauseChildren?)

Pause an object: removes it from physics, pauses all behaviors. By default, recursively pauses children too.

```javascript
// Pause the object and all children
this.game.pauseObject(this.target);

// Pause only this object, not children
this.game.pauseObject(this.target, false);
```

### resumeObject(object, resumeChildren?)

Resume a paused object: re-adds it to physics, resumes behaviors. By default, recursively resumes children.

```javascript
this.game.resumeObject(this.target);
```

---

## Behavior Management

### addBehaviorToObject(target, behaviorId, options?)

Attach a behavior to an object at runtime.

```javascript
const behavior = await this.game.addBehaviorToObject(
    someObject,
    "myBehavior",
    {
        uuid: "custom-uuid",
        attributes: { speed: 5, color: "red" }
    }
);
```

### removeBehaviorByUUID(uuid)

Remove a specific behavior instance by its UUID.

```javascript
const removed = this.game.removeBehaviorByUUID("some-behavior-uuid");
if (removed) {
    console.log("Behavior removed:", removed.id);
}
```

### updateBehaviorAttributes(uuid, updatedProperties)

Update attribute values on an existing behavior instance.

```javascript
this.game.updateBehaviorAttributes("some-behavior-uuid", {
    speed: 10,
    enabled: false
});
```

---

## Sound

Load and play sounds configured in the scene.

### loadSounds(sounds)

Load an array of sound configurations.

```javascript
this.game.loadSounds([
    { id: "jump", url: "/sounds/jump.mp3" },
    { id: "coin", url: "/sounds/coin.mp3" }
]);
```

### playSound(soundId)

Play a loaded sound by its ID.

```javascript
this.game.playSound("jump");
```

### stopSound(soundId)

Stop a currently playing sound.

```javascript
this.game.stopSound("jump");
```

---

## Animation

### playBlendedAnimations(object, blends, playOnce?)

Play one or more animations on an object with blend weights. This is a proxy to the engine's `AnimationController`.

```javascript
this.game.playBlendedAnimations(this.target, [
    { name: "walk", weight: 0.7 },
    { name: "wave", weight: 0.3 }
]);

// Play once (will not loop)
this.game.playBlendedAnimations(this.target, [
    { name: "jump", weight: 1.0 }
], true);
```

### updateBlendedAnimationWeights(object, weights)

Update the blend weights of currently playing animations.

```javascript
this.game.updateBlendedAnimationWeights(this.target, {
    "walk": 0.3,
    "run": 0.7
});
```

---

## Engine Components

GameManager exposes direct references to engine subsystems. These are available after the game is created.

| Property | Type | Description |
|----------|------|-------------|
| `scene` | `THREE.Scene` | The active Three.js scene |
| `camera` | `THREE.Camera` | The active camera |
| `renderer` | `THREE.WebGLRenderer \| WebGPURenderer` | The active renderer |
| `physics` | `IPhysics` | Physics engine interface |
| `animationController` | `AnimationController` | Animation playback system |
| `animationGraphController` | `AnimationGraphController` | Animation graph system |
| `audioController` | `AudioController` | Audio playback system |
| `cameraControl` | `ICameraControl` | Camera control system |
| `collisionDetector` | `CollisionDetector` | Collision detection system |
| `objectPicker` | `IObjectPicker` | Object picking (raycasting) |
| `inputManager` | `InputManager` | Keyboard/gamepad input |
| `pointerEventManager` | `PointerEventManager` | Mouse/touch input |
| `behaviorManager` | `BehaviorManager` | Behavior lifecycle management |
| `lambdaManager` | `LambdaManager` | Lambda lifecycle management |
| `multiplayerState` | `IMultiplayerState` | Multiplayer synchronization |
| `player` | `THREE.Object3D \| null` | The player object (if set) |
| `discord` | `DiscordService` | Discord integration |

### Example: Direct physics access

```javascript
this.update = function(deltaTime) {
    const physics = this.game.physics;
    if (physics) {
        // Use physics API directly for advanced operations
        physics.setPlayerPosition(this.target.uuid, new THREE.Vector3(0, 5, 0));
    }
};
```

### Example: Camera control

```javascript
this.onStart = function() {
    const cameraControl = this.game.cameraControl;
    if (cameraControl) {
        cameraControl.updateCameraOptions();
    }
};
```

### Example: Input handling

```javascript
this.update = function(deltaTime) {
    const input = this.game.inputManager;
    if (input.isPressed("jump")) {
        // Handle jump
    }
};
```

---

## When to Use erth.* vs GameManager

| Task | Use `this.erth` | Use `this.game` |
|------|----------------|-----------------|
| Create GameObjects dynamically | `erth.object` + `erth.scene` | -- |
| Manage assets | `erth.asset` | -- |
| Global shared data | `erth.store` | -- |
| Query behaviors | `erth.behaviors` | -- |
| Query/register lambdas | `erth.lambdas` | `game.lambdaManager` |
| Configure physics before adding to scene | `gameObject.physics.configure()` | -- |
| Runtime physics (forces, velocity) | `gameObject.physics.getBody()` | `game.physics` |
| Play animations | -- | `game.playBlendedAnimations()` |
| Play sounds | -- | `game.playSound()` |
| Camera manipulation | `erth.camera` (basic) | `game.cameraControl` (full) |
| Collision detection | -- | `game.collisionDetector` |
| Input handling | -- | `game.inputManager` |
| Object picking/raycasting | -- | `game.objectPicker` |
| AI model generation | `erth.ai` | -- |
| Check game state | -- | `game.isGameStarted()` |

**Rule of thumb:** Start with `this.erth`. It provides a clean, typed API that covers most common tasks. Reach for `this.game` only when you need engine-level access that `erth` does not expose.

---

## Game Lifecycle Summary

Understanding the full lifecycle helps you know when properties are available:

1. **Game Created** -- GameManager loads behaviors and lambdas. Engine subsystems (`scene`, `camera`, `renderer`, `physics`) become available.
2. **Game Started** (`game.start` event) -- Behaviors are initialized in priority order. `isGameStarted()` returns `false` until initialization completes.
3. **Game Running** -- `update(deltaTime)` is called every frame on GameManager, which calls `update()` on BehaviorManager, LambdaManager, CollisionDetector, InputManager, and ObjectPicker.
4. **Game Paused** (`game.pause` event) -- Updates stop. Physics freezes.
5. **Game Resumed** (`game.resume` event) -- Updates restart. Physics unfreezes.
6. **Game Finished** -- Triggered when lives, health, time reach 0, or max score is reached. The game stops and behaviors/lambdas are disposed.

---

## Common Mistakes

- **Modifying score/lives/health directly** -- Game state events (`game.score.inc`, etc.) are processed by GameManager to check win/lose conditions and update the HUD. Do not modify `this.game.score` directly.
- **Using GameManager for tasks erth handles** -- `this.erth` is the preferred API for object creation, store access, and behavior queries. GameManager is the escape hatch for advanced needs.
- **Accessing engine components before game.start** -- Properties like `scene`, `camera`, and `physics` are only available after the game is created. Check for `null`/`undefined` before using them.
- **Calling addObject without await** -- `addObject` is async because it initializes behaviors and physics. Forgetting to await can cause race conditions.

## Next Steps

- Read [Erth Interface](01-erth-interface.md) for the primary behavior API.
- See [Built-in Events Reference](02-eventbus.md) for the full catalog of engine events.
- Explore [GameObject API](05-gameobject-api.md) for physics and object manipulation.
