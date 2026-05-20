# Editor Settings Reference

Reference documentation for all StemStudio editor settings: types, defaults, valid ranges, and events fired.

## Settings Storage

All settings are stored on the scene's `userData` object:

| Setting Group | Storage Path | Event Fired |
|--------------|-------------|-------------|
| Ambient Light | `scene.userData.game.rendering.ambient` | `objectChanged` |
| Hemisphere Light | `scene.userData.game.rendering.hemisphere` | `objectChanged` |
| Shadows | `scene.userData.game.useShadows` + `rendering.shadowMapType` | `objectChanged` |
| Fog | `scene.userData.game.rendering.fog` | `objectChanged` |
| Background | `scene.userData.game.rendering.background` | `objectChanged` |
| Tone Mapping | `scene.userData.game.rendering.toneMapping` | `objectChanged` |
| Post-Processing | `scene.userData.postProcessing` | `objectChanged` |
| Camera | `object.userData.cameraData` (per-object) | `objectChanged` |
| Game Settings | `scene.userData.game.*` | `objectChanged` |
| Rendering | `scene.userData.game.*` + `rendering.*` | `objectChanged` |

## Ambient Light

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `color` | string (hex) | `"#ffffff"` | Any hex color | Light color |
| `intensity` | number | `0` | 0 - 5 | Light intensity |

## Hemisphere Light

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `skyColor` | string (hex) | `"#ffffff"` | Any hex color | Sky hemisphere color |
| `groundColor` | string (hex) | `"#888888"` | Any hex color | Ground hemisphere color |
| `intensity` | number | `0` | 0 - 5 | Light intensity |

## Fog

| Property | Type | Default | Valid Values | Description |
|----------|------|---------|-------------|-------------|
| `type` | string | `"none"` | `"none"`, `"linear"`, `"exponential"` | Fog type |
| `color` | string (hex) | `"#aaaaaa"` | Any hex color | Fog color |
| `near` | number | `5` | > 0 | Start distance (linear only) |
| `far` | number | `150` | > near | End distance (linear only) |
| `density` | number | `0.011` | 0 - 1 | Density (exponential only) |

## Background

| Property | Type | Default | Valid Values | Description |
|----------|------|---------|-------------|-------------|
| `type` | string | `"Color"` | `"Color"`, `"Texture"`, `"Cubemap"`, `"Gradient"` | Background type |
| `color` | string (hex) | `"#27272a"` | Any hex color | Background color |
| `texture` | string | `""` | URL or asset ID | Texture source |
| `cubemap` | string[6] | `["","","","","",""]` | 6 URLs | Cubemap faces (px, nx, py, ny, pz, nz) |
| `rotation` | number | `0` | 0 - 2*PI | Background rotation (radians) |
| `intensity` | number | `1` | 0 - 10 | Environment intensity |
| `blurriness` | number | `0` | 0 - 1 | Background blur |
| `gradient` | string | (see default) | CSS gradient | Gradient string |
| `gradientMode` | string | `"2d"` | `"2d"`, `"3d"` | Gradient render mode |

Default gradient: `"linear-gradient(0deg, #3e4455 0%, #3e4455 65%, #4f576d 85%, #59677f 100%)"`

## Tone Mapping

| Property | Type | Default | Valid Values | Description |
|----------|------|---------|-------------|-------------|
| `type` | string | `"None"` | `"None"`, `"Linear"`, `"Reinhard"`, `"Cineon"`, `"ACESFilmic"` | Tone mapping algorithm |
| `exposure` | number | `1.0` | 0 - 10 | Exposure level |

### THREE.js Tone Mapping Constants

| Type String | THREE Constant | Value |
|------------|---------------|-------|
| `"None"` | `THREE.NoToneMapping` | 0 |
| `"Linear"` | `THREE.LinearToneMapping` | 1 |
| `"Reinhard"` | `THREE.ReinhardToneMapping` | 2 |
| `"Cineon"` | `THREE.CineonToneMapping` | 3 |
| `"ACESFilmic"` | `THREE.ACESFilmicToneMapping` | 4 |

## Post-Processing

### Ambient Occlusion (AO)

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `enabled` | boolean | `false` | — | Enable AO |
| `kernelRadius` | number | `8` | 1 - 64 | Sample radius |
| `minDistance` | number | `0.005` | 0 - 1 | Minimum depth distance |
| `maxDistance` | number | `0.1` | 0 - 1 | Maximum depth distance |

