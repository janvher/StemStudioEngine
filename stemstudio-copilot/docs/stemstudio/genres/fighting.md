# Genre Playbook: Fighting

> **Load when:** the game is a 1v1 or small-arena melee combat game with combos, frame timing, and hitboxes.

## Preserve First

- Frame data and timing (startup, active, recovery frames)
- Combo input windows and chains
- Hitbox/hurtbox accuracy
- Knockback and hitstun duration
- Character-specific move sets and properties

## Stem Defaults

| System | Built-in | Custom |
|--------|----------|--------|
| Camera | Fixed side-view or arena (custom) | Must keep both players in frame |
| Combat | `erth.combat` | Damage only; combo/frame logic is custom |
| Input | None | Always custom input buffer |
| Physics | Stem physics | Knockback and positioning |
| Animation | `animation` | Clip playback; custom for cancels/blends |

## When Custom Code Is Likely Needed

- Input buffer (command history with directional inputs)
- Combo state machine (chain rules, cancel windows, links)
- Hitbox/hurtbox system (independent from visual mesh)
- Frame-accurate timing (MUST use fixedUpdate for all combat)
- Knockback, hitstun, and blockstun system
- Character select screen and roster management
- Round manager (round transitions, win conditions, score)

## Camera

Fixed side-view for 2D fighters. Fixed arena camera for 3D fighters. Must keep both players in frame at all times. Custom zoom and pan to track the action as fighters move apart or close in. Avoid camera shake that obscures hit reads.

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `fighting`. Summary:

- **Gravity:** `-20` (faster than Earth — fighters need quick ground returns).
- **Fighters:** `Kinematic` capsule. Combat state machine writes position; engine should not apply gravity. Use `fixedUpdate` for frame-accurate impulse timing.
- **Arena floor + walls:** `Static` `box`. `bounciness_preset:"Concrete"` for predictable wall-bounces.
- **Knockback:** `applyCentralImpulse` if `Dynamic`; write velocity-for-duration on `Kinematic`.
- **Hitboxes/hurtboxes:** `Static` `box` registered via `addCollidableObject` + `setCollisionBehavior(uuid, "Ghost")` — Ghost bodies trigger callbacks without physics response.
- **Pitfall — `update` for combat:** physics ticks at fixed rate. Frame data MUST run on `fixedUpdate(fixedDeltaTime)`.

## Ask the User When

- Frame data fidelity requirements (frame-perfect vs approximate)
- Number of characters significantly affects scope
- Online multiplayer is expected (rollback netcode is extremely complex)
- Input notation system (numpad notation, motion inputs) needs adaptation

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** arena/stage ground, 2 fighter spawn positions, health bars, round counter, combo hit counter, timer
- **Essential behaviors/lambdas:** custom input buffer behavior, custom combo state machine, custom hitbox/hurtbox system, round manager lambda, `erth.combat` for damage numbers
- **Suggested scene/behavior skeleton:** create arena stage, create 2 fighter objects with combat behaviors, attach input buffer + combo system per fighter, create HUD with health bars + round counter + timer, attach round manager lambda
- **Asset requirements:** fighter models (per character), arena/stage model, health bar UI elements, hit effect particles, SFX (hit, block, special move, announcer)

## Common Pitfalls

1. Using `update` instead of `fixedUpdate` for combat logic — frame data MUST run on a fixed timestep for consistency
2. Input buffer not implemented — combos feel unresponsive without input buffering; players press buttons during active frames
3. Hitboxes attached to visual mesh instead of independent collision volumes — leads to unreliable hit detection
4. No hitstun/blockstun system — attacks feel weightless without frame advantage and hit confirmation
5. Round transitions not resetting state properly — leftover hitstun, position, or meter from the previous round

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| roundTime | number | 99 | 30-999 | Seconds per round |
| roundsToWin | number | 2 | 1-5 | Rounds needed to win the match |
| inputBufferFrames | number | 6 | 1-15 | Input buffer window in fixed frames |
| hitstunFrames | number | 12 | 1-30 | Base hitstun duration in fixed frames |
| blockstunFrames | number | 8 | 1-20 | Base blockstun duration in fixed frames |
| knockbackForce | number | 5 | 1-20 | Base knockback impulse strength |
| walkSpeed | number | 4 | 1-10 | Ground movement speed |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Damage numbers | `erth.combat` | Damage calculation, not combo logic |
| Sound effects | `genericSound` | Hit, block, special move, announcer SFX |
| Clip playback | `animation` | Idle, walk, attack, hit, block, special clips |
