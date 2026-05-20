---
title: Lights Reference
slug: lights-reference
description: All user-accessible light types in StemStudio — Directional, Point, and Spot lights with shadow configuration.
status: draft
audience: creators
prerequisites: [editor/01-left-panel]
---

# Lights Reference

Lights illuminate your 3D scene. Without lights, objects appear flat and unshaded. StemStudio provides three light types that you can add from the Tools section of the left panel.

## How To Add Lights

1. Open the **Library & Tools** tab in the left panel.
2. Expand the **Tools** category.
3. Click **Directional Light**, **Point Light**, or **Spot Light**.
4. The light is added to your scene at position (0, 0, 0).

Select the light to configure its properties in the right panel.

---

## Directional Light

A directional light emits parallel rays in a single direction, like sunlight. It illuminates all objects equally regardless of distance.

| Property | Type | Description |
|----------|------|-------------|
| **Color** | color picker | The color of the light |
| **Intensity** | number | Brightness of the light |
| **Cast Shadow** | toggle | Enable shadow casting |
| **Unity-Style Mode** | toggle | When enabled, uses a Unity-compatible directional light mode with camera-distance-based shadow framing |

### Directional Light Shadow Properties

When **Cast Shadow** is enabled, additional shadow settings appear:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Shadow Map Size** | dropdown | 2048 | Resolution of the shadow map (256, 512, 1024, 2048, 4096) |
| **Shadow Bias** | number | 0 | Offset to reduce shadow acne artifacts |
| **Shadow Normal Bias** | number | 0.1 | Bias along the surface normal |
| **Shadow Radius** | number | 3 | Blur radius for soft shadows (PCF/VSM modes) |
| **Shadow Camera Width/Height** | number | 200 | Size of the orthographic shadow camera frustum |
| **Shadow Camera Near** | number | — | Near clipping plane of the shadow camera |
| **Shadow Camera Far** | number | — | Far clipping plane of the shadow camera |

> **Tip:** Directional lights are the best choice for outdoor sun lighting. One directional light casting shadows is usually sufficient for most scenes.

---

## Point Light

A point light emits light in all directions from a single point, like a light bulb.

| Property | Type | Description |
|----------|------|-------------|
| **Color** | color picker | The color of the light |
| **Intensity** | number | Brightness of the light |
| **Distance** | number | Maximum range of the light. 0 means unlimited range |
| **Decay** | number | How quickly the light dims with distance. 2 is physically realistic |
| **Cast Shadow** | toggle | Enable shadow casting |
| **Start On Trigger** | toggle | When enabled, the light activates only when triggered by an event |

### Point Light Shadow Properties

When **Cast Shadow** is enabled:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Shadow Map Size** | dropdown | 2048 | Resolution of the shadow map |
| **Shadow Radius** | number | 3 | Blur radius for soft shadows (PCF/VSM modes) |

> **Tip:** Use point lights for indoor lamps, torches, and localized light sources. Keep the distance value reasonable to avoid lighting objects far away.

---

## Spot Light

A spot light emits a cone of light from a single point toward a target, like a flashlight or stage spotlight.

| Property | Type | Description |
|----------|------|-------------|
| **Color** | color picker | The color of the light |
| **Intensity** | number | Brightness of the light |
| **Distance** | number | Maximum range of the light. 0 means unlimited range |
| **Decay** | number | How quickly the light dims with distance |
| **Angle** | number | Width of the light cone in radians (max ~1.57 = 90 degrees) |
| **Penumbra** | number | Softness of the cone edge. 0 = hard edge, 1 = fully soft |
| **Target** | position | The point in 3D space the spotlight aims at |
| **Cast Shadow** | toggle | Enable shadow casting |
| **Start On Trigger** | toggle | When enabled, the light activates only when triggered |

### Spot Light Shadow Properties

When **Cast Shadow** is enabled:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Shadow Map Size** | dropdown | 2048 | Resolution of the shadow map |
| **Shadow Bias** | number | 0 | Offset to reduce shadow acne |
| **Shadow Normal Bias** | number | 0.1 | Bias along the surface normal |
| **Shadow Radius** | number | 3 | Blur radius for soft shadows (PCF/VSM modes) |
| **Shadow Camera Near** | number | — | Near clipping plane of the shadow camera |
| **Shadow Camera Far** | number | — | Far clipping plane of the shadow camera |
| **Shadow Focus** | number (0-1) | — | Controls the focus point of the shadow (when available) |

---

## Shadow Settings

Shadows add realism but are performance-intensive. Here are guidelines for configuring shadows effectively.

### Shadow Map Size

The shadow map resolution determines shadow quality. Higher values produce sharper shadows but use more GPU memory.

| Size | Quality | Use Case |
|------|---------|----------|
| 256 | Very low | Mobile or very distant shadows |
| 512 | Low | Background objects |
| 1024 | Medium | General-purpose shadows |
| 2048 | High (default) | Primary scene shadows |
| 4096 | Ultra | Close-up shadows needing fine detail |

### Shadow Type Modes

The shadow rendering mode is set globally in [Rendering and Performance](../editor/06-post-processing.md) settings. The available shadow parameters depend on the mode:

- **PCF (Percentage-Closer Filtering):** Shows Shadow Radius for soft shadow edges
- **VSM (Variance Shadow Maps):** Shows Shadow Radius and Shadow Blur Samples for smoother, softer shadows

### Reset Shadow to Default

Each light with shadows has a **Reset Shadow to Default** button that restores:
- Shadow radius: 3
- Shadow bias: 0
- Shadow normal bias: 0.1
- Shadow map size: 2048 x 2048
- Shadow camera width/height: 200 (directional lights)

---

## Tips

- **Limit shadow-casting lights.** Each shadow-casting light renders the scene an extra time. Keep to 1-2 shadow-casting lights for good performance.
- **Use directional lights for outdoor scenes.** They simulate sunlight with consistent shadow direction.
- **Use point lights for indoor scenes.** Place them at lamp positions with appropriate distance values.
- **Adjust shadow bias** if you see shadow acne (striped artifacts on surfaces) or peter-panning (shadows detaching from objects).
- **Lower shadow map size on mobile.** Use 512 or 1024 instead of 2048 for better mobile performance.

## Next Steps

- Learn about rendering quality presets in [Rendering and Performance](../editor/06-post-processing.md).
- Add spatial audio to your scene with [Scene Tools](09-scene-tools.md).
- Configure materials and textures on lit objects in [Materials and Textures](05-materials-and-textures.md).
