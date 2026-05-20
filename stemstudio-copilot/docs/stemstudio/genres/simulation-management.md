# Genre Playbook: Simulation / Management

> **Load when:** the game is a city builder, tycoon game, factory manager, or any economy-driven simulation where the player builds and manages systems rather than directly controlling a character.

## Preserve First

- Economy balance and feedback loops (supply, demand, income, costs)
- Entity population behavior and growth
- Build/place flow and construction feedback
- Time progression and simulation tick rate
- Player feedback loops (happiness, efficiency, resource flow)

## Stem Defaults

| System | Built-in | Custom |
|--------|----------|--------|
| Camera | Top-down with zoom/pan (custom) | Orthographic recommended |
| Economy | None | Always custom economy manager |
| Placement | None | Always custom build/placement system |
| State | `erth.store` | Global simulation state |
| Per-entity data | Lambdas | `componentSchema` for per-building data |
| Time control | None | Custom time-scale manager |

## When Custom Code Is Likely Needed

- Economy manager (income, expenses, resource production/consumption)
- Entity population with AI (citizens, workers, customers)
- Build/placement system (grid snapping, placement validation, construction phases)
- Time-scale control (pause, 1x, 2x, 3x speed)
- Statistics and graphs UI (population, income, resource charts)
- Resource flow visualization (supply chains, transport)

## Camera

Top-down with smooth zoom and pan. Orthographic projection recommended for true top-down readability. Allow rotation if the source does. Double-click to center on an entity or building. Edge scrolling or drag-to-pan.

## Touch

Use the built-in `touchControls` behavior plus `game.inputManager` patterns. Management games work well on touch:
- Drag to pan the camera
- Pinch to zoom
- Tap to select building or entity
- Build mode: select from menu, tap to place
- UI buttons for time-scale control

## Ask the User When

- Simulation complexity (simple economy vs detailed production chains)
- Time-scale expectations (real-time vs accelerated)
- Entity population cap affects performance planning
- Multiplayer (competitive or cooperative management)

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** ground plane, 3 building types (e.g., house, factory, shop), resource display HUD, population counter, build menu UI, time-scale controls (pause/play/fast)
- **Essential behaviors/lambdas:** custom economy manager lambda, custom placement system behavior, custom population simulation, custom time-scale controller, UI for statistics and build menu
- **Suggested scene/behavior skeleton:** create ground plane, attach economy manager lambda, attach placement system, create initial buildings, configure HUD with currency + population + time controls, create build menu overlay
- **Asset requirements:** building models (per type, optionally per upgrade level), ground/terrain textures, citizen/entity models, UI elements (build menu, stat panels, resource icons)

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `simulation-management`. Summary:

- **Gravity:** `-9.81` (rarely matters).
- **No physics-driven player.**
- **Buildings:** **NOT physics rigid bodies.** `Static` `box` only if needed for camera click-raycast.
- **Citizens / entities:** **NOT physics rigid bodies.** Drive via lambda simulation + tweens.
- **Ground:** `Static` `concaveHull` for terrain click-raycast on uneven ground; `Static` `box` for flat plots.
- **Pitfall — physics-enabling each citizen at population 100+:** wasted CPU. Lambda-driven simulation stays cheap.
- **Pitfall — physics raycast for placement validity:** use logic / grid checks instead. Faster and deterministic.

## Common Pitfalls

1. Simulation logic running in `update` — use `fixedUpdate` for deterministic simulation ticks independent of frame rate
2. Entity count not bounded — simulations can grow unbounded and tank performance; set configurable population caps
3. Economy feedback loops not balanced — expose all economic rates (income, costs, growth) as configurable parameters for iteration
4. UI not scaling with entity count — use pagination, summary views, or aggregation instead of listing every entity
5. No time-scale control — management game players expect pause/1x/2x/3x speed controls; this is not optional

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| startingMoney | number | 10000 | 1000-100000 | Initial player currency |
| populationCap | number | 100 | 10-1000 | Maximum entity population |
| simTickRate | number | 1 | 0.1-5 | Simulation ticks per second |
| buildCostMultiplier | number | 1.0 | 0.5-3 | Global build cost scaling |
| taxRate | number | 0.1 | 0-0.5 | Income tax rate per tick |
| simSpeedMax | number | 3 | 1-10 | Maximum time-scale multiplier |
| maintenanceCost | number | 5 | 0-50 | Per-building maintenance cost per tick |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Build/demolish SFX | `genericSound` | Construction, demolish, notification sounds |
| Milestone triggers | `trigger` | Population thresholds, revenue goals |
| Construction anim | `animation` | Building construction and upgrade clips |
