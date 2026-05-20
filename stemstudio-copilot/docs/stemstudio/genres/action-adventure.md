# Genre Playbook: Action-Adventure

## Preserve First

- movement and combat loop
- interaction and dialogue flow
- camera readability
- UI and menu flow that affects progression
- inventory or upgrade logic when present

## Stem Defaults

- use built-ins for movement, triggers, sounds, and basic interactions when they fit
- UIKit is important for HUD, prompts, menus, and dialogue flow
- touch controls are appropriate only when the combat and interaction model stays readable

## When Custom Code Is Likely Needed

- combat state machines
- camera targeting or lock-on
- inventory or dialogue orchestration
- source-specific UI flow

## Ask the User When

- combat feel would materially change
- the UI shell is part of the identity
- interaction flow depends on unsupported input complexity

---

## Building From Scratch (Creation Mode)

- **Minimum viable scene:** player character, ground/environment, 1 enemy, 1 interactable object, basic HUD (health bar)
- **Essential behaviors/lambdas:** `character` for player, `enemy` or custom combat AI, custom camera behavior (third-person chase)
- **Custom needed:** combat system (using `erth.combat`), interaction system, progression manager
- **Asset requirements:** character model with animations, enemy model, weapon model, environment models
- **Recommended built-ins:** `character`, `enemy`, `objectInteractions`, `genericSound`, `animation`, `touchControls`

## Physics

See `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — row `action-adventure`. Summary:

- **Gravity:** `-9.81`.
- **Player:** `Dynamic` capsule with `character`. `rotationLock:{x:true,y:false,z:true}`.
- **Environment:** `Static` `concaveHull`. Mix presets: `bounciness_preset:"Ground"` outdoor, `"Wood"` for crates/doors, `"Concrete"` for stone.
- **Interactive props (push, pull, pickUp via `objectInteractions`):** `Dynamic` `box` or `convexHull`. Match preset to material — `Wood` for crates, `Metal` for trash cans.
- **Doors:** `Dynamic` body + `jointHinge` to `Static` frame.
- **Pitfall — props slide too easily:** crates with `mass:1` feel weightless; bump to `mass:5–20` for satisfying push physics.

## Common Pitfalls

1. Combat feel requires `fixedUpdate` for hit detection — `update` introduces frame-dependent inconsistency
2. Lock-on camera not integrated with combat — target switching must be smooth
3. Interaction prompts not parented to uiCamera — they render in world space instead of screen space
4. Health/damage not using `erth.combat` — reinventing the wheel when the engine provides it
5. Animation blend trees need careful state machine design — see [../game-design-patterns.md](../game-design-patterns.md)

## Configurable Parameter Templates

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| playerHealth | number | 100 | 10-1000 | Starting player health |
| attackDamage | number | 15 | 1-100 | Base melee damage |
| attackRange | number | 2 | 0.5-5 | Melee attack reach |
| dodgeDistance | number | 3 | 1-8 | Roll/dodge distance |
| cameraDistance | number | 8 | 3-20 | Chase camera distance |
| lockOnRange | number | 15 | 5-30 | Lock-on targeting range |

## Built-in Behaviors to Use

| Need | Built-in ID | Config Notes |
|------|-------------|--------------|
| Player movement | `character` | Set walkSpeed, runSpeed |
| Enemy AI | `enemy` | Configure enemyType, health, weapon |
| Interaction | `objectInteractions` | pickUp, push, pull |
| Sound effects | `genericSound` | Combat SFX, ambient |
| Animations | `animation` | Attack, dodge, idle clips |
| Touch controls | `touchControls` | Attack + dodge buttons |
