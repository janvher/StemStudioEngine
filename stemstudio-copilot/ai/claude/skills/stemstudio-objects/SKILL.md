---
name: stemstudio-objects
description: Object creation, modification, cloning, deletion, grouping, and batch operations in Studio 3D. Use for primitives, groups, transforms, parent-child hierarchy, and multi-object batch workflows.
---

# StemStudio Objects

Use this skill for object CRUD and batch operations.

Scene hierarchy is not optional. When objects belong together conceptually, group them and parent them correctly as part of the initial build.

## Start Here

Inspect the scene first via `stemstudio-scene`, then create or modify:

```bash
python scripts/create_primitive.py box --name "Wall" --position 0 1 -5 --scale 10 2 1 --color "#808080"
```

## Critical Workflows

### Group-first assembly (default for logical multi-part objects)

If multiple primitives make up one authored thing, create a parent group first, then create children under that group.

```bash
python scripts/create_group.py --name "Building_A" --position 0 0 0
python scripts/batch_create_primitives.py --objects '[
  {"type":"box","name":"Building_A_Wall_N","parent":"Building_A","position":{"x":0,"y":1.5,"z":-4},"scale":{"x":8,"y":3,"z":0.2},"color":"#b8b8b8"},
  {"type":"box","name":"Building_A_Wall_S","parent":"Building_A","position":{"x":0,"y":1.5,"z":4},"scale":{"x":8,"y":3,"z":0.2},"color":"#b8b8b8"},
  {"type":"box","name":"Building_A_Roof","parent":"Building_A","position":{"x":0,"y":3.2,"z":0},"scale":{"x":8.4,"y":0.3,"z":8.4},"color":"#7a7a7a"}
]'
```

Use this pattern for:
- buildings made from boxes or other primitives
- furniture sets, machines, props with sub-parts
- repeated object families in one zone, such as `Trees_North`, `Fence_West`, `MarketStalls`
- helper empties used as a shared transform root for behaviors or animation

Do not leave these children flat at scene root.

### Batch creation (default for 2+ objects)

ALWAYS use batch scripts for 2+ objects. NEVER call single-object scripts in a loop.
Plan all objects for a build phase together, then execute in one batch call.
If those objects belong together, create the parent group first and set `parent` on every child item in the batch payload.

```bash
python scripts/batch_create_primitives.py --objects '[
  {"type":"box","name":"Wall1","position":{"x":0,"y":1,"z":-5},"scale":{"x":10,"y":2,"z":1},"color":"#808080"},
  {"type":"box","name":"Wall2","position":{"x":5,"y":1,"z":-5},"scale":{"x":10,"y":2,"z":1},"color":"#808080"},
  {"type":"plane","name":"Floor","position":{"x":0,"y":0,"z":0},"scale":{"x":20,"y":20,"z":1},"color":"#666666"}
]'
```

Each item supports: type (required), name, position, scale, rotation, color, parent, objectSettings.

### Batch modification

```bash
python scripts/batch_modify_objects.py --objects '[
  {"target":"Wall1","color":"#999999","position":{"x":0,"y":2,"z":-5}},
  {"target":"Wall2","color":"#999999","position":{"x":5,"y":2,"z":-5}}
]'
```

### Batch deletion

```bash
python scripts/batch_delete_objects.py "Wall1" "Wall2" "TempMarker"
```

### Single-object operations (use only for exactly 1 object)

```bash
python scripts/create_primitive.py box --name "Wall" --position 0 1 -5 --scale 10 2 1 --color "#808080"
python scripts/create_group.py --name "Room" --position 0 0 0
python scripts/modify_object.py "Wall" --position 5 1 -5 --rotation 0 1.57 0
python scripts/modify_object.py "Player" --tag Player
python scripts/move_object.py "Sword" "Character"
python scripts/clone_object.py "Crate" --position 2 0 4
python scripts/delete_object.py "TempMarker"
```

Supported primitive types: box, sphere, cylinder, cone, plane, torus, torusKnot, triangle, capsule, icosahedron, octahedron, dodecahedron, ring.

### Object settings

Optional settings can be passed to create and modify scripts:

```bash
python scripts/create_primitive.py box --name "Blocker" --object-settings '{"isStatic": true, "isSelectable": false}'
```

Supported keys: isBatchable, isStatic, isSelectable, enableAtStart, visibleByAI, gameVisibility, EnableMorphing.

### Player tag

When creating or repairing the playable player object, add the `Player` tag after the object exists:

```bash
python scripts/modify_object.py "Player" --tag Player
```

For batch workflows, include `"tag":"Player"` in the matching `batch_modify_objects` entry. This tag is required for player-aware systems such as character controller targeting and camera follow.

## Routing Guidance

Use this skill for:
- creating primitives and groups
- modifying, cloning, moving, or deleting objects
- batch object operations (2+ objects)
- building clean parent-child hierarchy for logical assemblies

Do not use this skill for:
- scene inspection before mutation (`stemstudio-scene`)
- material or texture changes (`stemstudio-materials`)
- asset search or model import (`stemstudio-assets`)
- behavior attachment (`stemstudio-behaviors`)
- physics configuration (`stemstudio-physics`)

## Verification

After any mutation, verify via `stemstudio-scene`:

```bash
python ~/.claude/skills/stemstudio-scene/scripts/get_scene_objects.py --filter "Wall"
python ~/.claude/skills/stemstudio-scene/scripts/get_object.py --target "Wall"
python ~/.claude/skills/stemstudio-scene/scripts/get_object.py --target "Building_A"
```

For grouped builds, verify:
- the parent group exists
- children are parented to the expected group
- the scene root is not polluted with children that should live under the group

Do not assume success without verification.

## Common Mistakes

- calling single-object create/modify scripts in a loop instead of batching
- creating logical multi-part assemblies without a parent group
- forgetting to set `parent` during batch creation for grouped objects
- skipping scene inspection before creating objects
- forgetting `--tag Player` on the playable player object
- using primitives for assets that should come from search/prefabs
- switching creation strategy mid-task without asking the user

## When To Read More

- Need command flags or supported object operations: `~/.claude/stemstudio-docs/commands-reference.md`
- Need scene graph or parenting behavior: `~/.claude/stemstudio-docs/architecture.md`
- Need to decide between direct placement and prefab reuse: `~/.claude/stemstudio-docs/prefab-system.md`

## See Also

- `stemstudio-scene` for scene inspection before and after mutations
- `stemstudio-materials` for material and texture work
- `stemstudio-assets` for asset search and model import
- `stemstudio-prefabs` for reusable templates
- `stemstudio-behaviors` for attaching behaviors to objects
