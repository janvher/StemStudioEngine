# Genre Playbook: Horror

> **Load when:** the game emphasizes fear, tension, atmosphere, limited visibility, or survival horror mechanics.

## Preserve First

- Atmosphere and tension pacing
- Limited resources and ammo scarcity
- Darkness and visibility control (flashlight, limited light)
- Sound design (positional audio is critical for horror)
- Jump scare timing and placement

## Stem Defaults

| System | Built-in | Custom |
|--------|----------|--------|
| Camera | First-person or over-shoulder (custom) | Subtle head bob, breathing, shake |
| Audio | `genericSound` | Positional audio essential |
| Combat | `erth.combat` | Sparse combat encounters |
| Enemies | `enemy` | Base AI; custom for stealth detection |
| Day/night | `dayNightCycle` | Perpetual darkness setting |
| Items | `consumable` | Keys, batteries, health |

## When Custom Code Is Likely Needed

- Flashlight/light management behavior (battery drain, flicker, cone angle)
- Sanity or fear system (visual distortion, audio hallucinations)
- Limited inventory (survival horror resource management)
- Enemy AI with stealth detection (sight cones, sound-reactive behavior)
- Atmosphere manager (dynamic fog, lighting shifts, ambient sound layers)
- Scripted event triggers (door slams, lights out, chase sequences)

## Camera

First-person for maximum immersion. Over-shoulder third-person as an alternative. Subtle camera effects enhance tension: head bob while walking, slight breathing sway, shake on scares. Narrow FOV (65-75) increases claustrophobia. ADS-style zoom for examining objects.

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `horror`. Summary:

- **Gravity:** `-9.81`.
- **Player:** `Dynamic` capsule with **tight radius** (~0.3) for cramped corridors. `rotationLock:{x:true,y:false,z:true}`.
- **Environment:** `Static` `concaveHull`. `bounciness_preset:"Wood"` for wooden interiors, `"Concrete"` for institutional spaces.
- **Doors:** `Dynamic` body + `jointHinge` to a `Static` frame, Wood preset, `angularLimit:{y:90}`. Slam via `applyImpulseToRigidBody` for jump-scare moments.
- **Falling-off-shelves objects:** `Dynamic` `box` or `convexHull`, `bounciness_preset:"Wood"` or `"Plastic"`. Cap dynamic count to <20 per room.
- **Pitfall — door hinge clipping:** set `collisionEnabled:false` on the joint when door + frame overlap.

## Audio

CRITICAL for horror. Positional audio is essential — the player must be able to locate sounds spatially. Use `genericSound` with `positional=true` and low `rolloffFactor` for distant ambience. Layer multiple ambient sources: distant drones, nearby dripping, wind through gaps. Footstep variation by surface type. Breathing intensifies under threat.

## Ask the User When

- Gore/intensity level expectations
- Combat frequency (survival horror with weapons vs pure stealth horror)
- Multiplayer co-op horror (significantly changes tension dynamics)
- VR support (first-person horror in VR requires special care)

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** dark indoor environment (corridors, rooms), flashlight attached to player, 2-3 locked doors with key items, 1 enemy with patrol AI, ambient sound sources scattered throughout, 1 scripted scare event
- **Essential behaviors/lambdas:** custom flashlight behavior (battery, flicker), custom enemy AI with sight/sound detection, custom atmosphere manager (fog, ambient sound layers), `genericSound` with multiple positional sources, `consumable` for keys and batteries, `trigger` for scripted events
- **Suggested scene/behavior skeleton:** create dark environment, create Player with flashlight + limited inventory, place locked doors with trigger conditions, create enemy with patrol path + detection behavior, scatter ambient sound emitters, set up scripted scare triggers, configure perpetual night via dayNightCycle
- **Asset requirements:** environment models (corridors, rooms, doors, furniture), flashlight model, enemy model, key/battery item models, ambient sound files (drone, drip, creak, wind), scare SFX (stinger, scream, slam)

## Common Pitfalls

1. Environment too bright — horror needs darkness. Set ambient light very low (0.02-0.05) and control all light sources deliberately
2. Enemy AI too predictable — add randomized patrol variation and sound-reactive behavior so the player cannot memorize patterns
3. Flashlight implemented as a simple spotlight without gameplay — needs battery drain, flicker on low battery, limited cone angle, and toggle
4. Jump scares without buildup — tension pacing (quiet, unease, dread, release) is more important than individual scare moments
5. Positional audio not used — flat (non-positional) audio destroys the spatial awareness that drives fear and player decision-making

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| flashlightBattery | number | 100 | 30-300 | Maximum flashlight battery |
| flashlightDrainRate | number | 0.5 | 0.1-2 | Battery drain per second when on |
| ambientLightLevel | number | 0.05 | 0-0.2 | Scene ambient light intensity |
| enemySightRange | number | 10 | 3-20 | Enemy visual detection range |
| enemyHearingRange | number | 15 | 5-30 | Enemy audio detection range |
| playerMaxHealth | number | 100 | 50-200 | Player maximum health |
| fogDensity | number | 0.03 | 0-0.1 | Atmospheric fog density |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Positional audio | `genericSound` | positional=true, rolloffFactor for distance |
| Ambient layers | `genericSound` | Multiple sources, loop=true, low volume |
| Enemy base AI | `enemy` | health, patrol speed, detection triggers |
| Keys and batteries | `consumable` | inventoryType for item categories |
| Scripted events | `trigger` | Door slams, lights out, chase start |
| Door locks | `enableDisable` | Lock/unlock based on key possession |
| Enemy animations | `animation` | Idle, patrol, chase, attack clips |
| Darkness cycle | `dayNightCycle` | Set to perpetual night or dusk |
