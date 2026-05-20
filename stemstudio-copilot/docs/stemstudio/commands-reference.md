# Commands Reference

All JSONRPC commands available through the AI Copilot, as defined in the `CommandsRegistry` (`de-shadow-editor/web/src/agent/CommandsRegistry.ts`). This is the authoritative source for command names, parameters, and types.

## Command Table

### Object Commands (7)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `create_primitive` | Create a new 3D primitive object in the scene | type (string) | name (string), position (object), scale (object), rotation (object), color (string), parent (string) |
| `create_group` | Create a new empty group (container) for organizing objects | — | name (string), position (object), scale (object), rotation (object), parent (string) |
| `clone_object` | Clone an existing object in the scene by name or UUID | target (string) | position (object) |
| `modify_object` | Modify properties of an existing object (position, rotation, scale, color, tags) | target (string) | position (object), rotation (object), scale (object), color (string), name (string), tag (string or array) |
| `move_object` | Move an object to a different parent in the scene hierarchy | target (string), parent (string) | — |
| `delete_object` | Delete an object from the scene by name or UUID | target (string) | — |

### Query Commands (4)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `get_scene_objects` | Get list of all objects in the scene with their properties | — | filter (string) |
| `get_object` | Get detailed information about a specific object | target (string) | — |
| `get_selected_object` | Get the currently selected object in the editor | — | — |
| `get_player` | Get the player object data | — | — |

### Material & Texture Commands (3)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `set_material` | Set or modify material properties of an object | target (string) | color (string), opacity (number), metalness (number), roughness (number) |
| `set_texture` | Apply a texture to an object | target (string), textureUrl (string) | textureType (string) |
| `set_external_texture` | Apply texture or HDRI from external providers (Polyhaven, etc.) to an object | target (string), assetId (string), assetType (string), name (string), provider (string) | — |

### Behavior Commands (8)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `list_behaviors` | List all available behaviors with optional filtering | — | filter (string) |
| `get_behavior` | Get detailed information about a specific behavior by ID | behaviorId (string) | — |
| `add_behavior` | Add a new behavior to the registry | name (string), code (string) | metadata (object), version (string), description (string), author (string) |
| `update_behavior` | Update an existing behavior in the registry, creating a new revision | behaviorId (string), code (string) | name (string), metadata (object), version (string), description (string), author (string) |
| `attach_behavior` | Attach a behavior script to an object | target (string), behaviorId (string) | config (object) |
| `detach_behavior` | Remove a behavior from an object | target (string), behaviorId (string) | — |
| `remove_behavior` | Remove a behavior from the registry | behaviorId (string) | — |
| `set_behavior_config` | Update configuration parameters for a behavior attached to an object | target (string), behaviorId (string) | attributesData (object), enabled (boolean) |

### Physics Commands (3)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `enable_physics` | Enable physics simulation for a 3D object | target (string) | — |
| `disable_physics` | Disable physics simulation for a 3D object | target (string) | — |
| `set_physics` | Configure detailed physics properties (shape, mass, friction, restitution, collision type, etc.) | target (string), config (object) | — |

### Asset Commands (4)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `search_local_assets` | Search for 3D models and assets in the library | phrases (array) | — |
| `search_external_assets` | Search for 3D models and assets from external providers | prompt (string) | provider (string) |
| `generate_3d_model` | Generate a 3D model using AI from text description | prompt (string) | name (string), position (object), parent (string) |
| `add_model_to_scene` | Add a 3D model from an external provider to the scene | id (string), name (string), provider (string), downloadUrl (string) | position (object), width (number), height (number), parent (string) |

### VFX Commands (6)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `add_vfx` | Create a new particle system VFX effect | name (string) | position (object), config (object) |
| `modify_vfx` | Modify properties of an existing VFX (particle emitter) | target (string) | position (object), rotation (object), scale (object), config (object), action (string) |
| `delete_vfx` | Remove a VFX particle system | target (string) | — |
| `get_vfx` | Get information about a VFX particle system | target (string) | — |
| `add_vfx_behavior` | Add a behavior to a VFX particle system | target (string), behaviorType (string), config (object) | — |
| `remove_vfx_behavior` | Remove a behavior from a VFX particle system | target (string), behaviorIndex (number) | — |

### Prefab/Stem Commands (4)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `list_prefabs` | List all prefabs in the current scene with optional filtering | — | filter (string) |
| `get_prefab` | Get detailed information about a specific prefab by ID | id (string) | — |
| `create_prefab` | Create a new prefab from an existing object in the scene | target (string) | name (string), createThumbnail (boolean) |
| `add_prefab_to_scene` | Add an existing prefab to the scene at a specific position | id (string) | position (object), name (string) |

