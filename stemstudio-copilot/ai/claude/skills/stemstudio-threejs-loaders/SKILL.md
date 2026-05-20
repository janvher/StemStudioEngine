---
name: stemstudio-threejs-loaders
description: Runtime asset loading in StemStudio behaviors. Use when the user asks to load GLTF/GLB models at runtime, stream level content, load assets from URLs dynamically, or handle Draco/KTX2 compressed assets inside behaviors. For known project assets, prefer game.prefabManager or JSONRPC add_model_to_scene commands.
---

# StemStudio Runtime Asset Loading

Load GLTF/GLB models and assets at runtime inside behaviors. For known project assets, prefer `game.prefabManager.instantiate()` or the `add_model_to_scene` JSONRPC command. Use behavior-side loading for dynamic URL-based assets, level streaming, or runtime model spawning.

## Authoritative References

- **~/.claude/stemstudio-docs/behavior-system.md** — Behavior lifecycle and runtime context
- **~/.claude/stemstudio-docs/prefab-system.md** — PrefabManager for managed asset instantiation
- **~/.claude/stemstudio-types/stem-types.d.ts** — ErthInterface asset management APIs

## StemStudio Context

- Three.js 0.182 is available via the `THREE` global inside behaviors
- **Renderer: WebGPURenderer with WebGL fallback** — StemStudio uses `THREE.WebGPURenderer` as the primary renderer, falling back to WebGL on unsupported devices. GLTF/GLB loading and model rendering work identically across both renderers. Do NOT create renderers in behaviors — the engine owns the render pipeline.
- **Asset loading priority** (use the first that fits):
  1. `game.prefabManager.instantiate(prefabId)` — For known prefabs/stems (managed, cached)
  2. `this.erth.asset.model.createFromUrl(params)` — For dynamic URL-based loading (engine-integrated)
  3. `add_model_to_scene` JSONRPC command — For adding project models from the copilot
  4. Raw `THREE.GLTFLoader` — Only for advanced cases (custom processing, LOD switching)
- **Load in `init()` or `onStart()`, use in `onStart()` or `update()`** — Never block `update()` with loading
- Always clean up loaded assets in `dispose()`
- No ES module imports — loaders are available as `THREE.GLTFLoader`, `THREE.DRACOLoader`, etc.

## When To Read More

- Need behavior lifecycle placement for async loading: `~/.claude/stemstudio-docs/behavior-system.md`
- Need prefab-managed loading rules: `~/.claude/stemstudio-docs/prefab-system.md`
- Need exact ErthInterface asset APIs: `~/.claude/stemstudio-types/stem-types.d.ts`

## Quick Start — Load Model from URL

```javascript
let game;

this.init = async function (_game) {
    game = _game;
    this._loadedModel = null;
};

this.onStart = async function () {
    const url = this.attributes.modelUrl;
    if (!url) return;

    try {
        // Preferred: use ErthInterface for engine-integrated loading
        const result = await this.erth.asset.model.createFromUrl({
            url: url,
            name: this.attributes.modelName || 'DynamicModel',
        });
        if (result) {
            this._loadedModel = result;
            result.position.copy(this.target.position);
            await this.erth.scene.addObject(result, this.target.parent);
        }
    } catch (err) {
        console.error('Failed to load model:', err);
    }
};

this.dispose = function () {
    if (this._loadedModel) {
        game.removeObject(this._loadedModel);
        this._loadedModel = null;
    }
};
```

## Using PrefabManager (Preferred for Known Assets)

```javascript
let game;

this.init = function (_game) {
    game = _game;
};

this.onStart = function () {
    this._spawnedObjects = [];
};

this.spawnEnemy = function (position) {
    const prefabId = this.attributes.enemyPrefabId;
    if (!prefabId) return;

    const instance = game.prefabManager.instantiate(prefabId);
    if (instance) {
        instance.position.copy(position);
        this._spawnedObjects.push(instance);
    }
    return instance;
};

this.dispose = function () {
    for (const obj of this._spawnedObjects) {
        game.removeObject(obj);
    }
    this._spawnedObjects = [];
};
```

## Raw GLTFLoader (Advanced Cases Only)

Use only when you need custom processing like LOD switching, vertex manipulation, or selective loading:

