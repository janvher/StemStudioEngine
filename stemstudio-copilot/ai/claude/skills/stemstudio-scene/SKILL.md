---
name: stemstudio-scene
description: Scene inspection and object queries for Studio 3D. Use to inspect scene state, hierarchy, get object details, check selected object, or fetch player info before any mutation.
---

# StemStudio Scene

Use this skill for read-only scene inspection and object queries.

Hierarchy checks are part of inspection. Use this skill to confirm not only that objects exist, but that grouped assemblies are parented correctly.

## Start Here

Always inspect the scene before creating or modifying anything:

```bash
python scripts/get_scene_objects.py
```

## Critical Workflows

### Full scene inspection

```bash
python scripts/get_scene_objects.py
```

### Filtered scene query

```bash
python scripts/get_scene_objects.py --filter "Wall"
```

### Get a specific object

```bash
python scripts/get_object.py --target "Player"
```

### Get the currently selected object

```bash
python scripts/get_selected_object.py
```

### Get player object

```bash
python scripts/get_player.py
```

## Routing Guidance

Use this skill for:
- understanding what exists in the scene before acting
- verifying mutations after they run
- checking object properties, hierarchy, and transforms

Do not use this skill for:
- creating, modifying, or deleting objects (`stemstudio-objects`)
- material or texture changes (`stemstudio-materials`)
- asset search or model import (`stemstudio-assets`)

## Verification

After any mutation from another skill, return here to verify:

```bash
python scripts/get_scene_objects.py --filter "ObjectName"
python scripts/get_object.py --target "ObjectName"
```

For grouped work, explicitly verify:
- the parent group exists
- expected children are under that parent
- objects that should be grouped are not stranded at scene root

Do not assume success without verification.

## Common Mistakes

- skipping scene inspection before creating objects
- assuming an object exists without checking
- verifying object existence but forgetting to verify hierarchy
- not verifying mutations completed successfully

## When To Read More

- Need scene graph or parenting behavior: `~/.claude/stemstudio-docs/architecture.md`
- Need command flags or supported operations: `~/.claude/stemstudio-docs/commands-reference.md`

## See Also

- `stemstudio-objects` for object CRUD and batch operations
- `stemstudio-materials` for material and texture changes
- `stemstudio-assets` for asset search and model import
