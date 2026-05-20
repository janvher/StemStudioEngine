---
name: stemstudio-atmosphere
description: Scene lighting, light object properties, fog, background, tone mapping, and post-processing for Studio 3D. Use for mood, atmosphere, shadows, and visual environment setup.
---

# StemStudio Atmosphere

Use this skill for scene-wide lighting, fog, background, tone mapping, and post-processing.

## Start Here

Read current settings before making broad changes:

```bash
python scripts/get_editor_settings.py --category lighting
python scripts/get_editor_settings.py --category fog
python scripts/get_editor_settings.py --category background
python scripts/get_editor_settings.py --category postProcessing
```

## Critical Workflows

### Lighting

```bash
python scripts/set_scene_lighting.py --ambient '{"color":"#fffaf0","intensity":0.6}' --hemisphere '{"skyColor":"#87CEEB","groundColor":"#4a7c59","intensity":0.4}' --shadows '{"enabled":true,"mapType":"PCFSoftShadowMap"}'
python scripts/set_light_properties.py --target "Directional" --intensity 2 --color "#ffffcc" --castShadow true --shadowMapSize 2048
```

Use `set_scene_lighting.py` for scene-wide ambient/hemisphere/shadow defaults. Use `set_light_properties.py` for a specific light object.

### Fog

```bash
python scripts/set_scene_fog.py --type linear --color "#c8d8c0" --near 5 --far 50
python scripts/set_scene_fog.py --type exponential --color "#1a1a2e" --density 0.05
python scripts/set_scene_fog.py --type none
```

### Background

```bash
python scripts/set_scene_background.py --type Color --color "#0f172a"
python scripts/set_scene_background.py --type Gradient --gradient '{"topColor":"#87CEEB","bottomColor":"#f0e68c"}'
```

### Tone mapping

```bash
python scripts/set_tone_mapping.py --type ACESFilmic --exposure 1.1
python scripts/set_tone_mapping.py --type Reinhard --exposure 0.9
```

Types: None, Linear, Reinhard, Cineon, ACESFilmic.

### Post-processing

```bash
python scripts/set_post_processing.py --bloom '{"enabled":true,"strength":0.8,"radius":0.3,"threshold":0.7}'
python scripts/set_post_processing.py --ao '{"enabled":true}' --bloom '{"enabled":true,"strength":0.5}'
```

Effects: ao (ambient occlusion), bloom, outline.

### Atmosphere routing

When the user asks for a mood like "night", "sunset", or "horror":
- inspect current settings first
- change lighting, fog, background, tone mapping, and post-processing together
- verify after each major change set

Do not treat this as purely a lighting task if the request is about scene feel.

## Routing Guidance

Use this skill for:
- lighting and shadow configuration
- specific light object intensity, color, castShadow, and shadow map properties
- fog type, color, and density
- background color, gradient, or cubemap
- tone mapping type and exposure
- post-processing effects (bloom, AO, outline)

Do not use this skill for:
- camera configuration (`stemstudio-camera`)
- game rules or rendering quality (`stemstudio-project-settings`)
- VFX/particle effects (`stemstudio-vfx`)
- object materials (`stemstudio-materials`)

## Verification

After atmosphere changes:

```bash
python scripts/get_editor_settings.py --category lighting
python scripts/get_editor_settings.py --category postProcessing
```

## Common Mistakes

- changing many categories without first reading current settings
- adjusting only one setting when the user really wants a full atmosphere change
- overusing post-processing before fixing lighting and fog
- not coordinating lighting, fog, and background together for mood changes

## When To Read More

- Need category defaults or setting interactions: `~/.claude/stemstudio-docs/editor-settings.md`
- Need exact command parameters: `~/.claude/stemstudio-docs/commands-reference.md`

## See Also

- `stemstudio-camera` for camera type and perspective
- `stemstudio-project-settings` for rendering quality settings
- `stemstudio-vfx` for particle effects that complement atmosphere
- `stemstudio-game-design` for full scene mood planning
