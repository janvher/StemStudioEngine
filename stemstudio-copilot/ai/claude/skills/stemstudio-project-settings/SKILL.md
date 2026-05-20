---
name: stemstudio-project-settings
description: Project title, Copilot project tasks, game rules, HUD, multiplayer, script compartments, and rendering quality configuration for Studio 3D. Use for persisted tasks, lives, scoring, sandbox mode, shadows, and instancing settings.
---

# StemStudio Project Settings

Use this skill for project metadata, persisted Copilot task tracking, game rules, script compartment toggles, and rendering quality configuration.

## Start Here

Read current settings before changing:

```bash
python scripts/get_editor_settings.py --category game
python scripts/get_editor_settings.py --category rendering
```

## Critical Workflows

### Project title

```bash
python scripts/set_project_title.py "My Racing Game"
```

### Project tasks

Use project tasks for checklist-shaped work that should stay visible in the editor. Keep titles short and mark status as work progresses.

```bash
python scripts/list_project_tasks.py --status todo --limit 20
python scripts/create_project_task.py --title "Wire mobile flight controls" --status todo --order 1
python scripts/update_project_task.py --task-id "task-123" --status in_progress
python scripts/update_project_task.py --task-id "task-123" --status done
python scripts/delete_project_task.py --task-id "task-123"
```

Task statuses: todo, in_progress, done, blocked, cancelled.

### Script compartments

Scene-level SES compartments affect behavior/lambda script execution and take effect at next scene load:

```bash
python scripts/set_scene_compartments.py --enabled off
python scripts/set_scene_compartments.py --enabled on
```

### Game settings

```bash
python scripts/set_game_settings.py --enabled true --lives 3 --showHUD true
python scripts/set_game_settings.py --maxScore 100 --timer 120
python scripts/set_game_settings.py --isMultiplayer true --voiceChatEnabled true
python scripts/set_game_settings.py --isSandbox true --useAvatar true
```

Supported properties: enabled, lives, maxScore, timer, useAvatar, isMultiplayer, showHUD, isSandbox, voiceChatEnabled.

### Rendering settings

```bash
python scripts/set_rendering_settings.py --useShadows true --shadowMapType 2
python scripts/set_rendering_settings.py --useInstancing true
python scripts/set_rendering_settings.py --usePhysicsWorker true
```

Supported properties: useShadows, useInstancing, shadowMapType, usePhysicsWorker.
Use numeric THREE constants for `shadowMapType`:
- `0` = `THREE.BasicShadowMap`
- `1` = `THREE.PCFShadowMap`
- `2` = `THREE.PCFSoftShadowMap`
- `3` = `THREE.VSMShadowMap`

## Routing Guidance

Use this skill for:
- project/scene title
- persisted Copilot project tasks
- game mode enable/disable
- lives, scoring, timer configuration
- multiplayer and sandbox settings
- scene-level SES script compartments
- HUD visibility
- shadow, instancing, and rendering quality
- physics worker toggle (`usePhysicsWorker`)

Do not use this skill for:
- lighting, fog, or post-processing (`stemstudio-atmosphere`)
- camera type and perspective (`stemstudio-camera`)
- object physics configuration (`stemstudio-physics`)
- **scene-level physics engine and gravity** — those are scene physics state, owned by `stemstudio-physics` (`set_physics_engine.py`)

## Verification

After settings changes:

```bash
python scripts/get_editor_settings.py --category game
python scripts/get_editor_settings.py --category rendering
```

## Common Mistakes

- enabling game mode without setting lives or score
- changing rendering settings without understanding performance impact
- passing `shadowMapType` as a string like `PCFSoftShadowMap` instead of the numeric constant `2`
- enabling multiplayer without configuring related behaviors

## When To Read More

- Need setting interactions and defaults: `~/.claude/stemstudio-docs/editor-settings.md`
- Need exact command parameters: `~/.claude/stemstudio-docs/commands-reference.md`

## See Also

- `stemstudio-atmosphere` for visual environment settings
- `stemstudio-camera` for camera configuration
- `stemstudio-game-design` for full game architecture planning
