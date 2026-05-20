# Genre Playbook: Tower Defense

> **Load when:** the game is a grid/path-based tower placement game with waves of enemies.

## Preserve First

- Tower placement flow and grid snapping
- Enemy pathing and wave pacing
- Economy balance (income, costs, upgrades)
- Upgrade progression and tower variety
- Wave escalation and difficulty curve

## Stem Defaults

| System | Built-in | Custom |
|--------|----------|--------|
| Camera | Top-down (custom) | Zoom/pan, no rotation unless source requires |
| Grid | None | Always custom grid/placement system |
| Combat | `erth.combat` | Tower damage calculation |
| Projectiles | `projectile` | Tower ranged attacks |
| Enemies | `enemy` | Basic pathing; custom for armor types |
| Pooling | `erth.pool` | Essential for enemies and projectiles |

## When Custom Code Is Likely Needed

- Grid/placement system (no built-in grid)
- Pathfinding (A* or waypoint-based if not using navmesh)
- Wave manager (spawn timing, enemy composition, escalation)
- Economy manager (income, costs, sell-back)
- Tower upgrade system (tiered upgrades, branching paths)
- Enemy variety with different armor types and abilities

## Camera

Fixed top-down with zoom and pan. Orthographic or perspective with high angle. No rotation unless the source requires it. Smooth scroll-to-zoom. Optional double-click to center on tower or enemy.

## Touch

Use the built-in `touchControls` behavior plus `game.inputManager` patterns. Tower defense works well on touch:
- Tap to select tower type from build menu
- Tap grid cell to place tower
- Pinch to zoom, drag to pan
- Tap placed tower for upgrade/sell menu

## Ask the User When

- Grid size or shape is ambiguous
- Tower variety affects scope significantly
- Enemy path is predetermined vs dynamically recalculated
- Multiplayer co-op tower defense changes economy design

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** ground plane with grid overlay, 1 enemy path with start/end, 3 tower types, 5 wave definitions, currency display HUD
- **Essential behaviors/lambdas:** custom grid manager, custom wave spawner with `erth.pool`, `erth.combat` for damage, `projectile` for ranged towers, custom economy manager
- **Suggested scene/behavior skeleton:** create ground with grid overlay, define enemy path waypoints, create tower placement zones, configure wave spawner lambda, create HUD with currency and wave counter
- **Asset requirements:** tower models (per type and upgrade level), enemy models (per type), ground/grid texture, projectile models, UI elements (build menu, upgrade panel)

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `tower-defense`. Summary:

- **Gravity:** `-9.81` (rarely matters).
- **No physics-driven player.**
- **Towers:** **NOT physics rigid bodies.** Towers don't move. Skip physics entirely.
- **Enemies:** path-following via `enemy` behavior — no physics body needed. Distance-checked targeting. Pool aggressively.
- **Projectiles (arcing tower attacks):** `Dynamic` `sphere`, `bounciness_preset:"Metal"`. Pool. For instant-hit (sniper) towers, pure raycast.
- **Ground / grid:** `Static` `box`. `bounciness_preset:"Ground"`. Used for camera click-raycast, not gameplay collision.
- **Pitfall:** physics-enabling each enemy at 100+/wave kills frame budget. Path-following + distance damage stays cheap.

## Common Pitfalls

1. Not using object pooling for enemies and projectiles — tower defense has high spawn/destroy rates, use `erth.pool`
2. Path recalculation on every tower placement — cache paths, recalculate only when grid topology changes
3. Tower targeting not prioritizing correctly — expose targeting mode (first, strongest, weakest, closest) as configurable
4. Economy balance not exposed as config — makes iteration painful during tuning
5. Wave definitions hardcoded in behavior code — should be a JSON attribute for easy content tuning

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| startingGold | number | 100 | 50-500 | Starting currency |
| towerBaseCost | number | 25 | 5-100 | Base tower placement cost |
| waveDelay | number | 10 | 5-60 | Seconds between waves |
| enemyBaseHealth | number | 50 | 10-500 | Base enemy health (scaled per wave) |
| enemyBaseSpeed | number | 3 | 1-10 | Base enemy movement speed |
| gridSize | number | 10 | 5-30 | Grid dimension (cells per side) |
| killReward | number | 10 | 1-50 | Currency earned per enemy kill |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Tower attacks | `projectile` | speed, damage, tracking vs ballistic |
| Enemy base | `enemy` | health, speed along path |
| Attack SFX | `genericSound` | Per-tower and impact sounds |
| Resource drops | `consumable` | Bonus currency drops |
| Wave triggers | `trigger` | Wave start conditions |
| Attack animations | `animation` | Tower fire animation clips |
