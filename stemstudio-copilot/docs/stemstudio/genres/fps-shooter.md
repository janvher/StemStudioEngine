# Genre Playbook: FPS / Shooter

> **Load when:** the game is a first-person shooter, arena shooter, or any primarily gun-based combat game.

## Preserve First

- Aiming and shooting feel (sensitivity, recoil, fire rate)
- Weapon switching and reload timing
- Hit feedback (visual + audio)
- Movement speed and strafe feel
- Health/armor/ammo economy

## Stem Defaults

| System | Built-in | Custom |
|--------|----------|--------|
| Camera | FIRST_PERSON | Always custom for FPS (mouse look, recoil) |
| Movement | `character` | May need custom for strafe/sprint/slide |
| Projectiles | `projectile` | Use built-in, configure speed/gravity/spread |
| Combat | `erth.combat` | Use for damage calculation |
| Enemies | `enemy` | Basic AI; custom for advanced patrol/flanking |
| Audio | `genericSound` | Weapon SFX, impact sounds |

## When Custom Code Is Likely Needed

- First-person camera with mouse look, recoil, and ADS (aim down sights)
- Weapon system (switching, ammo, reload state machine)
- Hit registration (raycasting for hitscan weapons)
- Advanced enemy AI (cover, flanking, squad behavior)
- HUD (crosshair, health, ammo, kill feed)

## Camera

Always custom. First-person camera locked to player head bone or position. Must handle:
- Mouse sensitivity (configurable)
- Vertical look limits (typically -89 to +89 degrees)
- Recoil animation (temporary upward kick on fire)
- ADS zoom (FOV change on right-click)

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `fps-shooter`. Summary:

- **Gravity:** `-9.81`.
- **Player:** `Dynamic` capsule with `character`. `rotationLock:{x:true,y:false,z:true}`.
- **Environment:** `Static` `concaveHull` for level geometry, `box` for simple corridors. `bounciness_preset:"Concrete"`.
- **Projectile weapons (rockets, grenades, arrows):** `Dynamic` `sphere`. `bounciness_preset:"Metal"` for rockets/bullets, `"Rubber"` for grenades. Pool via `erth.pool`.
- **Hitscan weapons:** pure raycast — no physics body.
- **Pitfall — bullet drop:** `projectile` behavior reads scene gravity. For zero-drop slow projectiles, override per-projectile; do **not** zero scene gravity.

## Touch

NOT recommended for FPS without significant control adaptation. If required:
- Virtual joystick for movement
- Touch area for look (right side of screen)
- Fire button, ADS button, reload button
- Auto-aim assist strongly recommended

## Ask the User When

- Weapon balance would materially change from source
- Hitscan vs projectile choice is ambiguous
- Multiplayer is expected (significantly changes architecture)
- Mobile support is required (FPS on touch is challenging)

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** player (first-person), ground plane, 3-5 obstacles for cover, 2 enemies, 1 weapon, ammo pickup, health pickup
- **Essential behaviors/lambdas:** custom FPS camera behavior, custom weapon system, `projectile` for projectile weapons, `erth.combat` for damage, `enemy` for basic AI
- **Suggested .stemscript skeleton:** create Player with FPS camera + weapon system, create enemies with combat AI, create pickups with consumable, create environment
- **Asset requirements:** weapon models, enemy models, environment models, crosshair texture, SFX (gunshot, reload, impact, hit)

## Common Pitfalls

1. Using built-in third-person camera for FPS — must be fully custom first-person
2. Frame-rate dependent mouse sensitivity — multiply by deltaTime or use fixedUpdate
3. Hitscan raycast not accounting for camera vs weapon barrel offset — causes aiming inconsistency
4. Projectile pooling not used — rapid fire creates GC pressure. Use `erth.pool`
5. Enemy AI too simple — standing still and shooting is not engaging. Add patrol + cover seeking

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| mouseSensitivity | number | 2.0 | 0.1-10 | Mouse look sensitivity |
| fireRate | number | 10 | 1-30 | Rounds per second |
| recoilAmount | number | 0.02 | 0-0.1 | Vertical recoil per shot (radians) |
| moveSpeed | number | 8 | 3-20 | Player movement speed |
| sprintMultiplier | number | 1.5 | 1-3 | Sprint speed multiplier |
| maxHealth | number | 100 | 50-200 | Player max health |
| weaponDamage | number | 25 | 1-100 | Base weapon damage |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Projectiles | `projectile` | speed, gravity, damage, spread |
| Enemy base AI | `enemy` | enemyType, health, engageDistance |
| Pickups | `consumable` | healthAmount, ammoAmount |
| Sound effects | `genericSound` | Per-weapon and impact sounds |
| Animations | `animation` | Reload, fire, idle clips |
