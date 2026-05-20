---
name: stemstudio-prefabs
description: Reusable prefab/stem workflows for Studio 3D. Use for listing templates, inspecting them, creating a prefab from an object, and spawning one or many instances.
---

# StemStudio Prefabs

`prefab` and `stem` mean the same thing.

Use this skill when the task involves:
- saving a reusable object template
- listing or inspecting existing prefabs/stems
- spawning one or many instances
- choosing prefab reuse instead of rebuilding the same object repeatedly

## Start Here

Before creating a new prefab, check whether one already exists:

```bash
python scripts/list_prefabs.py
python scripts/list_prefabs.py --filter "enemy"
python scripts/get_prefab.py --id "PREFAB_ID"
```

## Critical Workflows

### Create a prefab from an existing scene object

```bash
python scripts/create_prefab.py --target "Enemy" --name "EnemyTemplate"
```

Use this when the object already has the right hierarchy, materials, and behaviors and you want to reuse it.

### Spawn one instance

```bash
python scripts/add_prefab_to_scene.py --prefab-id "PREFAB_ID" --position 10 0 5 --name "Enemy1"
```

### Spawn many instances

ALWAYS use the batch path for 2+ instances:

```bash
python scripts/batch_add_prefabs_to_scene.py --prefab-id "PREFAB_ID" --positions '[{"x":0,"y":0,"z":0},{"x":5,"y":0,"z":0}]'
```

Use `--operations` when each instance needs different parameters.

## When to Use Prefabs

Use prefabs for:
- enemies or NPC templates
- collectibles or pickups
- repeated props
- multi-part vehicles or machines
- any object you expect to spawn multiple times

Do not use a prefab if:
- the object is a one-off
- the source object is still unstable and being heavily redesigned
- a simple primitive or direct asset placement is faster than template management

## Integration Rules

- inspect the source object before creating a prefab from it
- prefer prefab reuse over rebuilding the same hierarchy repeatedly
- if behaviors are central to the template, confirm those behaviors are correct before prefab creation
- for large repeated spawns, prefer batch spawning over repeated single calls

## Verification

Verify by:
- listing prefabs to confirm creation
- inspecting the prefab by ID
- spawning one test instance before large-scale spawning

Typical verification:

```bash
python scripts/get_prefab.py --id "PREFAB_ID"
python scripts/add_prefab_to_scene.py --prefab-id "PREFAB_ID" --name "PrefabTest"
```

## When To Read More

- Need prefab lifecycle, asset resolution, or template semantics: `~/.claude/stemstudio-docs/prefab-system.md`
- Need exact command fields for surrounding scene work: `~/.claude/stemstudio-docs/commands-reference.md`

## Common Mistakes

- creating a prefab before checking existing templates
- spawning many instances one-by-one instead of batching
- treating “stem” and “prefab” as different concepts
- creating a prefab from an object that has not been verified yet

## See Also

- `stemstudio-scene`
- `stemstudio-objects`
- `stemstudio-behaviors`
- `stemstudio-physics`