### Editor Settings Commands (9)

| Command | Description | Required Params | Optional Params |
|---------|-------------|-----------------|-----------------|
| `set_scene_lighting` | Configure scene lighting: ambient light, hemisphere light, and shadow settings | — | ambient (object), hemisphere (object), shadows (object) |
| `set_scene_fog` | Configure scene fog: type, color, near/far distances, density | type (string) | color (string), near (number), far (number), density (number) |
| `set_scene_background` | Configure scene background: solid color, gradient, texture, or cubemap | type (string) | color (string), gradient (string), rotation (number), intensity (number), blurriness (number) |
| `set_tone_mapping` | Configure tone mapping type and exposure | type (string) | exposure (number) |
| `set_post_processing` | Configure post-processing effects: ambient occlusion, bloom, and outline | — | ao (object), bloom (object), outline (object) |
| `set_camera_settings` | Configure camera settings on a specific object: FOV, clipping planes, camera type, distance, etc. | target (string) | fov (number), near (number), far (number), cameraType (string), defaultDistance (number), minDistance (number), maxDistance (number), headHeight (number), axis (string), occlusionType (string) |
| `set_game_settings` | Configure game rules: lives, score, timer, multiplayer, avatar, HUD, sandbox mode | — | enabled (boolean), lives (number), maxScore (number), timer (number), useAvatar (boolean), isMultiplayer (boolean), showHUD (boolean), isSandbox (boolean), voiceChatEnabled (boolean) |
| `set_rendering_settings` | Configure rendering quality: shadows, instancing, shadow map type, physics worker | — | useShadows (boolean), useInstancing (boolean), shadowMapType (number), usePhysicsWorker (boolean) |
| `get_editor_settings` | Get current editor settings by category | — | category (string) |

---

## Detailed Parameter Reference

### Object Parameters

#### `create_primitive`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Object type (see Primitive Types below) |
| name | string | No | Name for the object |
| position | object | No | Position `{x, y, z}` |
| scale | object | No | Scale `{x, y, z}` |
| rotation | object | No | Rotation `{x, y, z}` in radians |
| color | string | No | Hex color (e.g., `'#ff0000'`) |
| parent | string | No | Parent object name or UUID |

#### `clone_object`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID to clone |
| position | object | No | Position `{x, y, z}` for the cloned object |

#### `modify_object`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID |
| position | object | No | New position `{x, y, z}` |
| rotation | object | No | New rotation `{x, y, z}` in radians |
| scale | object | No | New scale `{x, y, z}` |
| color | string | No | New hex color |
| name | string | No | New name |
| tag | string or array | No | Tag or tags to add to the object. Use `Player` on the playable player object so player-aware systems and camera follow can resolve it. |

### Material & Texture Parameters

#### `set_material`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID |
| color | string | No | Hex color |
| opacity | number | No | Opacity (0-1) |
| metalness | number | No | Metalness (0-1) |
| roughness | number | No | Roughness (0-1) |

#### `set_texture`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID |
| textureUrl | string | Yes | URL to texture image |
| textureType | string | No | Type: `'map'`, `'normalMap'`, `'roughnessMap'` (default: `'map'`) |

#### `set_external_texture`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID |
| assetId | string | Yes | Asset ID from the external provider |
| assetType | string | Yes | Asset type: `'textures'` or `'hdris'` |
| name | string | Yes | Name of the texture/HDRI |
| provider | string | Yes | Provider: `'polyhaven'` or other supported providers |

### Behavior Parameters

#### `add_behavior`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Name of the behavior |
| code | string | Yes | Behavior code/script |
| metadata | object | No | Metadata for the behavior |
| version | string | No | Version of the behavior |
| description | string | No | Description of the behavior |
| author | string | No | Author of the behavior |

#### `update_behavior`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| behaviorId | string | Yes | ID of the behavior to update |
| code | string | Yes | Updated behavior code/script |
| name | string | No | Updated name |
| metadata | object | No | Updated metadata |
| version | string | No | Updated version |
| description | string | No | Updated description |
| author | string | No | Updated author |

#### `set_behavior_config`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID |
| behaviorId | string | Yes | ID of behavior to update |
| attributesData | object | No | New behavior attributes configuration |
| enabled | boolean | No | Whether the behavior is enabled |

### Physics Parameters

#### `set_physics`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID |
| config | object | Yes | Physics configuration object with properties like `enabled`, `shape`, `mass`, `friction`, `restitution`, `ctype`, etc. |

