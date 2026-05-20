# Genre Playbook: Collectathon

## Preserve First

- movement and camera readability
- collectible loop
- score or progression gates
- world traversal flow
- hub world or unlock routing

## Stem Defaults

- `character`, `trigger`, and `consumable` are often strong starting points
- region or hub routing can map well to teleports and shared meta-state
- touch controls are usually appropriate

## When Custom Code Is Likely Needed

- source-specific progression rules
- collectible side effects
- custom camera feel
- bespoke UI flow for counters, unlocks, or hub selection

## Routing

If the original has hub-world progression, plan zone routing, teleports, and shared progression state explicitly before building.

## Ask the User When

- progression gates are central to the experience
- hub-world flow is ambiguous
- collecting changes more than score and unlock state

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** player character, hub area with paths to 2-3 zones, 10+ collectibles, score display
- **Essential behaviors/lambdas:** `character` for player, `consumable` for collectibles, `trigger` for zone transitions, `teleport` for hub connections
- **Custom needed:** collection tracker behavior, hub progression manager
- **Asset requirements:** character model, collectible models (multiple types), environment models, UI elements
- **Recommended built-ins:** `character`, `consumable`, `teleport`, `trigger`, `enableDisable`, `genericSound`, `touchControls`

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `collectathon`. Summary:

- **Gravity:** `-9.81`.
- **Player:** `Dynamic` capsule with `character`. `rotationLock:{x:true,y:false,z:true}`.
- **Environment:** `Static` `concaveHull` for terrain, `box` for simple platforms. `bounciness_preset:"Ground"`.
- **Collectibles:** **NOT physics rigid bodies.** Use invisible `trigger` zones with `consumable` behavior — distance-based pickup is cheaper than physics callbacks.
- **Pitfall — physics on every collectible:** in a 50–500 collectible game, that's hundreds of bodies for no benefit.

## Common Pitfalls

1. Collectible state not persisted across zones — use `erth.store` to track collected items
2. Hub progression gates not reflecting collected counts — bind gate triggers to store values
3. Too many unique collectible models hurting performance — use instancing or shared geometries
4. Camera not adjusted per zone type — open areas need wider FOV than tight corridors
5. Missing collection feedback — sound + VFX on pickup are essential for satisfying feel

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| totalCollectibles | number | 50 | 10-500 | Total collectibles in game |
| collectRange | number | 1.5 | 0.5-5 | Pickup detection radius |
| requiredToUnlock | number | 10 | 1-100 | Collectibles needed per gate |
| moveSpeed | number | 6 | 2-15 | Player movement speed |
| cameraDistance | number | 12 | 5-25 | Camera follow distance |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Player movement | `character` | walkSpeed, runSpeed |
| Collectibles | `consumable` | pointAmount per type |
| Zone transitions | `teleport` | teleportTargetUuid |
| Unlock gates | `trigger` + `enableDisable` | Gate on collectible count |
| Sound effects | `genericSound` | Pickup, unlock SFX |
| Touch controls | `touchControls` | Standard movement |
