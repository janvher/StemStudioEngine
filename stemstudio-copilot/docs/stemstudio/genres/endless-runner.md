# Genre Playbook: Endless Runner

## Preserve First

- lane or movement timing
- obstacle readability
- speed curve
- jump, slide, dodge, or lane-switch response
- score and fail-loop clarity

## Stem Defaults

- session-only progression is usually correct
- touch controls are often appropriate
- simple score or fail gating can use built-ins plus lightweight custom orchestration

## When Custom Code Is Likely Needed

- lane switching
- procedural obstacle generation
- speed ramping
- procedural animation linked to pace
- swipe-like input that must be approximated

## Touch

Use the built-in `touchControls` behavior plus `game.inputManager` patterns. Ask if the design relies on gestures that do not map cleanly to the available controls.

## Ask the User When

- gesture input is core
- speed pacing or lane logic would materially change
- procedural generation is central to replayability

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** player character, 3 lane positions, procedural obstacle spawner, score counter
- **Essential behaviors/lambdas:** custom lane controller (not `character` — endless runners use constrained lane movement), `randomizedSpawner` for obstacles, custom game manager for score/speed
- **Custom needed:** lane movement behavior, obstacle/chunk generator, difficulty curve manager
- **Asset requirements:** character model, obstacle models (3-5 types), ground chunk models, UI elements
- **Recommended built-ins:** `randomizedSpawner`, `genericSound`, `animation`, `touchControls`

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `endless-runner`. Summary:

- **Gravity:** `-25`.
- **Player:** `Kinematic` capsule. Lane controller writes position; engine doesn't apply gravity. `rotationLock:{x:true,y:false,z:true}`.
- **Ground chunks / obstacles:** `Static` `box`. `bounciness_preset:"Concrete"`. Pool aggressively (`erth.pool`).
- **Pitfall:** `Dynamic` player + lane snap fights gravity → jitter. Stick to `Kinematic`.
- **Pitfall:** `concaveHull` on chunks is overkill — use `box`.

## Common Pitfalls

1. Using `character` behavior for lane movement — it allows free movement, but endless runners need snap-to-lane
2. Object pooling not used for obstacles — creates GC pressure. Use `erth.pool`
3. Speed increase not gradual — difficulty should ramp smoothly, not in steps
4. Ground chunks not seamlessly tiling — visual gaps break immersion
5. Touch swipe detection too sensitive or too sluggish — expose threshold as configurable

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| startSpeed | number | 8 | 3-20 | Initial forward speed |
| maxSpeed | number | 25 | 10-50 | Maximum forward speed |
| speedRamp | number | 0.1 | 0.01-1 | Speed increase per second |
| laneWidth | number | 2 | 1-5 | Distance between lanes |
| laneSwitchSpeed | number | 10 | 3-20 | Lane change speed |
| spawnRate | number | 1.5 | 0.5-5 | Seconds between obstacle spawns |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Obstacle spawning | `randomizedSpawner` | randomList of obstacle types |
| Sound effects | `genericSound` | Coin pickup, crash SFX |
| Animations | `animation` | Run, jump, slide clips |
| Touch controls | `touchControls` | Swipe left/right/up/down |
| Score display | (custom UIKit) | No built-in score HUD |