### Asset Parameters

#### `search_local_assets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| phrases | array | Yes | Array of search phrases that describe the desired asset |

#### `search_external_assets`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| prompt | string | Yes | Search prompt describing the desired asset |
| provider | string | No | Provider: `'sketchfab'`, `'polyhaven'`, `'meshy'`, `'local'` |

#### `add_model_to_scene`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Asset ID from the external provider |
| name | string | Yes | Name for the model in the scene |
| provider | string | Yes | Provider: `'sketchfab'`, `'polyhaven'`, `'meshy'`, or `'local'` |
| downloadUrl | string | Yes | Download URL for the model. Required for `'local'` provider; for others use empty string. |
| position | object | No | Position `{x, y, z}` to place the model |
| width | number | No | Width of the model (default: 1) |
| height | number | No | Height of the model (default: 1) |
| parent | string | No | Parent object name or UUID |

### VFX Parameters

#### `add_vfx`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Name for the VFX |
| position | object | No | Position `{x, y, z}` |
| config | object | No | Custom particle system configuration |

#### `modify_vfx`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | VFX emitter name or UUID |
| position | object | No | New position `{x, y, z}` |
| rotation | object | No | New rotation `{x, y, z}` in radians |
| scale | object | No | New scale `{x, y, z}` |
| config | object | No | ParticleSystem configuration object. Supports all `ParticleSystemParameters`: `duration`, `looping`, `worldSpace`, `emissionOverTime`, `emissionOverDistance`, `startLife`, `startSpeed`, `startSize`, `startLength`, `startColor`, `startRotation`, `shape`, `material` (with texture map support), `renderMode`, `emissionBursts`, `autoDestroy`, `prewarm`, `onlyUsedByOther`, `speedFactor`, `renderOrder`, `uTileCount`, `vTileCount`, `blendTiles`, `softParticles`, `softFarFade`, `softNearFade`, etc. Do NOT include `behaviors` -- use `add_vfx_behavior` instead. |
| action | string | No | Playback control: `'play'`, `'stop'`, `'pause'`, `'restart'` |

#### `add_vfx_behavior`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | VFX name or UUID |
| behaviorType | string | Yes | Behavior type (e.g., `ColorOverLife`, `SizeOverLife`, `RotationOverLife`) |
| config | object | Yes | Behavior configuration |

### Editor Settings Parameters

#### `set_scene_lighting`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ambient | object | No | Ambient light config `{color?: string, intensity?: number}` |
| hemisphere | object | No | Hemisphere light config `{skyColor?: string, groundColor?: string, intensity?: number}` |
| shadows | object | No | Shadow config `{enabled?: boolean, mapType?: number}` |

#### `set_scene_fog`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Fog type: `'none'`, `'linear'`, or `'exponential'` |
| color | string | No | Fog color hex (e.g., `'#aaaaaa'`) |
| near | number | No | Fog start distance (linear fog) |
| far | number | No | Fog end distance (linear fog) |
| density | number | No | Fog density (exponential fog) |

#### `set_scene_background`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Background type: `'Color'`, `'Texture'`, `'Cubemap'`, or `'Gradient'` |
| color | string | No | Background color hex |
| gradient | string | No | CSS gradient string |
| rotation | number | No | Background rotation |
| intensity | number | No | Background intensity |
| blurriness | number | No | Background blurriness |

#### `set_tone_mapping`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Tone mapping type: `'None'`, `'Linear'`, `'Reinhard'`, `'Cineon'`, `'ACESFilmic'` |
| exposure | number | No | Tone mapping exposure (default: 1.0) |

#### `set_post_processing`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ao | object | No | Ambient occlusion config `{enabled?, kernelRadius?, minDistance?, maxDistance?}` |
| bloom | object | No | Bloom config `{enabled?, strength?, radius?, threshold?}` |
| outline | object | No | Outline config `{enabled?, edgeStrength?, edgeGlow?, edgeThickness?}` |

#### `set_camera_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| target | string | Yes | Object name or UUID to configure camera on |
| fov | number | No | Field of view in degrees |
| near | number | No | Near clipping plane |
| far | number | No | Far clipping plane |
| cameraType | string | No | Camera type: `'THIRD_PERSON'`, `'FIRST_PERSON'`, `'TOP_DOWN'`, `'SIDE_SCROLLER'` |
| defaultDistance | number | No | Default camera distance |
| minDistance | number | No | Minimum camera distance |
| maxDistance | number | No | Maximum camera distance |
| headHeight | number | No | Camera head height (first-person) |
| axis | string | No | Camera axis constraint (e.g., `'Z'` for side-scroller) |
| occlusionType | string | No | Camera occlusion handling type |

