# Genre Playbook: Turn-Based Strategy

> **Load when:** the game features turn-based combat, grid/hex movement, tactical unit positioning, or squad-level strategy.

## Preserve First

- Turn order and initiative system
- Action point economy per turn
- Movement range calculation and visualization
- Attack range, damage, and unit counters
- Unit variety and faction balance

## Stem Defaults

| System | Built-in | Custom |
|--------|----------|--------|
| Camera | Top-down/isometric (custom) | Smooth pan to active unit, zoom |
| Grid | None | Always custom grid/hex system |
| Combat | `erth.combat` | WC3 damage matrix fits well for unit counters |
| Teams | `erth.team` | Faction queries and allegiance |
| Turn system | None | Always custom turn manager |
| AI | None | Custom opponent AI (heuristic or minimax) |

## When Custom Code Is Likely Needed

- Turn manager (turn order, phase transitions, end-turn logic)
- Grid or hex system (tile data, pathfinding, range calculation)
- Movement range visualization (highlight valid tiles)
- Action point tracker (per-unit budget each turn)
- AI opponent (minimax, heuristic evaluation, difficulty scaling)
- Unit selection and command UI (move, attack, ability, wait)

## Camera

Fixed top-down or isometric. Smooth pan to the active unit on turn start. Optional zoom with scroll wheel. No free rotation unless the source has it. Double-click unit to center camera.

## Touch

Use the built-in `touchControls` behavior plus `game.inputManager` patterns. Turn-based strategy works well on touch:
- Tap to select unit
- Tap valid tile to move
- Tap enemy in range to attack
- Pinch to zoom, drag to pan
- Long press for unit info tooltip

## Ask the User When

- Grid vs hex vs free positioning is unclear from source
- AI difficulty expectations (casual vs competitive depth)
- Multiplayer turn handling (hot-seat, async, real-time turns)
- Unit roster size significantly affects scope

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** grid ground plane, 3 unit types per side, 2 teams/factions, turn indicator UI, action buttons (move, attack, wait, end turn)
- **Essential behaviors/lambdas:** custom turn manager, custom grid system with pathfinding, `erth.combat` for damage with type matrix, `erth.team` for faction queries, custom command UI
- **Suggested scene/behavior skeleton:** create grid ground, create units for each team with combat stats, attach turn manager lambda, configure `erth.combat` damage matrix, create HUD with turn indicator and action buttons
- **Asset requirements:** unit models (per type per faction), grid/hex tile textures, highlight overlays (move range, attack range), UI elements (turn banner, action panel)

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `turn-based-strategy`. Summary:

- **Gravity:** `0`. Units snap to grid cells; they don't fall.
- **No physics-driven units.** Turn-based games run logic deterministically; physics is irrelevant for gameplay. **Disable physics on units entirely** unless ragdoll death animations are required.
- **Grid / board:** `Static` `box` only if you need camera click-raycast for tile selection. `bounciness_preset:"Ground"`.
- **Pitfall — engine-driven unit movement breaks turn determinism.** Always tween/animate; never `applyCentralImpulse`.
- **Pitfall — defaulting to gravity `-9.81`:** explicitly run `set_physics_engine --type ammo --gravity 0` at scene init.

## Common Pitfalls

1. Not using `fixedUpdate` for turn resolution — turn logic should be deterministic and frame-rate independent
2. Movement visualization not showing valid tiles — critical for player understanding of available moves
3. Damage type/armor type matrix not leveraged — the WC3 matrix in `erth.combat` is ideal for unit counter systems
4. AI computation taking too long — keep AI evaluation under 100ms per turn to avoid perceived lag
5. Turn state not centralized — use a single turn manager behavior with `erth.store` for cross-system visibility of whose turn it is

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| gridWidth | number | 8 | 4-20 | Grid width in tiles |
| gridHeight | number | 8 | 4-20 | Grid height in tiles |
| actionPointsPerTurn | number | 3 | 1-10 | Action points each unit gets per turn |
| moveCostPerTile | number | 1 | 1-3 | AP cost to move one tile |
| baseDamage | number | 10 | 1-50 | Base attack damage |
| unitBaseHealth | number | 50 | 10-200 | Base unit health |
| turnTimeLimit | number | 0 | 0-120 | Seconds per turn (0 = unlimited) |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Damage calculation | `erth.combat` | Configure damage/armor type matrix |
| Faction management | `erth.team` | Team IDs, allegiance queries |
| Sound effects | `genericSound` | Attack, move, select, death SFX |
| Unit animations | `animation` | Idle, walk, attack, hit, death clips |
| Win/lose conditions | `trigger` | All enemies defeated, king captured, etc. |
