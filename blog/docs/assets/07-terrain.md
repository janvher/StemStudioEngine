---
title: Terrain
slug: terrain
description: Procedural endless terrain generation with multi-layer texturing, object placement, and physics.
status: draft
audience: creators
prerequisites: [editor/01-left-panel]
---

# Terrain

StemStudio includes a procedural terrain system that generates an infinite landscape using Perlin noise. The terrain supports four texture layers blended by height, automatic placement of trees and rocks, and built-in physics collision.

## How To Add Terrain

1. Open the **Library & Tools** tab in the left panel.
2. Expand the **Tools** category.
3. Click **Terrain**.
4. A terrain object is added to your scene.

> **Note:** Only one terrain is allowed per scene. If a terrain already exists, adding another will replace it.

Select the terrain object and open the right panel to configure its settings.

---

## General Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **GPU Optimization** | toggle | off | Enables WebGPU-accelerated normal computation for better performance |
| **Enhanced Terrain** | toggle | on | Uses smooth slopes and domain warping for more natural-looking terrain |
| **Water** | toggle | on | Enables water bodies below sea level |
| **Water Percentage** | number (1-30) | 15 | Percentage of terrain area covered by water |
| **Max Height** | number | 200 | Maximum terrain elevation (amplitude of the height map) |
| **Seed** | number | 5600 | Perlin noise seed. Different seeds produce different terrain layouts |
| **Grass Max Height** | number (0-50) | 7 | Height threshold where grass transitions to rock |
| **Rock Max Height** | number (0-100) | 39 | Height threshold where rock transitions to snow |
| **Tree Density** | number (0-100) | 50 | Controls how densely trees are placed. 0 = none, 100 = maximum |
| **Rock Density** | number (0-100) | 50 | Controls how densely rocks are placed. 0 = none, 100 = maximum |

> **Tip:** Change the **Seed** value to get a completely different terrain layout while keeping all other settings the same.

---

## Texture Layers

The terrain blends four texture layers based on elevation. Each layer supports a diffuse texture, normal map, and roughness map.

### Layer Height Zones

| Layer | Height Range | Description |
|-------|-------------|-------------|
| **Ditch** | Below sea level (y < 0) | Low-lying areas, ditches, riverbeds |
| **Grass** | 0 to Grass Max Height | Default ground cover |
| **Rock** | Grass Max Height to Rock Max Height | Mid-altitude rocky areas |
| **Snow** | Above Rock Max Height | High-altitude peaks |

### Per-Layer Texture Properties

Each of the four layers (Ditch, Grass, Rock, Snow) has the following texture slots:

| Property | Type | Description |
|----------|------|-------------|
| **Texture** | image | The diffuse (color) texture for this layer |
| **Normal Map** | image | Adds surface detail without extra geometry |
| **Roughness Map** | image | Controls how shiny or matte the surface appears |

### UV Mapping Options

Each layer also has UV mapping controls that determine how the texture is tiled across the terrain:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **UV Mode** | dropdown | Scale | Choose between **Scale** (continuous factor) or **Repeat Count** (exact tile count) |
| **UV Scale** | number (0-1) | 0.035 | Scale factor when UV Mode is Scale. Lower values stretch the texture more |
| **UV Scale Locked** | toggle | off | When enabled, X and Y scale are locked together |
| **Repeat Count** | number (1-10) | 1 | Number of texture repeats when UV Mode is Repeat Count |
| **Repeat Locked** | toggle | on | When enabled, U and V repeat counts are locked together |

When scale or repeat is unlocked, you can set X/Y (or U/V) values independently for non-uniform tiling.

---

## Terrain Objects

The terrain system can automatically scatter 3D models across the landscape. Objects are placed based on their type and the terrain height at each position.

### Object Placement Rules

| Object Type | Placement Zone |
|-------------|---------------|
| **Plant** | Grass areas (below Grass Max Height) |
| **Tree** | Grass and lower rock areas |
| **Rock** | Rock areas (between Grass Max Height and Rock Max Height) |

### Terrain Object Properties

Each entry in the terrain objects list has:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Preview** | thumbnail | — | Visual preview of the model |
| **Bundled Model** | text (read-only) | — | Name of the default bundled model |
| **Custom Model (Assets)** | model picker | — | Select a model from your asset library to replace the bundled model |
| **Min Scale** | number (0.1-100) | 1 | Minimum random scale for placed instances |
| **Max Scale** | number (0.1-100) | 1 | Maximum random scale for placed instances |
| **Probability %** | number (0-100) | 100 | Chance that this object spawns at each valid placement point |
| **Type** | dropdown | Plant | Category: Plant, Rock, or Tree |

### Default Terrain Objects

The terrain ships with 9 default objects:
- 4 normal tree variants (100% probability)
- 2 boulder variants (20% probability)
- 3 pine tree variants (100% probability)

You can replace any default model with a custom model from your asset library, adjust scale ranges, change probabilities, or add new entries.

---

## Reset to Default

Click the **Reset to Default** button at the bottom of the terrain settings to restore all properties (general settings, textures, UV mapping, and terrain objects) back to their original values.

---

## Tips

- **Adjust density carefully.** High tree and rock density values can impact performance, especially on mobile devices.
- **Use the seed** to explore different terrain layouts quickly without changing any other settings.
- **Lower Grass Max Height** for flatter grassy areas, or raise it for more gradual rock transitions.
- **Custom models** can be any GLB/GLTF model from your asset library. Use them to create themed environments (alien rocks, tropical trees, etc.).
- **Water percentage** controls how much of the terrain sits below the water line. Higher values mean more water and less walkable land.

## Next Steps

- Add lighting to your terrain scene with [Lights Reference](06-lights-reference.md).
- Place interactive elements using [Scene Tools](09-scene-tools.md).
- Configure terrain rendering quality in [Rendering and Performance](../editor/06-post-processing.md).
