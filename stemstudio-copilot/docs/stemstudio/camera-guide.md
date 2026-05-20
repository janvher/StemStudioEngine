# Camera Guide

Use this doc when camera feel materially affects readability, movement timing, combat targeting, racing flow, puzzle framing, or atmosphere.

Cross-reference:
- [commands-reference.md](commands-reference.md) for camera/editor setting commands
- [behavior-system.md](behavior-system.md) for runtime camera access
- [game-design-patterns.md](game-design-patterns.md) for genre-level system planning

## Default Rule

- Use built-in camera settings when the requested camera maps cleanly to a standard mode
- Write a custom camera behavior when look-ahead, damping, target bias, lock-on, rails, collision handling, or state-based framing materially affect play feel
- For fundamentally 2D games, default to a stable top-down or side-scroller framing
- Escalate only when the camera compromise would change gameplay in a non-obvious way

## Camera Factors to Analyze

Capture these before choosing built-in vs custom:
- follow target
- framing offset
- damping / lag
- look-ahead rules
- lock-on or target bias
- occlusion handling
- sprint, drift, jump, aim, or fall camera states
- FOV changes
- onboarding or cinematic moments driven by camera motion

## Good Built-In Targets

Prefer built-in camera setup when the game is mostly:
- standard third-person follow
- standard first-person
- simple top-down or isometric
- fixed puzzle framing
- side-scrolling platformer or fighter view

Use a custom camera behavior when the camera is part of the mechanic, not just presentation.

For player-follow cameras, the playable object must have the object tag `Player`. When building or repairing the scene through copilot tools, create the player object first, then run `modify_object` with `tag=Player` on that same object before relying on character-controller or camera-follow behavior.

## Built-In Camera Types

StemStudio exposes these common camera modes through camera settings:

| Type | Value | Best For |
|------|-------|----------|
| Third Person | `THIRD_PERSON` | Action-adventure, platformers, collectathons, survival |
| First Person | `FIRST_PERSON` | FPS, horror, immersive exploration |
| Top Down | `TOP_DOWN` | Tower defense, strategy, simulation, many 2D-to-3D retargets |
| Side Scroller | `SIDE_SCROLLER` | 2D platformers, fighting games, endless runners |
| None | `NONE` | Fully custom camera behaviors |

### Third Person

Use when a chase camera behind and above the player is good enough.

### First Person

Use when the camera should be locked to the player's head/eye position. FPS-style games usually still need custom logic on top for mouse look, recoil, or ADS.

### Top Down

Use when overhead readability matters more than camera drama.

### Side Scroller

Use when the game stays on a side-view play plane and horizontal readability is critical.

### None

Use `NONE` when a custom behavior will control the camera entirely.

## Choosing Between Built-In and Custom

Built-in is usually enough when:
- the requested feel is conventional
- there is no state-specific zoom or shake
- camera collision handling is not central to gameplay

Custom is usually required when:
- racing needs look-ahead tied to speed and steering
- combat needs lock-on or target switching
- ADS/recoil/head bob meaningfully affect feel
- the source uses rail cameras, cinematic transitions, or mechanic-specific rigs
- multiple camera rigs switch at runtime

## 2D Source Rule

When the gameplay is fundamentally 2D:
- keep the camera stable
- preserve plane readability first
- avoid introducing orbit or cinematic movement that changes timing or spatial parsing

Only choose a different framing when:
- the design is clearly side-on or isometric
- the user explicitly asks for a different retarget
- the mechanic truly depends on another framing

## Direction Convention

Three.js right-handed: **+X right, +Y up, -Z forward**. The camera's local forward is `-Z`. `camera.getWorldDirection(v)` returns the world-space look vector (already accounts for the negation), and `camera.lookAt(x, y, z)` takes a world-space target — neither needs an axis flip. For a follow rig, position the camera at `target + offset` with `offset.z > 0` to sit behind the target. See [architecture.md](architecture.md) "Coordinate Convention".

## Runtime Surfaces Available in Behaviors

Custom behaviors can use:
- `game.camera`
- `this.erth.camera.position`
- `this.erth.camera.quaternion`
- `this.erth.camera.fov`
- `this.erth.camera.near`
- `this.erth.camera.far`
- `this.erth.camera.lookAt(x, y, z)`

For authored/default camera setup, prefer camera/editor setting commands first, then add a behavior only for the delta that matters.

## Camera Access in Custom Behaviors

Always use `game.camera` to access the active camera object.

Do not use `this.target` as the camera. Camera-driving behaviors are commonly attached to `"Default Scene"` or another host object, so `this.target` is usually not the camera itself.

Correct pattern:

```javascript
let game;
let camera;

this.init = function(_game) {
  game = _game;
  camera = game.camera;
};
```

## Occlusion Handling

If the game depends on camera obstruction behavior, document and tune it deliberately.

Common strategies:
- distance push-in when blocked
- transparency/fade on occluders
- fully custom collision avoidance

If neither built-in behavior nor a simple custom follow rig preserves readability, escalate before committing to a weak approximation.

## Genre Notes

### Platformer

- preserve jump readability
- keep landing zones legible
- expose camera distance and height if level density changes

### Racing / Kart

- preserve chase distance and pitch
- use look-ahead tied to speed/turning
- support boost/drift FOV changes when they affect feel

### Action / Adventure

- preserve lock-on or interaction framing when combat/puzzles depend on it

### Puzzle / Exploration

- preserve the framing that reveals puzzle state
- avoid camera motion that hides interactables

### Side Scroller / 2D Platformer

- keep the player framed clearly on the intended play plane
- add only light vertical tracking/damping when it improves readability

## Recommended Mapping Strategy

1. Start with built-in camera settings
2. Verify whether the built-in result is already close enough
3. Add a custom behavior only for the missing pieces
4. Keep the custom behavior focused on camera logic, not general game orchestration

## Red Flags

Escalate when you find:
- multiple camera rigs with mechanic-specific switching
- target-lock cameras
- camera collision affecting movement timing
- racing/drift cameras that drive control feel
- puzzle framing dependent on unsupported visual tricks
