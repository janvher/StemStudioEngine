---
name: stemstudio-assets
description: Asset search (local and external), asset metadata lookup, model import, and 3D model generation for Studio 3D. Use for finding, inspecting, downloading, and placing 3D models in the scene.
---

# StemStudio Assets

Use this skill for asset discovery, model import, and generation.

## Start Here

Search local assets first, then external, then generate as a last resort:

```bash
python scripts/search_local_assets.py --phrases castle medieval fortress stone tower
```

## Critical Workflows

### Asset routing decision tree

Choose one approach per object and stick to it:
1. **Structural geometry** — use primitives/groups via `stemstudio-objects`
2. **Reusable template** — check prefabs/stems via `stemstudio-prefabs`
3. **Authored asset** — search local assets first
4. **External asset** — search external assets only after local search fails
5. **Model generation** — use only when all search paths are exhausted

### Search local assets

Break the user's description into individual keywords including synonyms (OR logic — more keywords = better recall):

```bash
# WRONG: --phrases "medieval castle with drawbridge"
# RIGHT: decompose into individual keywords
python scripts/search_local_assets.py --phrases castle medieval fortress stone tower drawbridge bridge gate
python scripts/search_local_assets.py --phrases sword weapon blade iron --type model
```

### Inspect a local asset

Before placing an uncertain local result, fetch details by asset ID:

```bash
python scripts/get_library_asset.py --assetId "asset-123"
```

### Search external assets

Pass the natural language prompt as-is (external providers handle NLP):

```bash
python scripts/search_external_assets.py --prompt "oak tree"
python scripts/search_external_assets.py --prompt "medieval sword" --provider sketchfab --limit 5
```

Providers: sketchfab, polyhaven, meshy.

### Add a model to the scene

```bash
python scripts/add_model_to_scene.py "ext-123" "Medieval Sword" sketchfab "https://example.com/sword.glb" --position 0 1 0
python scripts/add_model_to_scene.py "local-456" "Oak Tree" local "/assets/tree.glb" --position 5 0 3
```

### Generate a 3D model (slow — last resort)

```bash
python scripts/generate_3d_model.py "a medieval sword" --name "Sword" --position 0 1 0
```

`generate_3d_model.py` is slow and should be the fallback path, not the first path.

## Routing Guidance

Use this skill for:
- searching local and external asset libraries
- inspecting local asset metadata by ID
- adding downloaded models to the scene
- generating 3D models from text descriptions

Do not use this skill for:
- creating primitives or groups (`stemstudio-objects`)
- reusing prefab templates (`stemstudio-prefabs`)
- applying textures to existing objects (`stemstudio-materials`)
- scene inspection (`stemstudio-scene`)

## Verification

After adding a model, verify it appeared:

```bash
python ~/.claude/skills/stemstudio-scene/scripts/get_scene_objects.py --filter "Sword"
```

## Common Mistakes

- jumping to external search or generation without checking local assets first
- passing exact user phrases instead of decomposed keywords to search_local_assets
- using generate_3d_model as the first option instead of searching first
- not specifying a provider when the user has a preference

## When To Read More

- Need asset pipeline or model format details: `~/.claude/stemstudio-docs/architecture.md`
- Need prefab reuse as alternative to import: `~/.claude/stemstudio-docs/prefab-system.md`

## See Also

- `stemstudio-objects` for primitives when asset search isn't needed
- `stemstudio-prefabs` for reusable templates
- `stemstudio-materials` for texturing imported models
- `stemstudio-threejs-loaders` for custom loader configurations
