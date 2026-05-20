# Genre Playbook: Survival / Crafting

> **Load when:** the game features resource gathering, crafting systems, and survival mechanics such as hunger, health, shelter, or environmental hazards.

## Preserve First

- Gathering loop (resource acquisition flow and feedback)
- Crafting recipes and crafting UI flow
- Inventory management
- Survival pressure (hunger, thirst, temperature, exposure)
- Base building and placement system

## Stem Defaults

| System | Built-in | Custom |
|--------|----------|--------|
| Camera | Third-person chase (built-in or custom) | Zoom for build mode |
| Movement | `character` | Standard third-person movement |
| Day/night | `dayNightCycle` | Time progression and lighting |
| Terrain | `terrain` | World generation |
| Combat | `erth.combat` | Creature damage |
| Enemies | `enemy` | Hostile creatures |

## When Custom Code Is Likely Needed

- Inventory system (no built-in inventory)
- Crafting system (recipe matching, crafting queue)
- Resource nodes with respawn timers
- Base building / freeform placement system
- Survival stats (hunger, thirst, temperature meters)
- Tool and weapon durability

## Camera

Third-person chase camera. Default behind and above the player. Needs configurable zoom for building/crafting mode (pull camera out for broader view). Optional first-person toggle if source supports it.

## Touch

Use the built-in `touchControls` behavior plus `game.inputManager` patterns. Survival games work on touch with adaptation:
- Joystick for movement
- Tap/hold on resource node to gather
- Inventory button opens crafting/inventory overlay
- Build mode with tap-to-place and rotation controls

## Ask the User When

- Crafting complexity significantly affects scope (simple recipes vs tech trees)
- Base building is freeform vs grid-snapped
- Multiplayer shared world (persistence and sync add major complexity)
- Survival stat severity (casual vs hardcore hunger/thirst)

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** terrain with vegetation, 5 resource types (trees, rocks, bushes, ore, water source), player character, 3 craftable items, day/night cycle, 1 hostile creature, basic inventory UI
- **Essential behaviors/lambdas:** `character` for movement, `dayNightCycle` for time, `terrain` for world, custom inventory system, custom crafting system, custom resource gathering behavior, `enemy` for hostile creatures
- **Suggested scene/behavior skeleton:** create terrain, scatter resource nodes, create Player with character + inventory + survival stats, attach crafting lambda, create hostile creature spawner, configure day/night cycle, create HUD with health/hunger/inventory
- **Asset requirements:** character model, resource node models (tree, rock, bush, ore), craftable item models, creature models, terrain textures, UI elements (inventory grid, crafting panel, stat bars)

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `survival-crafting`. Summary:

- **Gravity:** `-9.81`.
- **Player:** `Dynamic` capsule with `character`. `rotationLock:{x:true,y:false,z:true}`.
- **Terrain:** `Static` `concaveHull`. `bounciness_preset:"Ground"`.
- **Resource nodes:** `Static` `concaveHull` for trees (geometry-precise), `Static` `box` for rocks/ore. `bounciness_preset:"Wood"` or `"Concrete"`. **Don't physics-enable visuals before harvest** — toggle physics on post-harvest debris.
- **Hostile creatures:** `Dynamic` capsule with `enemy`.
- **Dropped items:** `Dynamic` `box` briefly to fall + rest, then convert to pickup `trigger`. `bounciness_preset:"Plastic"`.
- **Pitfall — every harvested log is Dynamic:** 50 logs from one tree → frame budget collapses. Pool debris and cap the active count.

## Common Pitfalls

1. Inventory not using structured data (lambda `componentSchema`) — becomes unmaintainable with many item types
2. Resource respawn not pooled — use `erth.pool` for harvestable nodes that regenerate
3. Day/night cycle too fast or too slow — expose cycle duration as a configurable parameter
4. Crafting recipes hardcoded in behavior code — should be a JSON attribute array for easy content addition
5. No feedback on gathering progress — players need a progress bar, hit counter, or particle effect during gathering

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| dayLengthSeconds | number | 600 | 60-3600 | Real seconds per full day/night cycle |
| hungerDrainRate | number | 0.1 | 0.01-1 | Hunger points lost per second |
| maxHealth | number | 100 | 50-500 | Player maximum health |
| maxHunger | number | 100 | 50-200 | Player maximum hunger |
| gatherSpeed | number | 1 | 0.5-5 | Gathering speed multiplier |
| inventorySlots | number | 20 | 5-50 | Number of inventory slots |
| resourceRespawnTime | number | 120 | 30-600 | Seconds for a resource node to respawn |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Player movement | `character` | walkSpeed, runSpeed, jumpHeight |
| Time of day | `dayNightCycle` | cycleDuration, startTime |
| World terrain | `terrain` | heightScale, noiseScale, seed |
| Gathering/eating SFX | `genericSound` | Per-action sound effects |
| Food and health items | `consumable` | healthAmount, hungerAmount |
| Hostile creatures | `enemy` | health, damage, aggroRange |
| Touch controls | `touchControls` | Joystick + action buttons |
| Animations | `animation` | Gather, craft, eat, attack clips |