#### `set_game_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| enabled | boolean | No | Enable game mode |
| lives | number | No | Number of lives |
| maxScore | number | No | Maximum score to win |
| timer | number | No | Game timer in seconds (0 = no timer) |
| useAvatar | boolean | No | Use avatar system |
| isMultiplayer | boolean | No | Enable multiplayer |
| showHUD | boolean | No | Show HUD overlay |
| isSandbox | boolean | No | Enable sandbox mode |
| voiceChatEnabled | boolean | No | Enable voice chat |

#### `set_rendering_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| useShadows | boolean | No | Enable shadow rendering |
| useInstancing | boolean | No | Enable GPU instancing |
| shadowMapType | number | No | Shadow map type (THREE constant) |
| usePhysicsWorker | boolean | No | Run physics in web worker |

#### `get_editor_settings`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | No | Settings category: `'lighting'`, `'fog'`, `'background'`, `'toneMapping'`, `'postProcessing'`, `'game'`, `'rendering'`, or `'all'` (default: `'all'`) |

---

## Primitive Types

Available types for `create_primitive`:

`box`, `sphere`, `cylinder`, `cone`, `plane`, `torus`, `torusKnot`, `triangle`, `capsule`, `icosahedron`, `octahedron`, `dodecahedron`, `ring`

## Target Resolution

Objects can be referenced by:
- **Name** -- human-readable name (e.g., `"Wall"`)
- **UUID** -- unique identifier (e.g., `"abc-123-def"`)

Names are matched first; if no match, the value is treated as a UUID.

## SupportedCommands Enum

The `SupportedCommands` enum defines the exact string values for all command names:

```typescript
enum SupportedCommands {
    CreatePrimitive = "create_primitive",
    CreateGroup = "create_group",
    CloneObject = "clone_object",
    DeleteObject = "delete_object",
    MoveObject = "move_object",
    ModifyObject = "modify_object",
    GetSceneObjects = "get_scene_objects",
    GetObject = "get_object",
    GetSelectedObject = "get_selected_object",
    GetPlayer = "get_player",
    SetMaterial = "set_material",
    SetTexture = "set_texture",
    SetExternalTexture = "set_external_texture",
    ListBehaviors = "list_behaviors",
    GetBehavior = "get_behavior",
    AddBehavior = "add_behavior",
    UpdateBehavior = "update_behavior",
    AttachBehavior = "attach_behavior",
    DetachBehavior = "detach_behavior",
    RemoveBehavior = "remove_behavior",
    SetBehaviorConfig = "set_behavior_config",
    EnablePhysics = "enable_physics",
    DisablePhysics = "disable_physics",
    SetPhysics = "set_physics",
    Generate3DModel = "generate_3d_model",
    SearchLocalAssets = "search_local_assets",
    SearchExternalAssets = "search_external_assets",
    AddModelToScene = "add_model_to_scene",
    AddVFX = "add_vfx",
    ModifyVFX = "modify_vfx",
    DeleteVFX = "delete_vfx",
    GetVFX = "get_vfx",
    AddVFXBehavior = "add_vfx_behavior",
    RemoveVFXBehavior = "remove_vfx_behavior",
    ListPrefabs = "list_prefabs",
    GetPrefab = "get_prefab",
    AddPrefabToScene = "add_prefab_to_scene",
    CreatePrefab = "create_prefab",
    SetSceneLighting = "set_scene_lighting",
    SetSceneFog = "set_scene_fog",
    SetSceneBackground = "set_scene_background",
    SetToneMapping = "set_tone_mapping",
    SetPostProcessing = "set_post_processing",
    SetCameraSettings = "set_camera_settings",
    SetGameSettings = "set_game_settings",
    SetRenderingSettings = "set_rendering_settings",
    GetEditorSettings = "get_editor_settings",
}
```

## Coordinate System

Three.js right-handed convention. Forward is **-Z**, not +Z.

- **X-axis:** -X left, **+X right**
- **Y-axis:** -Y down, **+Y up** (gravity is on Y; `-9.81` is Earth-like)
- **Z-axis:** **-Z forward (away from camera)**, +Z back (toward camera)
- **Rotation:** radians (pi = 180 degrees)
- **Origin:** (0, 0, 0) = scene center

## Response Format

All responses follow JSONRPC 2.0:
```json
{
  "jsonrpc": "2.0",
  "result": { "success": true, "data": {...} },
  "id": 1
}
```

Asset search commands may include `userInteractionData` in the response when the user interacts with the search UI in Studio.
