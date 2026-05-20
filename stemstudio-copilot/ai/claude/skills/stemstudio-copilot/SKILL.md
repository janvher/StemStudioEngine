---
name: stemstudio-copilot
description: Master routing skill for StemStudio ACP work. Use for broad or ambiguous requests such as "make a game", "build a scene", "improve this", or any task that needs skill selection, scene inspection, staged execution, and clean scene hierarchy.
---

# StemStudio Copilot

Use this skill as the thin orchestration layer for ACP/editor sessions. It should help choose the right skills and build order, not restate engine documentation.

## Use This Skill When

- The request is broad, ambiguous, or spans multiple systems
- You need to choose between several StemStudio skills
- You need a build order for a scene, game loop, or polish pass
- You need to decide whether to inspect, modify, or ask a clarifying question first

## Route To The Smallest Relevant Skill Set

| Request Type | Primary Skill |
| --- | --- |
| Scene inspection, object queries | `stemstudio-scene` |
| Object creation, modification, batch ops | `stemstudio-objects` |
| Materials and textures | `stemstudio-materials` |
| Asset search, model import | `stemstudio-assets` |
| Behaviors, behavior reuse, behavior updates | `stemstudio-behaviors` |
| Game structure and mechanic planning | `stemstudio-game-design` |
| Physics and collisions | `stemstudio-physics` |
| HUD or menus | `stemstudio-uikit` or `stemstudio-game-ui-design` |
| Lighting, fog, background, post-processing | `stemstudio-atmosphere` |
| Camera type and perspective | `stemstudio-camera` |
| Game rules, rendering quality | `stemstudio-project-settings` |
| Terrain, water, sky, navmesh, billboard, LOD | `stemstudio-tools` |
| Prefab workflows | `stemstudio-prefabs` |
| Lambda data design, schema guidance | `stemstudio-lambdas` |
| Shared JS helpers consumed via `@import` (script assets) | `stemstudio-scripts` |
| Event wiring | `stemstudio-eventbus` |
| Input wiring | `stemstudio-input-manager` |
| Audio | `stemstudio-audio` |
| VFX | `stemstudio-vfx` |
| Engine/runtime internals | `stemstudio-game-engine` |
| Custom geometry, shaders, textures, loaders | matching `stemstudio-threejs-*` skill |

## Mandatory Workflow

1. **Classify** — determine scope, genre, confidence level.
2. **Inspect** — load stemstudio-scene, call get_scene_objects.
3. **Search** — check existing assets, behaviors, prefabs before planning new creation.
4. **Skill-check** — load relevant skills to discover what the engine provides. For whole games or vague genre requests, load `stemstudio-game-design` and use the closest playbook from `~/.claude/stemstudio-docs/genres/`. Do NOT plan raw Three.js code for capabilities that a skill or built-in behavior already covers.
5. **Plan** (for 2+ objects) — write a visible plan: goal, objects inventory with creation approach, grouping/parenting strategy, build phases, unknowns. Each planned action should name the skill it uses.
6. **Execute** — one phase at a time, using batch scripts for multi-object work.
7. **Verify** — inspect the scene after each phase before starting the next one.
8. **Reflect** — summarize, suggest next steps.

For LOW confidence requests, ask at step 1 and stop.

## Inspection Rules

- Call `get_scene_objects` before broad creation or modification work.
- Use `get_object` or `get_selected_object` for targeted edits.
- Use `get_editor_settings` before changing lighting, fog, camera, or environment settings.
- Search first before creating new reusable content:
  - `list_behaviors --filter`
  - `list_prefabs --filter`
  - asset search commands
- If a requested asset is recognizable and not structural, search local assets before external or generated approaches.

## Batch-First Execution (mandatory)

All creation, modification, and deletion of 2+ objects MUST use batch scripts.
NEVER call single-object scripts in a loop — always use `batch_create_primitives.py`, `batch_modify_objects.py`, `batch_delete_objects.py`.
Plan all objects for a build phase together, then execute in one batch call.
Load `stemstudio-objects` for batch script documentation and parameter schemas.

## Grouping And Hierarchy (mandatory)

Treat scene hierarchy as part of the deliverable, not cleanup for later.

- If 2+ created objects form one logical result, create a named parent group first and put all child objects under it during creation.
- If the task creates repeated objects of the same family in one area or system, group them under a semantic container instead of leaving them at scene root.
- For structures assembled from primitives, always group the finished structure. Example: a building made of boxes should have a parent such as `Building_A`, with walls, roof, trims, and windows parented to it.
- For VFX made from multiple emitters or layers, use `create_vfx_group` and treat the whole effect stack as one grouped unit.
- When using `batch_create_primitives.py`, set each child's `parent` field in the batch payload. Do not create a flat list first and reorganize only if you remember later.
- Default to grouping unless the result is a single standalone object or multiple unrelated one-off objects.
- After each grouped build phase, verify both existence and hierarchy, not just object count.

## Build Order Heuristics

- New scene or game: ground/environment -> player/core objects -> mechanics -> UI/VFX/audio -> polish
- Full game request: genre playbook -> camera/control model -> graybox -> player verb -> challenge layer -> progression/feedback -> polish
- Modification: inspect target -> apply smallest safe change -> verify
- Debugging: identify failing object/system -> inspect state -> fix one likely cause at a time -> re-verify
- UI requests: decide whether this is design-only (`stemstudio-game-ui-design`) or implementation (`stemstudio-uikit`)
- For authored scene assemblies: container group -> child primitives/assets -> materials -> behaviors/physics -> VFX/audio -> verify hierarchy

## Clarifying Questions

Ask only when a missing detail will change the implementation materially:

- style or theme
- target object when ambiguous
- whether to generate/import an asset versus build from primitives
- genre or control scheme when the request is "make a game"

Use sensible defaults for minor omissions.

## Hard Rules

- You are building for StemStudio, not a standalone Three.js app. Always use engine systems (behaviors, physics, VFX, prefabs, UI toolkit) via skills. Write raw Three.js only inside behavior lifecycle methods (`init`, `onStart`, `update`, `fixedUpdate`, `dispose`) or lambda code when no built-in capability exists.
- Do not hallucinate asset IDs, behavior IDs, command names, or engine APIs.
- Validate unfamiliar APIs against `~/.claude/stemstudio-types/stem-types.d.ts` or the narrowest relevant doc.
- Do not bulk-read docs. Load the smallest relevant skill or reference only when needed.
- For Bash/Python helper scripts, prefer `~/.claude/skills/stemstudio-tools/scripts/run_skill.sh` so execution is logged.
- Do not call model generation until search paths are exhausted and the user is aligned on generating instead of reusing.
- When `add_behavior` or `update_behavior` returns `codeValidation`, treat errors as blocking and warnings as required review items before claiming success.
- Verify major changes before claiming success.

## When To Read More

- Need command names or flags: `~/.claude/stemstudio-docs/commands-reference.md`
- Need behavior lifecycle or attribute shape: `~/.claude/stemstudio-docs/behavior-system.md`
- Need gameplay loop patterns or genre composition: `~/.claude/stemstudio-docs/game-design-patterns.md`, `~/.claude/stemstudio-docs/genres/`
- Need exact event topics: `~/.claude/stemstudio-types/stem-events-registry.json`
- Need exact engine/type surface: `~/.claude/stemstudio-types/stem-types.d.ts`

Read only the smallest file that unblocks the current step.
