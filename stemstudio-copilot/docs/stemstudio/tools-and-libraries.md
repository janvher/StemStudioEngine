# StemStudio Tools & Libraries Reference

Reference documentation for specialized tools and behavior packs available in StemStudio: terrain generation, billboards, water, sky, navigation, and LOD.

## Terrain Systems

### Perlin Terrain

Procedural terrain generated using Perlin noise heightmaps.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | number | `100` | Terrain width in units |
| `depth` | number | `100` | Terrain depth in units |
| `heightScale` | number | `10` | Maximum height variation |
| `resolution` | number | `128` | Heightmap resolution (vertices per side) |
| `seed` | number | `0` | Random seed for reproducible terrain |
| `octaves` | number | `4` | Noise detail layers |
| `persistence` | number | `0.5` | How much each octave contributes |
| `lacunarity` | number | `2.0` | Frequency multiplier per octave |

Created via the editor terrain tool. The terrain generates a mesh with vertex colors based on height (green lowlands, brown hills, white peaks).

### Endless Terrain (`EndlessTerrain` behavior pack)

Infinite procedural terrain that generates chunks around the player. Singleton behavior — only one per scene.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `chunkSize` | number | `64` | Size of each terrain chunk |
| `viewDistance` | number | `3` | Number of chunks visible in each direction |
| `heightScale` | number | `15` | Height multiplier |
| `seed` | number | `42` | Random seed |
| `detailLevels` | array | `[1, 2, 4]` | LOD levels for distant chunks |

Attach via `attach_behavior` to any object (typically an empty group). Requires physics terrain for walkability.

### Physics Terrain

Provides collision for terrain surfaces. Works with both Perlin and Endless terrain.

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable physics collision for terrain |
| `shape` | string | Always `"btConcaveHullShape"` for terrain |
| `ctype` | string | Always `"Static"` |
| `mass` | number | Always `0` |

## Billboards

### Image Billboard (`image_billboard` behavior)

Displays a static image on a flat plane, optionally always facing the camera.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `imageUrl` | string (autoFill: resources.images) | `""` | Image source |
| `width` | number | `2` | Display width |
| `height` | number | `2` | Display height |
| `opacity` | slider (0-1) | `1` | Image opacity |
| `faceCamera` | boolean | `true` | Always face camera |

### Video Billboard (`video_billboard` behavior)

Plays video content on a flat plane in 3D space.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `videoUrl` | string (autoFill: resources.videos) | `""` | Video source |
| `width` | number | `4` | Display width |
| `height` | number | `2.25` | Display height |
| `autoplay` | boolean | `true` | Start playing on load |
| `loop` | boolean | `true` | Loop playback |
| `muted` | boolean | `false` | Mute audio |
| `volume` | slider (0-1) | `1` | Audio volume |

### Billboard (`billboard` behavior)

General-purpose billboard supporting multiple content types: images, YouTube embeds, webpages.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `billboardMode` | enum | `"Image"` | Content type: `"Image"`, `"YouTube Video"`, `"Webpage"` |
| `imageUrl` | string | `""` | Image URL (when mode = Image) |
| `urlLink` | string | `""` | YouTube/Webpage URL (when mode = YouTube/Webpage) |
| `width` | number | `4` | Display width |
| `height` | number | `3` | Display height |
| `faceCamera` | boolean | `false` | Always face camera |

`billboardMode` controls which attributes are visible via `visibleIf` conditions.

## Water

Water surfaces use a shader-based rendering system with reflection and refraction.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `color` | string (hex) | `"#001e0f"` | Water body color |
| `opacity` | number | `0.8` | Water surface opacity |
| `reflectivity` | number | `0.5` | Reflection strength |
| `waveSpeed` | number | `1.0` | Wave animation speed |
| `waveScale` | number | `0.1` | Wave height scale |
| `distortionScale` | number | `3.7` | Refraction distortion |
| `sunColor` | string (hex) | `"#ffffff"` | Sun reflection color |
| `sunDirection` | vector3 | `[0, 1, 0]` | Sun direction for reflection |

Water is typically added as a plane primitive with the water shader behavior attached. Position at Y = 0 or desired water level.

## Sky & Day/Night Cycle

### Skybox (`skybox` behavior)

Static environment skybox using cubemap textures.

| Attribute | Type | Description |
|-----------|------|-------------|
| `cubemap` | array of 6 images | Six face textures (px, nx, py, ny, pz, nz) |
| `intensity` | number | Environment lighting intensity |
| `rotation` | number | Skybox rotation (radians) |

Singleton behavior — only one skybox per scene. Attached to the scene root or an empty group.

### Day/Night Cycle (`dayNightCycle` behavior)

