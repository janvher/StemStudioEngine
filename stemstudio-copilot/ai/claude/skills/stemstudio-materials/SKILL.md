---
name: stemstudio-materials
description: Material properties, texture application, and external texture providers for Studio 3D objects. Use for PBR materials, texture URLs, and Polyhaven/external textures.
---

# StemStudio Materials

Use this skill for material and texture changes on existing objects.

## Start Here

Set material properties on a target object:

```bash
python scripts/set_material.py "Wall" --color "#888888" --roughness 0.8
```

## Critical Workflows

### Set PBR material properties

```bash
python scripts/set_material.py "Wall" --color "#888888" --roughness 0.8 --metalness 0.2
python scripts/set_material.py "Glass" --color "#ffffff" --opacity 0.3 --metalness 0.0 --roughness 0.0
```

Supported properties: color, opacity (0-1), metalness (0-1), roughness (0-1).

### Apply a texture from URL

```bash
python scripts/set_texture.py "Wall" "/textures/brick.jpg"
python scripts/set_texture.py "Floor" "/textures/wood.png" --type normalMap
python scripts/set_texture.py "Metal" "/textures/scratches.png" --type roughnessMap
```

Texture types: map (diffuse, default), normalMap, roughnessMap.

### Apply an external texture (Polyhaven etc.)

**MANDATORY: Always search first — never guess an assetId.**

Step 1 — search for the texture using `stemstudio-assets`:

```bash
python ~/.claude/skills/stemstudio-assets/scripts/search_external_assets.py --prompt "wood floor" --provider polyhaven
```

Step 2 — pick an asset from the results, then apply using the returned `id` and `name`:

```bash
python scripts/set_external_texture.py "Wall" --assetId "<id from results>" --assetType "textures" --name "<name from results>" --provider "polyhaven"
python scripts/set_external_texture.py "Sky" --assetId "<id from results>" --assetType "hdris" --name "<name from results>" --provider "polyhaven"
```

Asset types: textures, hdris. The `assetId` must come from search results — do not invent or guess it.

## Routing Guidance

Use this skill for:
- changing color, roughness, metalness, opacity
- applying texture maps from URLs
- applying textures from external providers (Polyhaven)

Do not use this skill for:
- creating or modifying objects (`stemstudio-objects`)
- searching for textures or assets (`stemstudio-assets`)
- custom shader code (`stemstudio-threejs-shaders`)
- procedural textures in behaviors (`stemstudio-threejs-textures`)

## Verification

After material or texture changes, verify the object:

```bash
python ~/.claude/skills/stemstudio-scene/scripts/get_object.py --target "Wall"
```

## Common Mistakes

- setting material on an object that doesn't exist yet
- forgetting to search for textures before guessing asset IDs
- using set_external_texture without verifying the provider and assetId
- applying roughnessMap or normalMap without a base color/texture

## When To Read More

- Need command flags or supported material properties: `~/.claude/stemstudio-docs/commands-reference.md`
- Need texture system deep dive: `~/.claude/stemstudio-docs/architecture.md`

## See Also

- `stemstudio-assets` for searching textures and assets before applying
- `stemstudio-objects` for creating objects to apply materials to
- `stemstudio-threejs-shaders` for custom shader materials
- `stemstudio-threejs-textures` for procedural texture generation
