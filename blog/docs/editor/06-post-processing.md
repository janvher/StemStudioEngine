---
title: Rendering and Performance
slug: post-processing
description: Quality presets, post-processing effects, shadow settings, physics options, and behavior performance tuning.
status: draft
audience: technical-creators
prerequisites: [editor/04-project-settings]
---

# Rendering and Performance

The Rendering & Performance panel lets you control visual quality, post-processing effects, shadow behavior, physics settings, and behavior optimization. These settings affect how your game looks and performs across different devices.

## How To Access

1. Open the **Project** tab in the left panel.
2. Select the **Rendering & Performance** section.

---

## Quality Presets

Quality presets provide pre-configured combinations of rendering settings optimized for different platforms and hardware capabilities.

### Desktop Presets

| Preset | Shadow Quality | Shadow Map | Post-Processing | SSAO | Bloom | Pixel Ratio |
|--------|---------------|-----------|-----------------|------|-------|-------------|
| **Ultra** | Ultra | 4096 | On | On (High) | On (High) | 2.0 |
| **High** | High | 2048 | On | On (Medium) | On (Medium) | 1.5 |
| **Medium** | Medium | 1024 | On | On (Low) | On (Low) | 1.0 |
| **Low** | Low | 512 | Off | Off | Off | 0.75 |

### Mobile Presets

| Preset | Shadow Quality | Post-Processing | Pixel Ratio |
|--------|---------------|-----------------|-------------|
| **Performance** | Low | Off | 0.5 |
| **Optimized** | Medium | Limited | 0.75 |

### iOS Presets

| Preset | Shadow Quality | Post-Processing | Pixel Ratio |
|--------|---------------|-----------------|-------------|
| **Optimized** | Medium | Limited | 0.75 |

---

## Rendering Options

| Setting | Description |
|---------|-------------|
| **Dynamic Batching** | Combines small objects into fewer draw calls to improve rendering performance |
| **Mesh Instancing** | Renders multiple copies of the same mesh in a single draw call |

---

## Post-Processing Effects

Post-processing effects are applied after the scene is rendered to enhance visual quality.

### Ambient Occlusion (AO)

Ambient occlusion adds soft shadows in corners and crevices where light would naturally be occluded.

| Property | Type | Description |
|----------|------|-------------|
| **Enabled** | toggle | Turn AO on or off |
| **Scale** | number | Overall intensity of the AO effect |
| **Samples** | number | Number of samples per pixel. Higher = better quality, more expensive |
| **Kernel Radius** | number | Size of the sampling area around each pixel |

**Advanced AO settings:**

| Property | Type | Description |
|----------|------|-------------|
| **Resolution Scale** | number | Render AO at a fraction of screen resolution for better performance |
| **Thickness** | number | Controls how thick occluded areas appear |
| **Distance Exponent** | number | How quickly AO falls off with distance between surfaces |
| **Distance Falloff** | number | Maximum distance at which AO is computed |

### Bloom

Bloom creates a glow effect around bright areas of the scene.

| Property | Type | Description |
|----------|------|-------------|
| **Enabled** | toggle | Turn bloom on or off |
| **Strength** | number | Intensity of the bloom glow |
| **Radius** | number | How far the glow spreads from bright areas |
| **Threshold** | number | Minimum brightness level that triggers the bloom effect |

---

## Shadows (CSM)

Cascaded Shadow Maps (CSM) settings control how directional light shadows are rendered across the scene.

| Property | Type | Description |
|----------|------|-------------|
| **Fade** | toggle | Enables soft fading at shadow cascade boundaries |
| **Mode** | dropdown | Distribution of shadow cascades: **Uniform**, **Logarithmic**, or **Practical** |
| **Cascades** | number | Number of shadow cascade levels (more = better quality at distance, higher cost) |
| **Light Margin** | number | Extra space around the shadow camera frustum |

---

## Graphics API

| Setting | Description |
|---------|-------------|
| **Force WebGL** | Force the renderer to use WebGL instead of WebGPU |
| **Force WebGL for VFX** | Force particle effects to use WebGL rendering even when the main renderer uses WebGPU |

---

## Physics

| Setting | Description |
|---------|-------------|
| **Sleeping** | Allows physics bodies at rest to stop simulating, improving performance |
| **Multi-Threaded** | Runs physics simulation on a separate thread for better frame rates |

---

## Scheduler

| Setting | Description |
|---------|-------------|
| **Modern Game Scheduler** | Enables the FrameOrchestrator pipeline for structured frame processing |
| **Fixed Rate Updates** | Runs behavior `fixedUpdate()` at a consistent timestep (e.g., 60 Hz) for deterministic physics interaction |

---

## Behavior Performance

These settings control how behaviors are optimized at runtime to maintain frame rates.

| Setting | Description |
|---------|-------------|
| **Off-Screen Optimization** | Behaviors on objects outside the camera view are updated less frequently |
| **Distance Throttling** | Behaviors on distant objects are updated less frequently based on distance from the camera |
| **Update Priority** | Each behavior declares a priority level (Critical, High, Medium, Low, Minimal) that determines how aggressively it can be throttled |
| **Distance Thresholds** | Configure the distances at which behaviors switch from full-rate to throttled updates |

### Throttle Priority Levels

| Priority | Throttling Behavior | Example Use Cases |
|----------|--------------------|--------------------|
| **Critical** | Never throttled | Player movement, core mechanics |
| **High** | Rarely throttled | AI, interactions |
| **Medium** | Moderately throttled | Animations, visual effects |
| **Low** | Aggressively throttled | Ambient sounds, environment |
| **Minimal** | Most aggressive throttling | Debug, metrics, background tasks |

---

## Tips

- **Start with a preset** that matches your target platform, then fine-tune individual settings.
- **Disable post-processing on mobile** for significant performance gains.
- **Reduce shadow cascades** from 4 to 2 if shadows are causing frame rate drops.
- **Enable physics sleeping** to prevent idle objects from consuming simulation time.
- **Use distance throttling** for large scenes with many behaviors to keep frame rates smooth.

## Next Steps

- Configure project-level settings in [Project Settings](04-project-settings.md).
- Learn about the specialized VFX and animation editors in [Specialized Editors](07-specialized-editors.md).
- Optimize your scene by reducing draw calls, lowering shadow resolution, and disabling expensive effects on complex scenes.