Dynamic sky with animated sun/moon movement and lighting transitions.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `dayDuration` | number | `120` | Full cycle duration in seconds |
| `startTime` | number | `0.25` | Start time (0-1, where 0.25 = noon) |
| `sunColor` | string (hex) | `"#ffddaa"` | Sun light color |
| `moonColor` | string (hex) | `"#aabbff"` | Moon light color |
| `sunIntensity` | number | `1.0` | Sun light strength |
| `moonIntensity` | number | `0.2` | Moon light strength |
| `ambientDay` | string (hex) | `"#404060"` | Ambient color during day |
| `ambientNight` | string (hex) | `"#101030"` | Ambient color at night |

Singleton behavior. Automatically adjusts scene ambient light, directional light, and sky color over time.

## Navigation Mesh (NavMesh)

### NavMesh (`navmesh` behavior)

Bakes a walkable navigation mesh for AI pathfinding. Used by enemy and NPC behaviors for movement.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `agentRadius` | number | `0.5` | Agent collision radius |
| `agentHeight` | number | `2.0` | Agent height |
| `maxSlope` | number | `45` | Maximum walkable slope (degrees) |
| `stepHeight` | number | `0.5` | Maximum step-up height |
| `cellSize` | number | `0.3` | Navigation grid cell size |
| `cellHeight` | number | `0.2` | Navigation grid cell height |

Attach to the ground/terrain object. The navmesh is baked from the object's geometry. Multiple navmesh behaviors can cover different areas.

### NavMesh Connection (`navmesh-connection` behavior)

Bridges separate navigation mesh areas (e.g., connecting two platforms via a bridge).

| Attribute | Type | Description |
|-----------|------|-------------|
| `startArea` | object | Start navmesh area reference |
| `endArea` | object | End navmesh area reference |
| `bidirectional` | boolean | Allow movement in both directions |
| `width` | number | Connection width |

## LOD (Level of Detail)

StemStudio supports automatic LOD for complex models to improve performance.

| Property | Type | Description |
|----------|------|-------------|
| `levels` | array | LOD distance thresholds |
| `autoGenerate` | boolean | Automatically generate simplified meshes |
| `fadeTransition` | boolean | Smooth fade between LOD levels |

### LOD Distance Levels

| Level | Typical Distance | Description |
|-------|-----------------|-------------|
| LOD0 | 0 - 10 | Full detail |
| LOD1 | 10 - 30 | Reduced detail (50% triangles) |
| LOD2 | 30 - 60 | Low detail (25% triangles) |
| LOD3 | 60+ | Minimal detail or billboard |

LOD is configured per-model in the editor. For scenes with many instances of the same model, combine LOD with GPU instancing (`useInstancing: true` in rendering settings) for best performance.

## Instancing

GPU instancing renders multiple copies of the same mesh in a single draw call.

| Setting | Location | Description |
|---------|----------|-------------|
| `useInstancing` | `scene.userData.game.useInstancing` | Enable/disable globally |

Best used with:
- Trees, rocks, and repeated environment props
- Collectible items (coins, gems)
- Any object placed many times with the same geometry

Enable via `set_rendering_settings` command:
```json
{ "useInstancing": true }
```

## Controllers

### AnimationController (`web/src/controls/AnimationController.ts`)

Manages blended animation playback for 3D objects. Supports weight-based animation mixing, speed control, fade durations, and pause/resume.

Key type:
```typescript
type BlendedAnimationParams = {
    name: string | THREE.AnimationClip;
    weight?: number;
    speed?: number;
    fadeDuration?: number;
};
```

Access via `game.animationController`:
- `playBlendedAnimations(object, blends[], playOnce?)` — Play weighted animation blend
- `updateBlendedAnimationWeights(object, weights)` — Update weights at runtime
- `pauseAnimations(object)` / `resumeAnimations(object)` — Pause/resume
- `stopAnimations(object)` — Stop and clean up

### AnimationGraphController (`web/src/controls/AnimationGraphController.ts`)

Manages complex animation state graphs with parameterized transitions between states.

Access via `game.animationGraphController`:
- `addAnimationGraph(graph, object)` — Register graph for an object
- `removeAnimationGraph(object)` — Remove graph
- `updateAnimationGraph(object, params)` — Transition state with fade in/out
- `update(delta)` — Frame update (called by game loop)

### VehicleControls (`web/src/controls/VehicleControls.ts`)

High-level vehicle controller integrating Ammo.js `btRaycastVehicle` with Three.js. Handles keyboard input, wheel mesh sync, suspension tuning, and throwable objects.

See [physics-system.md](physics-system.md#vehicle-physics) for the VehicleSpec, VehicleWheelSpec, VehicleInput, and VehicleOptions interfaces.

---

## Cascaded Shadow Maps (CSM)

The `csm` behavior provides high-quality shadows over large areas by splitting the shadow map into cascades.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `cascades` | number | `3` | Number of shadow cascades |
| `maxFar` | number | `100` | Maximum shadow distance |
| `shadowMapSize` | number | `2048` | Shadow map resolution |
| `lightDirection` | vector3 | `[-1, -1, -1]` | Shadow casting direction |

Singleton behavior. Attach to scene root or empty group. Replaces the default directional light shadow.
