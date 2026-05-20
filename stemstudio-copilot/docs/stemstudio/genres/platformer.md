# Genre Playbook: Platformer

## Preserve First

- movement feel
- jump arc and landing readability
- camera readability
- platform timing
- collectibles, gates, and progression

## Stem Defaults

- built-in `character` is a strong starting point
- built-in `trigger` works well for gates, checkpoints, and progression
- built-in `consumable` is often enough for basic pickups
- touch controls are usually appropriate

## When Custom Code Is Likely Needed

- source-specific jump feel or air control
- advanced camera behavior
- procedural animation tied to movement feel
- moving platform timing beyond built-in expectations

## Camera

- built-in camera is fine when it preserves readability
- use custom camera behavior if framing or follow timing is core to play feel

## Touch

Use the built-in `touchControls` behavior plus `game.inputManager` patterns, usually joystick + jump.

## Ask the User When

- jump feel changes materially
- side-on vs third-person framing changes the experience
- source progression depends on camera or movement nuance

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** player capsule/character, ground plane, 3-5 platforms at varying heights, 1 collectible, 1 goal trigger
- **Essential behaviors/lambdas:** `character` behavior on player, `platform` for moving platforms, `consumable` for collectibles, `trigger` for goals, `touchControls` on Default Scene
- **Suggested scene/behavior skeleton:** create Player group with character behavior, create platforms with platform behavior, create collectibles with consumable behavior, create goal with trigger behavior
- **Asset requirements:** character model, platform models/textures, collectible model, background skybox
- **Recommended built-ins:** `character`, `platform`, `consumable`, `trigger`, `touchControls`, `genericSound`, `animation`

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" table — row `platformer`. Summary:

- **Gravity:** `-20` (range `-50..-5`).
- **Player:** `Dynamic` or `Kinematic` capsule. Lock rotation: `rotationLock:{x:true,y:false,z:true}`.
- **Platforms / ground:** `Static` `concaveHull` (or `box`). `bounciness_preset:"Concrete"` so jumps don't bounce — restitution 0 is critical.
- **Moving platforms:** `Kinematic` so the engine doesn't apply gravity but they still push Dynamic bodies on top.
- **Pitfall:** restitution > 0 on platforms → player skips on landing. Always pin platform restitution to 0 (Concrete preset).

## Common Pitfalls

1. Forgetting `tag=Player` on the player object — character controller won't work
2. Platform collision shape too thin — player falls through. Use capsule or box with sufficient height
3. Jump height/gravity mismatch — test early. Source values are sacred in conversion
4. Camera too close in tight platforming sections — expose camera distance as configurable
5. Missing ground check — character may double-jump indefinitely without proper grounding

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| jumpHeight | number | 2.0 | 0.5-10 | Maximum jump height in units |
| gravity | number | -20 | -50 to -5 | Gravity acceleration |
| moveSpeed | number | 5 | 1-20 | Horizontal movement speed |
| cameraDistance | number | 10 | 3-30 | Camera distance from player |
| cameraHeight | number | 5 | 1-15 | Camera height above player |
| doubleJump | boolean | false | — | Enable double jump |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Player movement | `character` | Set walkSpeed, runSpeed, jumpHeight |
| Moving platforms | `platform` | Configure move path and speed |
| Collectibles | `consumable` | Set pointAmount or custom inventoryType |
| Checkpoints | `trigger` | Use with enableDisable for respawn |
| Sound effects | `genericSound` | Attach to player for jump/land SFX |
| Touch controls | `touchControls` | Attach to Default Scene |
| Animations | `animation` | Attach to character for idle/run/jump |
