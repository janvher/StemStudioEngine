---
name: stemstudio-input-manager
description: Handle keyboard, gamepad, mobile/touch, vehicle, flight, and player-control input in Studio 3D behaviors using InputManager and touchControls. Use for reading player input, default bindings, mobile controls, WASD movement, flight/vehicle controllers, landing/control feel, or mapping gameplay to supported actions and motions.
---

# Studio 3D InputManager - Keyboard, Gamepad, And Touch Input

Guide for reading player input in Studio 3D behaviors using InputManager. For gameplay controls, keyboard, gamepad, and mobile/touch parity must be planned together.

## What is InputManager?

InputManager abstracts raw keyboard, mouse, gamepad, and touch input into two concepts:

- **Actions** - Boolean triggers. `getAction("jump")` returns `true` when the action is active.
- **Motions** - Scaled numeric values. `getMotion("forward")` returns a number such as `1`, `-1`, or `0`.

This lets behaviors read gameplay intent without caring which specific device produced it.

## Accessing InputManager

InputManager is available via closure-captured `game.inputManager`:

```javascript
let game;

this.init = function(_game) {
    game = _game;
};
```

## Behavior-Safe InputManager API

**Only these methods are safe to call from generated behaviors.**

Do not call `setBindingFromMaps()`, `setBindings()`, `isKeyDown()`, `isKeyPressed()`, or `isKeyUp()` from behavior code. They are not part of the behavior-safe API and may be absent from the engine/runtime exposed to generated behaviors.

```typescript
interface InputManager {
    /** Returns true if the action is currently active, false otherwise. */
    getAction(actionId: string): boolean;

    /** Returns 0 if the motion is inactive/unknown, otherwise returns the combined scale value. */
    getMotion(motionId: string): number;

    /** Returns absolute pointer position, or movement deltas while pointer lock is active. */
    getMouseTouchPosition(): { x: number, y: number, isRelative?: boolean };

    pause(): void;
    resume(): void;
}
```

## Default Bindings

Generated gameplay should use the built-in action and motion names below. These defaults cover keyboard, gamepad, mouse, and virtual/touch controls when the matching controls are configured in the scene.

### Default Keyboard Bindings

| Key Code | Binding | Type |
|----------|---------|------|
| `KeyW` / `ArrowUp` | `forward` (scale: 1) | Motion |
| `KeyS` / `ArrowDown` | `forward` (scale: -1) | Motion |
| `KeyA` / `ArrowLeft` | `lateral` (scale: -1) | Motion |
| `KeyD` / `ArrowRight` | `lateral` (scale: 1) | Motion |
| `Space` | `jump` | Action |
| `ShiftLeft` | `run` | Action |
| `ControlLeft` | `crouch` | Action |
| `KeyE` | `use` | Action |
| `KeyF` | `drop` | Action |
| `KeyR` | `reload` | Action |

### Default Mouse, Touch, And Gamepad Bindings

| Source | Binding |
|--------|---------|
| left mouse button | `primary` action |
| right mouse button | `secondary` action |
| mouse move X | `view_x` motion. This currently accumulates until consumed; do not assume automatic per-frame reset. |
| mouse move Y | `view_y` motion. This currently accumulates until consumed; do not assume automatic per-frame reset. |
| virtual joystick `"move".x` | `lateral` motion |
| virtual joystick `"move".y` | `forward` motion |
| virtual button `"run"` | `run` action |
| virtual button `"jump"` | `jump` action |
| virtual button `"interact"` | `use` action |
| virtual axis `"steer".x` | `steer` motion when supported by the engine/layout |
| gamepad left stick | `lateral` / `forward` motions |
| gamepad right stick | `view_x` / `view_y` motions |
| gamepad buttons | `jump`, `crouch`, `use`, `reload`, `secondary`, `primary`, `drop`, `run` |

## Choosing Actions And Motions

Prefer the documented default names:

- Movement: `forward`, `lateral`, `steer`
- Camera/look: `view_x`, `view_y` only with the caveat below
- Common actions: `jump`, `run`, `crouch`, `use`, `drop`, `reload`, `primary`, `secondary`

Do not invent desktop-only action names such as `dash`, `ability`, `weapon1`, or `changeColor` and then read them with `getAction()`. If the runtime has no binding for that name, it returns `false` forever.

For generated games:

- Reuse a default action when it fits the mechanic, e.g. `use` for interact/change/activate, `primary` for fire/confirm, `secondary` for aim/cancel, `drop` for discard, `reload` for reset/reload.
- If a game truly needs extra named controls, tell the user the current behavior-safe API does not expose custom keyboard binding setup and ask whether to map the mechanic onto a default action, UI button, touchControls button/event, or a built-in behavior.
- Do not call custom binding methods as a workaround.

