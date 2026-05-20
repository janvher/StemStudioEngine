---
name: stemstudio-camera
description: Camera type, perspective, and configuration for Studio 3D. Use for camera type selection, FOV, clipping planes, and genre-appropriate camera setup.
---

# StemStudio Camera

Use this skill for camera configuration and genre-appropriate camera setup.

## Start Here

Read current camera settings before changing:

```bash
python scripts/get_editor_settings.py --category camera
```

The default scene camera is always named **`DefaultCamera`**. Use this name as `--target` unless the user has renamed it.

## Critical Workflows

### Find the camera in the scene

The default camera object name is `"DefaultCamera"`. If you are unsure, verify with:

```bash
python ~/.claude/skills/stemstudio-scene/scripts/get_scene_objects.py --filter "DefaultCamera"
# If not found (user renamed the camera), retry without --filter and look for isCamera: true
python ~/.claude/skills/stemstudio-scene/scripts/get_scene_objects.py
```

Look for an object with `isCamera: true` in the result. Use that object's `name` as the `--target` for all camera commands.

### Set camera type and properties

```bash
python scripts/set_camera_settings.py --target "DefaultCamera" --cameraType THIRD_PERSON --fov 60
python scripts/set_camera_settings.py --target "DefaultCamera" --cameraType FIRST_PERSON --headHeight 1.7
python scripts/set_camera_settings.py --target "DefaultCamera" --cameraType TOP_DOWN --defaultDistance 20
python scripts/set_camera_settings.py --target "DefaultCamera" --cameraType SIDE_SCROLLER --axis Z
```

Camera types: THIRD_PERSON, FIRST_PERSON, TOP_DOWN, SIDE_SCROLLER.

### Adjust distance and clipping

```bash
python scripts/set_camera_settings.py --target "DefaultCamera" --defaultDistance 8 --minDistance 3 --maxDistance 15
python scripts/set_camera_settings.py --target "DefaultCamera" --near 0.1 --far 1000
```

### Camera and character controller relationship

The camera is driven by the **character controller behavior** attached to the player object. The character behavior controls which object the camera follows and passes runtime options (animations, movement speeds, look speed) to the camera each frame.

The playable object must carry the object tag `Player`. When creating or repairing a player-controlled character, add the tag before depending on follow-camera behavior:

```bash
python ~/.claude/skills/stemstudio-objects/scripts/modify_object.py "Player" --tag Player
```

To modify the **camera perspective** (type, FOV, distances): use `set_camera_settings` targeting `DefaultCamera`.

To modify **how the character moves** and what the camera follows: use `set_behavior_config` targeting the character object with the `character` behavior. `set_behavior_config` requires a `--behaviorId` — never use a behavior name as a substitute. First inspect the player object and find the attached behavior's ID in its behavior data:

```bash
python ~/.claude/skills/stemstudio-scene/scripts/get_object.py --target "Player"
# Note the behaviorId of the 'character' behavior from the output
```

Then update its config:

```bash
python ~/.claude/skills/stemstudio-behaviors/scripts/set_behavior_config.py --target "Player" --behaviorId "BEHAVIOR_ID" --attributesData '{"lookSpeed":0.5}'
```

Key attributes:
- `lookSpeed` — camera rotation sensitivity (0–1)
- `walkSpeed`, `runSpeed` — movement speeds that affect camera follow feel

Do **not** try to detach or replace the character behavior to fix camera issues — modify its config instead.

### Camera direction convention

Three.js right-handed: **+X right, +Y up, -Z forward**. The camera's local forward is `-Z`, so `camera.getWorldDirection(v)` returns the vector the camera is looking toward (already negated for you). When writing custom follow rigs, place the camera at `target + offset` where `offset.z > 0` puts it behind the target. `lookAt(x, y, z)` takes a world-space point — no axis flip needed. See `~/.claude/stemstudio-docs/architecture.md` "Coordinate Convention".

### Genre-to-camera mapping

| Genre | Camera Type | Key Settings |
|-------|-------------|--------------|
| Platformer | SIDE_SCROLLER | axis='Z', defaultDistance=15 |
| Racing | THIRD_PERSON | defaultDistance=10, fov=70 |
| FPS/Shooter | FIRST_PERSON | headHeight=1.7, fov=75 |
| Puzzle | TOP_DOWN | defaultDistance=20, fov=45 |
| RPG/Adventure | THIRD_PERSON | defaultDistance=8, fov=60 |

## Routing Guidance

Use this skill for:
- camera type selection (third-person, first-person, top-down, side-scroller)
- FOV, clipping planes, distance settings
- genre-appropriate camera configuration

Do not use this skill for:
- lighting, fog, or post-processing (`stemstudio-atmosphere`)
- game rules or rendering quality (`stemstudio-project-settings`)
- object placement or scene building (`stemstudio-objects`)

## Verification

After camera changes:

```bash
python scripts/get_editor_settings.py --category camera
```

## Common Mistakes

- using `"PlayerCamera"` as target — the correct default name is `"DefaultCamera"`
- forgetting to tag the playable object with `Player` before using character or camera-follow behavior
- trying to detach or replace the character behavior to fix camera issues — use `set_behavior_config` instead
- changing camera settings without considering the intended genre or control scheme
- setting first-person camera without adjusting headHeight
- using side-scroller camera without specifying the axis constraint

## When To Read More

- Need camera configuration details: `~/.claude/stemstudio-docs/editor-settings.md`
- Need exact command parameters: `~/.claude/stemstudio-docs/commands-reference.md`

## See Also

- `stemstudio-behaviors` for modifying character controller attributes (lookSpeed, walkSpeed, etc.)
- `stemstudio-scene` for listing scene objects and finding the camera by name
- `stemstudio-atmosphere` for lighting and mood that complements camera
- `stemstudio-project-settings` for rendering quality
- `stemstudio-game-design` for full game setup including camera
