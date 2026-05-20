---
name: stemstudio-vfx
description: Particle and VFX creation, modification, lookup, grouping, and behavior attachment in Studio 3D. Use for emitters, grouped effects, and VFX verification rather than general scene or behavior work.
---

# StemStudio VFX

Primary skill for particle systems and visual effects.

Effect hierarchy matters here too. If an effect is made from multiple emitters or layered passes, group it deliberately instead of leaving separate sibling emitters as loose scene clutter.

Use this skill when the task involves:
- creating a particle effect
- modifying a VFX config
- attaching or removing VFX behaviors
- inspecting or deleting an effect
- searching the VFX library

Use other skills when the task is primarily about:
- general object creation: `stemstudio-objects`
- behavior code: `stemstudio-behaviors`
- scene settings/lighting: `stemstudio-atmosphere`

## Start Here

If a reusable effect may already exist, search first:

```bash
python scripts/search_library_vfx.py --phrases fire explosion smoke
```

If you already know the target effect or want to inspect current state:

```bash
python scripts/get_vfx.py --target "Explosion"
```

## ValueGenerator Rule — CRITICAL

**Never pass bare numbers for ValueGenerator fields. Always wrap them as objects.**

ValueGenerator fields: `emissionOverTime`, `emissionOverDistance`, `startLife`, `startSpeed`, `startSize`, `startLength`, `startRotation`, `startTileIndex`.

```
# WRONG — bare numbers cause "toJSON is not a function" at runtime
{"emissionOverTime": 20, "startSpeed": 1.2, "startSize": 0.8}

# CORRECT — constant value
{"emissionOverTime": {"type": "value", "value": 20}}

# CORRECT — random range
{"startSpeed": {"type": "randomBetweenTwoConstants", "a": 1.0, "b": 2.0}}
{"startSize": {"type": "randomBetweenTwoConstants", "a": 0.3, "b": 0.6}}
```

Primitives (`duration`, `looping`, `worldSpace`, `renderMode`, `renderOrder`, `speedFactor`, `softParticles`, `blendTiles`) stay as plain numbers/booleans.

## Critical Workflows

### Create a simple effect

```bash
python scripts/add_vfx.py --name "Campfire" --texture "/tmp/fire.png" \
  --config '{"duration":5,"looping":true,"emissionOverTime":{"type":"value","value":20},"startSpeed":{"type":"value","value":1.5},"startSize":{"type":"randomBetweenTwoConstants","a":0.3,"b":0.6}}'
```

For grouped effects:

```bash
python scripts/create_vfx_group.py --name "ExplosionGroup" --config '{"duration":1.2,"looping":false}'
```

Use a VFX group whenever:
- one authored effect uses multiple emitters or layers
- a single effect needs separate passes such as core flame, sparks, smoke, glow, debris
- you are creating a reusable environmental effect cluster such as `ForgeFire_Main` or `TorchCluster_WestHall`

Do not create a flat set of related emitters when they are conceptually one effect.

### Modify an existing effect

```bash
python scripts/modify_vfx.py --target "Campfire" \
  --config '{"startSize":{"type":"value","value":0.8},"startSpeed":{"type":"value","value":1.2}}'
```

### Add or remove a particle behavior

```bash
python scripts/add_vfx_behavior.py --target "Campfire" --behaviorType "ColorOverLife"
python scripts/remove_vfx_behavior.py --target "Campfire" --behaviorIndex 0
```

### Delete effects

```bash
python scripts/delete_vfx.py --target "TempSmoke"
python scripts/batch_delete_vfx.py --targets TempSmoke1 TempSmoke2
```

## Texture and Config Notes

Only read deeper docs when needed for:
- emitter shape configuration
- sprite sheet animation
- soft particles
- texture/data URL handling
- advanced generators such as gradients or random ranges

If the effect is simple, do not expand into full configuration reference reading.

## When To Read More

- Need emitter config, particle behaviors, or material fields: `~/.claude/stemstudio-docs/vfx-particle-system.md`
- Need lifecycle guidance because VFX is being driven from gameplay code: `~/.claude/stemstudio-docs/behavior-system.md`

If the task is really about attaching gameplay logic around an effect, switch to `stemstudio-behaviors` instead of overloading this skill.

## Verification

After creating or modifying an effect:

```bash
python scripts/get_vfx.py --target "Campfire"
```

Check:
- target exists
- config changes are present
- attached behaviors are correct
- the effect is not silently duplicated
- grouped effects still read as one named unit instead of loose unrelated emitters

## Common Mistakes

- using VFX for work that should be regular 3D objects
- creating layered effects as loose emitters instead of a VFX group
- jumping to full config docs for a simple effect
- editing a VFX repeatedly without first inspecting current config
- treating VFX behaviors as general object behaviors
- forgetting to verify after modification

## See Also

- `stemstudio-objects` for scene object placement around effects
- `stemstudio-behaviors` for gameplay logic triggered by effects
- `stemstudio-atmosphere` for atmosphere and post-processing that complement VFX