## Mobile And Touch Controls

Use the built-in singleton behavior `touchControls` for mobile/tablet gameplay. Attach it once to the scene host, usually `Default Scene`, after the player, camera, and primary movement behavior exist.

- Joystick dispatches virtual axis `"move"` and virtual button `"run"`.
- Steering wheel dispatches virtual axis `"steer"`.
- Buttons dispatch `"jump"`, `"interact"`/`use`, or a configured virtual input/event.
- Every meaningful keyboard/gamepad action in a generated game needs a touch equivalent unless the user explicitly chooses desktop-only.
- If a touch layout cannot express the mechanic cleanly, ask before omitting mobile controls.

Common layouts:

- Character/platformer/action: joystick + jump/interact/primary buttons.
- Racing/vehicle: steering wheel or joystick + brake/boost/reset buttons mapped to supported defaults where possible.
- Flight: joystick for pitch/roll or throttle/roll, plus buttons for brake/gear/reset/camera; include a landing/reset path.

Touch is not a magic replacement for desktop input. Do not claim a behavior is mobile-ready just because it reads `forward` and `lateral`; confirm the `touchControls` behavior is attached and configured.

## Forward Direction And Axis Convention

StemStudio follows Three.js: **-Z is forward**, +X is right, +Y is up. W maps to `motion("forward", +1)` and S to `-1`, so a positive `forward` reading must move the controlled object in **-Z** or its local equivalent under the object's rotation.

Two canonical patterns for custom controllers:

```javascript
// Axis-aligned movement: top-down, side-scroller, simple WASD movement.
this.target.position.z -= forward * speed * deltaTime;
this.target.position.x += lateral * speed * deltaTime;
```

```javascript
// Direction-vector movement: flight, vehicle, free-look, or object-local movement.
const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.target.quaternion);
this.target.position.addScaledVector(dir, forward * speed * deltaTime);
```

If W appears to move the model backward in play test, the bug is almost always the model's authored forward direction or the controller's rotation step, not the input sign. Do not flip W or negate the `forward` reading to hide that bug.

Do not copy `BipedalControl`'s internal `Vector3(Math.sin(angle), 0, Math.cos(angle))` math. That is the built-in `character` controller doing camera-relative steering with its own `invertForwardDirection` escape hatch. Custom controllers must follow the -Z convention above.

## How Actions Work

- Multiple devices can map to the same action name.
- `getAction()` returns `true` while any bound source for that action is active.
- Actions are immediate: they activate on press and deactivate on release.
- Unknown/unbound action names return `false`.

## How Motions Work

- Multiple devices can map to the same motion name with different scale values.
- `getMotion()` returns the sum of all active scales for that motion.
- If `KeyW` (scale: 1) and `KeyS` (scale: -1) are both pressed, `getMotion("forward")` returns `0`.
- If only `KeyW` is pressed, `getMotion("forward")` returns `1`. If only `KeyS` is pressed, it returns `-1`.
- Unknown/unbound motion names return `0`.

## Reading Input In update()

Always read input in `update()` or `fixedUpdate()`:

```javascript
let game;

this.init = function(_game) {
    game = _game;
};

this.update = function(deltaTime) {
    if (!game || !game.inputManager || !this.target) return;

    const forward = game.inputManager.getMotion("forward");
    const lateral = game.inputManager.getMotion("lateral");
    const speed = game.inputManager.getAction("run") ? 10 : 5;

    if (forward || lateral) {
        this.target.position.x += lateral * speed * deltaTime;
        this.target.position.z -= forward * speed * deltaTime;
    }

    if (game.inputManager.getAction("jump")) {
        // Handle jump.
    }

    if (game.inputManager.getAction("use")) {
        // Handle interaction.
    }

    if (game.inputManager.getAction("primary")) {
        // Handle primary action/fire.
    }

    const pos = game.inputManager.getMouseTouchPosition();
    // pos.x and pos.y are screen coordinates, or movement deltas if pointer lock is active.
};
```

## Mouse Look Caveat

`view_x` and `view_y` are not safe automatic per-frame deltas today. For camera feel, prefer built-in camera/character behavior settings. For FPS/free-look custom controllers, use a narrowly scoped raw pointer listener only when necessary, clean it up in `dispose()`, and provide a touch/gamepad equivalent or ask before shipping desktop-only look controls.

## Complete Example: Default Movement + Actions

