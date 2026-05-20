# VFX / Particle System

Three.Quarks particle config, VFX behaviors, emitter shapes, and render modes.

## Library

StemStudio uses **three.quarks** for GPU-accelerated particle systems. Import: `import { ParticleSystem, ... } from "three.quarks"`.

## ParticleSystem Config

Key properties of a Three.Quarks `ParticleSystem`:

| Property | Type | Description |
|----------|------|-------------|
| `duration` | number | System lifetime in seconds |
| `looping` | boolean | Loop playback |
| `worldSpace` | boolean | Particles in world vs local space |
| `emissionOverTime` | ValueGenerator | Particles emitted per second |
| `emissionOverDistance` | ValueGenerator | Particles emitted per unit moved |
| `startLife` | ValueGenerator | Particle lifetime (seconds) |
| `startSpeed` | ValueGenerator | Initial speed |
| `startSize` | ValueGenerator | Initial size |
| `startColor` | ColorGenerator | Initial color |
| `startRotation` | ValueGenerator | Initial rotation |
| `startTileIndex` | ValueGenerator | UV tile index (sprite sheets) |
| `renderMode` | RenderMode | How particles are rendered |
| `renderOrder` | number | Draw order |
| `material` | Material | Particle material |
| `instancingGeometry` | BufferGeometry | Custom mesh (Mesh render mode) |
| `blendTiles` | boolean | Blend between sprite sheet tiles |
| `softParticles` | boolean | Soft particle depth blending |
| `softNearFade` | number | Near fade distance (0–1) |
| `softFarFade` | number | Far fade distance (0–1) |

### ValueGenerator Types

Properties like `startLife`, `startSpeed`, `startSize` accept generator types:
- **Constant**: `{ type: "value", value: 1.0 }`
- **Range**: `{ type: "randomBetweenTwoConstants", a: 0.5, b: 1.5 }`
- **Curve**: bezier curve over lifetime

## Render Modes

```typescript
enum RenderMode {
  BillBoard,           // Always faces camera (default)
  StretchedBillBoard,  // Stretched along velocity (has speedFactor)
  Mesh,                // Custom 3D mesh geometry
  Trail,               // Trail ribbons behind particles
}
```

- **BillBoard**: Standard camera-facing quads
- **StretchedBillBoard**: Stretched in movement direction; `speedFactor` controls stretch amount
- **Mesh**: Renders instanced geometry (select mesh type)
- **Trail**: Particle trails with `WidthOverLength` behavior support

## VFX Behaviors (Over-Lifetime Modifiers)

Applied to particles during their lifetime:

| Behavior | Description |
|----------|-------------|
| `ColorOverLife` | Interpolate color over particle lifetime |
| `SizeOverLife` | Scale size over lifetime (curve/gradient) |
| `RotationOverLife` | Rotate over lifetime |
| `SpeedOverLife` | Accelerate/decelerate over lifetime |
| `ForceOverLife` | Apply constant force (gravity, wind) |
| `OrbitOverLife` | Orbit around emitter axis |
| `WidthOverLength` | Trail width along trail length |
| `FrameOverLife` | Animate sprite sheet frames over lifetime |

Each behavior is configured via the `add_vfx_behavior` command:
```
POST /api/studio/scene/add-vfx-behavior/:sessionId
{ "target": "MyVFX", "behaviorType": "ColorOverLife", "config": {...} }
```

Remove with `remove_vfx_behavior` by index.

## Emitter Shapes

| Shape | Description |
|-------|-------------|
| `PointEmitter` | Emit from a single point |
| `SphereEmitter` | Emit from sphere surface/volume |
| `ConeEmitter` | Emit from cone surface |
| `DonutEmitter` | Emit from torus shape |
| `HemisphereEmitter` | Emit from hemisphere |
| `CircleEmitter` | Emit from circle |
| `MeshSurfaceEmitter` | Emit from mesh surface |

## Material Configuration

Particle systems support three material types:

| Material | Class |
|----------|-------|
| Basic | `THREE.MeshBasicMaterial` |
| Standard | `THREE.MeshStandardMaterial` |
| Physical | `THREE.MeshPhysicalMaterial` |

Material properties:
- **Texture**: Upload PNG/JPEG/WebP as particle texture
- **Blending**: `Normal` or `Additive` (for glowing effects)
- **Transparent**: Enable alpha transparency
- **Blend Color**: Tint color applied to particles
- **Side**: `FrontSide`, `BackSide`, `DoubleSide`
- **Depth Write/Test**: Control depth buffer behavior

## Playback Actions

Control via the `modify_vfx` command's `action` parameter:

| Action | Description |
|--------|-------------|
| `play` | Start/resume playback |
| `stop` | Stop and reset |
| `pause` | Pause at current state |
| `restart` | Stop then play from beginning |

## Agent Commands

| Command | Method | Key Params |
|---------|--------|------------|
| `add_vfx` | POST | name, position?, preset?, config? |
| `modify_vfx` | POST | target, config?, action? |
| `delete_vfx` | DELETE | target |
| `get_vfx` | GET | target |
| `add_vfx_behavior` | POST | target, behaviorType, config? |
| `remove_vfx_behavior` | DELETE | target, behaviorIndex |

## Example: Fire Effect

```json
{
  "name": "CampFire",
  "config": {
    "duration": 5,
    "looping": true,
    "emissionOverTime": 50,
    "startLife": { "type": "randomBetweenTwoConstants", "a": 0.5, "b": 1.5 },
    "startSpeed": { "type": "value", "value": 2 },
    "startSize": { "type": "randomBetweenTwoConstants", "a": 0.1, "b": 0.3 },
    "shape": { "type": "cone", "radius": 0.2, "angle": 15 }
  }
}
```

Then add behaviors:
- `ColorOverLife` — orange → red → transparent
- `SizeOverLife` — grow then shrink
- `SpeedOverLife` — decelerate upward

## VisualEffect Behavior

The `visualEffect` behavior pack (`web/src/behaviors/packs/visualEffect/`) wraps the particle system and can trigger playback from 40+ IN_GAME_EVENTS. Configure trigger events in the behavior's attributes to auto-play effects on game events like `character.action.jump`, `consumable.collected`, etc.