```javascript
let game;

this.init = async function (_game) {
    game = _game;
    this._loader = new THREE.GLTFLoader();
    this._loadedScene = null;

    // Optional: enable Draco compression support
    // DRACOLoader must be available in the runtime
    // const dracoLoader = new THREE.DRACOLoader();
    // dracoLoader.setDecoderPath('/draco/');
    // this._loader.setDRACOLoader(dracoLoader);
};

this.onStart = async function () {
    const url = this.attributes.modelUrl;
    if (!url) return;

    try {
        const gltf = await this.loadGLTF(url);
        this._loadedScene = gltf.scene;

        // Process the loaded model
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Scale and position
        gltf.scene.scale.setScalar(this.attributes.scale || 1);
        gltf.scene.position.copy(this.target.position);
        this.target.add(gltf.scene);

        // Handle animations if present
        if (gltf.animations.length > 0) {
            this._mixer = new THREE.AnimationMixer(gltf.scene);
            const action = this._mixer.clipAction(gltf.animations[0]);
            action.play();
        }
    } catch (err) {
        console.error('GLTF load failed:', err);
    }
};

this.loadGLTF = function (url) {
    return new Promise((resolve, reject) => {
        this._loader.load(url, resolve, undefined, reject);
    });
};

this.update = function (deltaTime) {
    if (this._mixer) this._mixer.update(deltaTime);
};

this.dispose = function () {
    if (this._mixer) {
        this._mixer.stopAllAction();
        this._mixer = null;
    }
    if (this._loadedScene) {
        this.target.remove(this._loadedScene);
        this._loadedScene.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        this._loadedScene = null;
    }
};
```

## Async Loading Patterns

### Load Multiple Assets in Parallel

```javascript
this.onStart = async function () {
    const urls = this.attributes.modelUrls || [];

    const loadPromises = urls.map(url =>
        this.erth.asset.model.createFromUrl({ url, name: url.split('/').pop() })
            .catch(err => { console.warn('Failed to load', url, err); return null; })
    );

    const models = await Promise.all(loadPromises);
    this._loadedModels = models.filter(Boolean);

    // Position loaded models
    this._loadedModels.forEach((model, i) => {
        model.position.set(i * 3, 0, 0);
        this.erth.scene.addObject(model, this.target);
    });
};
```

### Loading with Placeholder

Show a placeholder while the real asset loads:

```javascript
this.onStart = async function () {
    // Create placeholder
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x888888 });
    this._placeholder = new THREE.Mesh(geo, mat);
    this.target.add(this._placeholder);

    // Load real model
    try {
        const model = await this.erth.asset.model.createFromUrl({
            url: this.attributes.modelUrl
        });
        // Remove placeholder, add real model
        this.target.remove(this._placeholder);
        geo.dispose();
        mat.dispose();
        this._placeholder = null;

        if (model) {
            await this.erth.scene.addObject(model, this.target);
            this._loadedModel = model;
        }
    } catch (err) {
        console.error('Load failed, keeping placeholder');
    }
};
```

## Asset Loading Decision Guide

| Scenario | Use |
|----------|-----|
| Spawn a known prefab/enemy/item | `game.prefabManager.instantiate(prefabId)` |
| Add a project model to scene | `add_model_to_scene` JSONRPC command |
| Load model from external URL | `this.erth.asset.model.createFromUrl()` |
| Custom GLTF processing/LOD | Raw `THREE.GLTFLoader` |
| Spawn many identical objects | `game.prefabManager` + object pool pattern |

## Verification

- `get_scene_objects` — Verify loaded model appears in scene hierarchy
- Enter Play Mode — Confirm model renders and animations play
- Check console for loading errors (404, CORS, Draco decoder path)

## When Things Go Wrong

- **Model not appearing** — Check URL is valid and accessible. CORS may block cross-origin requests. Try `this.erth.asset.model.createFromUrl()` first.
- **Model is tiny/huge** — GLTF models may have different scale conventions. Apply `.scale.setScalar()` after loading
- **Animations not playing** — Check `gltf.animations.length > 0`. Create `AnimationMixer` and call `.update(dt)` in behavior `update()`
- **Memory leak** — Traverse and dispose all geometries/materials/textures in `dispose()`. Remove from parent.
- **Loading blocks gameplay** — Always load asynchronously in `init()` or `onStart()`. Never use synchronous loading in `update()`

## See Also

- **stemstudio-behaviors** — Behavior lifecycle for asset loading patterns
- **stemstudio-prefabs** — PrefabManager for managed asset spawning (preferred)
- **stemstudio-threejs-textures** — Runtime texture loading
- **stemstudio-assets** — `add_model_to_scene` for copilot-driven model placement