```javascript
let game;
let jumpWasDown = false;
let useWasDown = false;

this.init = function(_game) {
    game = _game;
};

this.update = function(deltaTime) {
    if (!game || !game.inputManager || !this.target) return;

    const speed = game.inputManager.getAction("run") ? 10 : 5;
    const forward = game.inputManager.getMotion("forward");
    const lateral = game.inputManager.getMotion("lateral");

    if (forward || lateral) {
        this.target.position.x += lateral * speed * deltaTime;
        this.target.position.z -= forward * speed * deltaTime;
    }

    const jumpDown = game.inputManager.getAction("jump");
    if (jumpDown && !jumpWasDown) {
        // Fired once on press, not every frame.
        game.behaviorManager.sendEventToObjectBehaviors(this.target, "player-jumped", {
            source: this.target.name,
        });
    }
    jumpWasDown = jumpDown;

    const useDown = game.inputManager.getAction("use");
    if (useDown && !useWasDown) {
        // Use KeyE / interact for activate, color change, pickup, etc.
        game.behaviorManager.sendEventToObjectBehaviors(this.target, "player-used", {
            source: this.target.name,
        });
    }
    useWasDown = useDown;
};
```

## Vehicle And Flight Input

For physics-adjacent movement, read input in `fixedUpdate(fixedDeltaTime)` and keep +`forward` mapped to local -Z.

```javascript
let game;

this.init = function(_game) {
    game = _game;
};

this.fixedUpdate = function(fixedDeltaTime) {
    if (!game || !game.inputManager || !this.target) return;

    const throttle = game.inputManager.getMotion("forward");
    const steer = game.inputManager.getMotion("steer") || game.inputManager.getMotion("lateral");
    const brake = game.inputManager.getAction("secondary") || game.inputManager.getAction("drop");
    const boost = game.inputManager.getAction("run");

    // Apply vehicle/flight movement using the supported physics or transform API.
};
```

For flight/vehicle games, provide landing/brake/reset controls and choose kinematic vs dynamic movement intentionally.

## Detecting A Single Press

`getAction()` returns `true` every frame the action is held. To detect a single press, track previous state:

```javascript
let game;
let jumpWasDown = false;

this.init = function(_game) {
    game = _game;
};

this.update = function(deltaTime) {
    if (!game || !game.inputManager || !this.target) return;

    const jumpDown = game.inputManager.getAction("jump");
    if (jumpDown && !jumpWasDown) {
        game.behaviorManager.sendEventToObjectBehaviors(this.target, "player-jumped", {
            source: this.target.name,
        });
    }
    jumpWasDown = jumpDown;
};
```

## Common Key Codes

Generated behaviors should not bind raw keys directly, but these are the default keyboard sources behind the documented actions/motions:

| Key | Code |
|-----|------|
| W / A / S / D | `KeyW` / `KeyA` / `KeyS` / `KeyD` |
| Arrow keys | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` |
| Space | `Space` |
| Shift | `ShiftLeft` |
| Control | `ControlLeft` |
| E / F / R | `KeyE` / `KeyF` / `KeyR` |

## Important Notes

- **Use defaults first** - Generated games should read the built-in bindings (`forward`, `lateral`, `jump`, `run`, `use`, `primary`, etc.) instead of trying to create a custom keyboard map.
- **Do not call custom binding methods** - `setBindingFromMaps()` and `setBindings()` are not behavior-safe APIs.
- **Mouse view deltas are not auto-reset** - `view_x`/`view_y` currently accumulate until a consumer handles them; do not build camera code that assumes automatic per-frame reset.
- **macOS Meta key caveat** - On macOS, keys held while Command (Meta) is pressed may not fire `keyup`; the engine avoids stuck inputs by ignoring Meta-modified keydown events.
- **Auto-cleanup of stuck inputs** - The engine automatically clears inputs that have not been refreshed within 200ms, preventing stuck keys from tab switching or focus loss.
- **Touch support is explicit** - Mobile gameplay needs a configured `touchControls` behavior. Do not assume desktop controls automatically work on phones.
- **Flight/vehicle support** - Use `fixedUpdate` for physics-adjacent movement, keep positive `forward` mapped to local -Z, provide landing/brake/reset controls, and choose kinematic vs dynamic movement intentionally.

## When Things Go Wrong

- **"Action never fires"** - Verify the behavior is reading a documented default action name. Unknown names return `false`.
- **"Motion returns 0"** - Verify the behavior is reading `forward`, `lateral`, or another documented default motion. Unknown names return `0`.
- **"W moves backward"** - Fix model orientation or controller rotation math. Do not invert the `forward` reading.
- **"Works on keyboard but not phone"** - Attach/configure `touchControls`, use default virtual names where possible, and add touch buttons/events for every custom action.
- **"Plane flies but cannot land"** - Add ground detection, stall/takeoff speed, brake/spoiler or reset action, and a safe on-ground state instead of only applying airborne velocity.

## See Also

- **stemstudio-game-engine** - GameManager reference (parent of InputManager)
- **stemstudio-behaviors** - Writing behaviors that read input; use `game.behaviorManager.sendEventToObjectBehaviors` to send events based on input
