# Genre Playbook: Puzzle / Exploration

## Preserve First

- puzzle rules and clarity
- camera readability
- interaction prompts
- progression and gating logic
- spatial relationships between puzzle elements

## Stem Defaults

- `trigger`, `teleport`, `objectInteractions`, and UI prompts are often useful
- UIKit is important when the puzzle depends on readable feedback or instructions
- touch support is often viable when precision demands stay moderate

## When Custom Code Is Likely Needed

- bespoke puzzle rules
- custom object state logic
- camera logic that reveals puzzle structure
- progression systems tied to world state

## Ask the User When

- puzzle readability depends on unsupported rendering or camera tricks
- a simplification would change the puzzle itself
- interaction precision exceeds the default input model

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** player character, enclosed room/area, 2-3 interactive objects, 1 puzzle mechanism, exit/goal
- **Essential behaviors/lambdas:** `character` for movement, `objectInteractions` for puzzle objects, `trigger` for puzzle state, `enableDisable` for revealing/hiding elements
- **Custom needed:** puzzle state manager, interaction feedback behavior
- **Asset requirements:** environment models, interactive object models, ambient audio, UI for hints/inventory
- **Recommended built-ins:** `character`, `objectInteractions`, `trigger`, `enableDisable`, `genericSound`, `animation`, `touchControls`

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `puzzle-exploration`. Summary:

- **Gravity:** `-9.81` (or `0` for zero-G puzzles).
- **Player:** `Kinematic` capsule when puzzles need precise repeatable position; `Dynamic` for general exploration. `rotationLock:{x:true,y:false,z:true}`.
- **Puzzle blocks (Sokoban-style):** `Dynamic` `box`. `bounciness_preset:"Plastic"` (low restitution, low friction → reliable rest position).
- **Walls / floor:** `Static` `box`. `bounciness_preset:"Wood"` or `"Concrete"`.
- **Pitfall — block slides forever:** with `Custom` preset, `rollingFriction` defaults to 0. Use `Plastic` preset or set `rollingFriction:0.1+`.
- **Pitfall — puzzle state breaks on re-entry:** physics state is not in `erth.store`. Persist puzzle state via store keys; re-apply via `setOrigin` on re-enter.

## Common Pitfalls

1. Puzzle state not resilient to re-entry — use `erth.store` to persist solved state within session
2. Interaction range too small — players get frustrated trying to activate objects
3. Camera obscures puzzle elements in tight spaces — needs configurable or context-aware framing
4. Missing feedback on puzzle progress — visual/audio cues are critical for player understanding
5. Exploration pacing too slow — balance movement speed with environment density

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| interactionRange | number | 2 | 0.5-5 | Object interaction distance |
| moveSpeed | number | 4 | 1-10 | Player movement speed |
| cameraDistance | number | 8 | 3-20 | Camera distance |
| hintDelay | number | 30 | 10-120 | Seconds before showing hint |
| ambientVolume | number | 0.5 | 0-1 | Background audio volume |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Player movement | `character` | Slower walkSpeed for exploration |
| Object interaction | `objectInteractions` | pickUp, push, pull |
| Triggers | `trigger` | Puzzle state conditions |
| Enable/disable | `enableDisable` | Show/hide puzzle elements |
| Sound effects | `genericSound` | Ambient, puzzle solve SFX |
| Animations | `animation` | Door open, lever pull |
| Touch controls | `touchControls` | Standard + interaction button |