### Bloom

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `enabled` | boolean | `false` | — | Enable bloom |
| `strength` | number | `0.5` | 0 - 3 | Bloom intensity |
| `radius` | number | `0.4` | 0 - 1 | Bloom radius |
| `threshold` | number | `0.85` | 0 - 1 | Luminance threshold |

### Outline

| Property | Type | Default | Range | Description |
|----------|------|---------|-------|-------------|
| `enabled` | boolean | `false` | — | Enable outline |
| `edgeStrength` | number | `3` | 1 - 10 | Edge intensity |
| `edgeGlow` | number | `0` | 0 - 1 | Edge glow amount |
| `edgeThickness` | number | `1` | 1 - 4 | Edge width |

## Camera Settings (per-object)

| Property | Type | Default | Valid Values | Description |
|----------|------|---------|-------------|-------------|
| `fov` | number | `60` | 30 - 120 | Field of view (degrees) |
| `near` | number | `0.1` | > 0 | Near clipping plane |
| `far` | number | `1000` | > near | Far clipping plane |
| `cameraType` | string | `"THIRD_PERSON"` | `"THIRD_PERSON"`, `"FIRST_PERSON"`, `"TOP_DOWN"`, `"SIDE_SCROLLER"` | Camera mode |
| `defaultDistance` | number | `10` | > 0 | Default camera distance |
| `minDistance` | number | `2` | > 0 | Minimum zoom distance |
| `maxDistance` | number | `30` | > minDistance | Maximum zoom distance |
| `headHeight` | number | `1.7` | > 0 | Eye height (first-person) |
| `axis` | string | `""` | `""`, `"X"`, `"Y"`, `"Z"` | Camera axis constraint |
| `occlusionType` | string | `""` | `""`, `"fade"`, `"clip"` | How camera handles obstacles |

## Game Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable game mode |
| `lives` | number | `0` | Number of player lives (0 = unlimited) |
| `maxScore` | number | `0` | Score needed to win (0 = no win condition) |
| `timer` | number | `0` | Game timer in seconds (0 = no timer) |
| `useAvatar` | boolean | `false` | Use avatar system |
| `isMultiplayer` | boolean | `false` | Enable multiplayer |
| `showHUD` | boolean | `false` | Show HUD overlay |
| `isSandbox` | boolean | `false` | Sandbox mode (no win/lose) |
| `voiceChatEnabled` | boolean | `false` | Enable voice chat |

## Rendering Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `useShadows` | boolean | `false` | Enable shadow rendering |
| `useInstancing` | boolean | `false` | Enable GPU instancing |
| `shadowMapType` | number | `2` (PCFSoftShadowMap) | Shadow map algorithm |
| `usePhysicsWorker` | boolean | `false` | Run physics in web worker |

### Shadow Map Types (THREE.js Constants)

| Constant | Value | Description |
|----------|-------|-------------|
| `THREE.BasicShadowMap` | 0 | Fastest, lowest quality |
| `THREE.PCFShadowMap` | 1 | Percentage-Closer Filtering |
| `THREE.PCFSoftShadowMap` | 2 | Soft PCF (default, best quality) |
| `THREE.VSMShadowMap` | 3 | Variance Shadow Map |

## Commands Summary

| Command | Method | Required Params | Optional Params |
|---------|--------|----------------|-----------------|
| `get_editor_settings` | GET | — | `category` |
| `set_scene_lighting` | POST | — | `ambient`, `hemisphere`, `shadows` |
| `set_scene_fog` | POST | `type` | `color`, `near`, `far`, `density` |
| `set_scene_background` | POST | `type` | `color`, `gradient`, `rotation`, `intensity`, `blurriness` |
| `set_tone_mapping` | POST | `type` | `exposure` |
| `set_post_processing` | POST | — | `ao`, `bloom`, `outline` |
| `set_camera_settings` | POST | `target` | `fov`, `near`, `far`, `cameraType`, `defaultDistance`, `minDistance`, `maxDistance`, `headHeight`, `axis`, `occlusionType` |
| `set_game_settings` | POST | — | `enabled`, `lives`, `maxScore`, `timer`, `useAvatar`, `isMultiplayer`, `showHUD`, `isSandbox`, `voiceChatEnabled` |
| `set_rendering_settings` | POST | — | `useShadows`, `useInstancing`, `shadowMapType`, `usePhysicsWorker` |
