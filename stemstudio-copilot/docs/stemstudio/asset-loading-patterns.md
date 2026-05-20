# Asset Loading Patterns

Load when: a behavior needs textures, models, audio, video, or prefab/stem assets.

Cross-reference:
- [behavior-system.md](behavior-system.md) for attribute types and `erth.asset`
- [commands-reference.md](commands-reference.md) for static scene texture/material commands

## Asset Attribute Rule

When a behavior needs an external asset, reference it through an attribute instead of hardcoding asset IDs or names.

Use these attribute types:
- `imageAsset`
- `modelAsset`
- `audioAsset`
- `videoAsset`
- `prefab`

Runtime flow:
1. Define the asset attribute in `behavior.json`
2. The user or copilot assigns it through behavior config
3. Read the resolved value from `this.attributes`
4. Pass it to the corresponding `erth.asset.*` API

Example `behavior.json` snippet:

```json
{
  "attributes": {
    "trackTexture": {
      "name": "Track Texture",
      "type": "imageAsset",
      "description": "Texture for the track surface"
    }
  }
}
```

Example behavior code:

```javascript
let game;

this.init = function(_game) {
  game = _game;

  const textureRef = this.attributes.trackTexture;
  if (!textureRef) return;

  this.erth.asset.image.createTexture(textureRef).then(texture => {
    this.target.material.map = texture;
    this.target.material.needsUpdate = true;
  });
};
```

## Attach-Time Asset Binding

When a behavior has asset attributes and you attach it through copilot tooling, pass config keys that match the behavior attribute keys. Values should be asset display names already available in the scene/project.

Example:

```bash
python scripts/attach_behavior.py \
  --sessionId "$SESSION_ID" \
  --target "ChessBoard" \
  --behaviorId "author.chessGame" \
  --config '{"pawnModel":"Pawn","rookModel":"Rook"}'
```

Rules:
- config keys must match attribute keys in `behavior.json`
- config values must match the imported asset names the editor knows about
- without config, asset attributes remain unresolved and the behavior starts with empty/null refs

This is resolved by the engine's attach flow before the behavior runs.

## Static Scene Textures vs Runtime Textures

Preferred split:
- Static scene setup: use material/texture commands from [commands-reference.md](commands-reference.md)
- Runtime or dynamic swapping: use behavior code with `erth.asset.image.createTexture(...)`

Use behavior code when:
- texture choice depends on gameplay state
- multiple material channels are swapped dynamically
- assets are loaded lazily

## Multi-Channel Texture Assignment

`createTexture()` returns a regular `THREE.Texture`, so it can be assigned to any supported material channel.

Common channels:

| Channel | Property | Notes |
|---------|----------|-------|
| Color | `material.map` | Primary color/albedo |
| Normal | `material.normalMap` | Usually pair with `normalScale` |
| Roughness | `material.roughnessMap` | White = rough, black = smooth |
| Metalness | `material.metalnessMap` | White = metal, black = dielectric |
| Emissive | `material.emissiveMap` | Also set emissive color/intensity |
| AO | `material.aoMap` | Requires UV2 |
| Displacement | `material.displacementMap` | Also set displacement scale |
| Alpha | `material.alphaMap` | Enable transparency when needed |
| Bump | `material.bumpMap` | Simpler height-based detail |

Multi-channel attribute pattern:

```json
{
  "attributes": {
    "colorTexture": { "name": "Color Map", "type": "imageAsset" },
    "normalTexture": { "name": "Normal Map", "type": "imageAsset" },
    "roughnessTexture": { "name": "Roughness Map", "type": "imageAsset" }
  }
}
```

```javascript
let game;

this.init = function(_game) {
  game = _game;

  const material = this.target.material;
  const imageApi = this.erth.asset.image;

  if (this.attributes.colorTexture) {
    imageApi.createTexture(this.attributes.colorTexture).then(texture => {
      material.map = texture;
      material.needsUpdate = true;
    });
  }

  if (this.attributes.normalTexture) {
    imageApi.createTexture(this.attributes.normalTexture).then(texture => {
      material.normalMap = texture;
      material.normalScale = new THREE.Vector2(1, 1);
      material.needsUpdate = true;
    });
  }

  if (this.attributes.roughnessTexture) {
    imageApi.createTexture(this.attributes.roughnessTexture).then(texture => {
      material.roughnessMap = texture;
      material.needsUpdate = true;
    });
  }
};
```

Store any loaded textures so they can be disposed in `dispose()`.

## `createInstance()` Return Type

`erth.asset.model.createInstance()` returns a `GameObject`, not a raw Three.js `Object3D`.

That means:
- no `traverse()` on the wrapper itself
- no direct `children` usage on the wrapper
- use `instance._internal.three` when you need raw Three.js access

Example:

```javascript
const instance = await this.erth.asset.model.createInstance(this.attributes.enemyModel);
const threeObject = instance._internal.three;

threeObject.traverse(child => {
  if (child.isMesh) {
    child.castShadow = true;
  }
});
```

## Converting Raw `Object3D` to `GameObject`

When you create raw Three.js objects procedurally and want to add them through `erth.scene.addObject()`, wrap them first:

```javascript
this.init = async function(_game) {
  const geometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
  const material = new THREE.MeshStandardNodeMaterial({ color: 0x44aa88 });
  const mesh = new THREE.Mesh(geometry, material);

  const pole = this.erth.object.createFromThreeObject(mesh);
  pole.position.set(3, 1, 0);
  pole.physics.configure({
    enabled: true,
    bodyType: "static",
    shape: "box",
  });

  await this.erth.scene.addObject(pole);
};
```

Use this when:
- geometry is created procedurally
- you need engine-aware physics/configuration on the result

Do not use it for:
- `erth.asset.model.createInstance()`
- `erth.asset.stem.createInstance()`

Those already return `GameObject`.

## Name-Based Lookup with `findByName`

Prefer asset attributes first. Use `findByName` when the asset is chosen dynamically or when attributes would be impractical.

Available helpers:
- `this.erth.asset.image.findByName(name)`
- `this.erth.asset.model.findByName(name)`
- `this.erth.asset.audio.findByName(name)`
- `this.erth.asset.video.findByName(name)`
- `this.erth.asset.stem.findByName(name)`

Example:

```javascript
let game;

this.init = async function(_game) {
  game = _game;

  let ref = this.attributes.trackTexture;
  if (!ref) {
    ref = await this.erth.asset.image.findByName("TrackTexture");
  }

  if (!ref) return;

  const texture = await this.erth.asset.image.createTexture(ref);
  this.target.material.map = texture;
  this.target.material.needsUpdate = true;
};
```

`audio.getUrl()` and `video.getUrl()` also accept `{ name: "..." }` directly as a convenience. Other loaders should use `findByName()` first.

## Common Mistakes

| Wrong | Why | Right |
|-------|-----|-------|
| Hardcoding asset IDs | IDs differ across scenes/projects | Use asset attributes |
| Hardcoding asset names in logic | Fragile and harder to retarget | Prefer attributes, then `findByName` |
| Calling `createTexture({ name: "Foo" })` | `createTexture` expects `AssetRef` | Use `findByName`, then pass the returned ref |
| Calling `instance.traverse(...)` on `GameObject` | `GameObject` is not `Object3D` | Use `instance._internal.three.traverse(...)` |
| Attaching behavior with missing asset config | Asset refs do not resolve | Pass matching config keys during attach |
