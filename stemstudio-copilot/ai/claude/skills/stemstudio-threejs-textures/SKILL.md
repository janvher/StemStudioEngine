---
name: stemstudio-threejs-textures
description: Texture management in StemStudio behaviors. Use when the user asks about dynamic textures, runtime texture loading, UV mapping adjustments, render targets (mirrors, portals, minimaps), or canvas textures for dynamic text/UI inside behaviors. For static texture assignment, prefer JSONRPC set_texture/set_external_texture commands.
---

# StemStudio Texture Management

Load and manage textures at runtime inside behaviors. For static texture assignment on existing objects, prefer the `set_texture` or `set_external_texture` JSONRPC commands. Use behavior-side texture management for dynamic/runtime textures that change during gameplay.

## Authoritative References

- **~/.claude/stemstudio-docs/behavior-system.md** — Behavior lifecycle and runtime context
- **~/.claude/stemstudio-docs/commands-reference.md** — `set_texture`, `set_external_texture` command parameters
- **~/.claude/stemstudio-types/stem-types.d.ts** — ErthInterface, asset management APIs

## StemStudio Context

- Three.js 0.182 is available via the `THREE` global inside behaviors
- **Renderer: WebGPURenderer with WebGL fallback** — StemStudio uses `THREE.WebGPURenderer` as the primary renderer, falling back to WebGL on unsupported devices. Texture APIs work identically across both renderers. `THREE.WebGLRenderTarget` is supported on both via compatibility. Do NOT create renderers in behaviors — the engine owns the render pipeline.
- **Prefer JSONRPC commands for static textures:**
  - `set_texture` — Apply project textures to objects
  - `set_external_texture` — Apply URL-based textures to objects
- Use behavior-side loading only for **dynamic/runtime textures** (textures that change during gameplay)
- Cache textures to avoid reloading — use `this.erth.asset` for managed assets when available
- Always dispose textures in `dispose()` to prevent memory leaks
- No ES module imports — use `THREE.TextureLoader`, `THREE.CanvasTexture`, etc. directly

## When To Read More

- Need behavior lifecycle placement for dynamic texture work: `~/.claude/stemstudio-docs/behavior-system.md`
- Need static texture command parameters instead of runtime texture code: `~/.claude/stemstudio-docs/commands-reference.md`
- Need exact asset-management or runtime texture types: `~/.claude/stemstudio-types/stem-types.d.ts`

## Quick Start — Dynamic Texture in a Behavior

```javascript
this.onStart = function () {
    this._loader = new THREE.TextureLoader();
    this._originalMap = this.target.material ? this.target.material.map : null;
    this._loadedTexture = null;

    // Load a texture at runtime
    this._loader.load(this.attributes.textureUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        this._loadedTexture = texture;

        if (this.target.material) {
            this.target.material.map = texture;
            this.target.material.needsUpdate = true;
        }
    });
};

this.dispose = function () {
    // Restore original and dispose loaded texture
    if (this.target.material && this._originalMap !== undefined) {
        this.target.material.map = this._originalMap;
        this.target.material.needsUpdate = true;
    }
    if (this._loadedTexture) {
        this._loadedTexture.dispose();
        this._loadedTexture = null;
    }
};
```

## Canvas Texture — Dynamic Text/Numbers

For HUD elements, damage numbers, or any text that updates at runtime:

```javascript
this.onStart = function () {
    this._canvas = document.createElement('canvas');
    this._canvas.width = 256;
    this._canvas.height = 128;
    this._ctx = this._canvas.getContext('2d');
    this._canvasTexture = new THREE.CanvasTexture(this._canvas);

    // Create a plane to display it on
    const geo = new THREE.PlaneGeometry(2, 1);
    const mat = new THREE.MeshBasicMaterial({
        map: this._canvasTexture,
        transparent: true,
        side: THREE.DoubleSide,
    });
    this._textPlane = new THREE.Mesh(geo, mat);
    this._textPlane.position.set(0, 2, 0); // Above parent
    this.target.add(this._textPlane);

    this._geo = geo;
    this._mat = mat;
    this.updateText('Ready');
};

this.updateText = function (text) {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    this._canvasTexture.needsUpdate = true;
};

this.onEvent = function (msg, data) {
    if (msg === 'score.updated') {
        this.updateText('Score: ' + data.score);
    }
};

this.dispose = function () {
    if (this._textPlane) this.target.remove(this._textPlane);
    if (this._canvasTexture) this._canvasTexture.dispose();
    if (this._geo) this._geo.dispose();
    if (this._mat) this._mat.dispose();
};
```

## Render Target — Mirrors, Portals, Minimaps

Use `THREE.WebGLRenderTarget` for real-time texture rendering:

```javascript
this.onStart = function () {
    // Create render target for a security camera / minimap
    this._renderTarget = new THREE.WebGLRenderTarget(512, 512);

    // Create a separate camera for the alternate view
    this._miniCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this._miniCamera.position.set(0, 50, 0);
    this._miniCamera.lookAt(0, 0, 0);

    // Apply render target texture to a plane
    if (this.target.material) {
        this._originalMap = this.target.material.map;
        this.target.material.map = this._renderTarget.texture;
        this.target.material.needsUpdate = true;
    }
};

// Note: Render target updates require access to the renderer,
// which may not be available in all behavior contexts.
// Consider using game.scene for the scene reference.

this.dispose = function () {
    if (this._renderTarget) this._renderTarget.dispose();
    if (this.target.material && this._originalMap !== undefined) {
        this.target.material.map = this._originalMap;
        this.target.material.needsUpdate = true;
    }
};
```

## UV Mapping Adjustment

Modify UV coordinates on existing meshes for scrolling textures, texture atlas selection:

```javascript
this.onStart = function () {
    // Scroll UV over time (conveyor belt, water flow)
    this._uvOffset = new THREE.Vector2(0, 0);
};

this.update = function (deltaTime) {
    if (!this.target.material || !this.target.material.map) return;
    const speed = this.attributes.scrollSpeed || 0.5;
    this._uvOffset.y += deltaTime * speed;
    this.target.material.map.offset.copy(this._uvOffset);
};
```

## Texture Configuration Reference

| Property | Values | Use |
|----------|--------|-----|
| `colorSpace` | `THREE.SRGBColorSpace` (color maps), `THREE.LinearSRGBColorSpace` (data maps) | Color accuracy |
| `wrapS` / `wrapT` | `THREE.RepeatWrapping`, `THREE.ClampToEdgeWrapping`, `THREE.MirroredRepeatWrapping` | Tiling behavior |
| `repeat` | `THREE.Vector2(tilesX, tilesY)` | How many times texture repeats |
| `offset` | `THREE.Vector2(u, v)` | UV offset for scrolling |
| `minFilter` | `THREE.LinearMipmapLinearFilter` (default) | Minification filtering |
| `magFilter` | `THREE.LinearFilter` (default), `THREE.NearestFilter` (pixelated) | Magnification filtering |
| `anisotropy` | `1-16` | Sharper at angles (higher = better quality, more cost) |

## Texture Caching Pattern

Avoid reloading the same texture multiple times:

```javascript
// Shared texture cache (module-level via closure in behavior)
this.onStart = function () {
    if (!this.constructor._textureCache) {
        this.constructor._textureCache = new Map();
    }
    this._cache = this.constructor._textureCache;
};

this.loadCached = function (url, callback) {
    if (this._cache.has(url)) {
        callback(this._cache.get(url));
        return;
    }
    new THREE.TextureLoader().load(url, (texture) => {
        this._cache.set(url, texture);
        callback(texture);
    });
};
```

## Verification

- Enter Play Mode — Confirm texture appears on the target object
- `get_object --target "ObjectName"` — Verify object exists and behavior is attached
- Check console for texture loading errors (404, CORS)

## When Things Go Wrong

- **Texture not showing** — Check URL is accessible (CORS), material `needsUpdate = true` is set, and `colorSpace` is correct
- **Texture blurry** — Increase `anisotropy`, check texture resolution, ensure `minFilter` uses mipmaps
- **Texture tiled wrong** — Check `wrapS`/`wrapT` are set to `RepeatWrapping`, and `repeat` values are correct
- **Memory leak** — Always `.dispose()` textures in behavior `dispose()`. Cached textures should only be disposed when all users are done

## See Also

- **stemstudio-behaviors** — Behavior lifecycle for texture behaviors
- **stemstudio-threejs-shaders** — Custom shaders that use texture uniforms
- **stemstudio-threejs-geometry** — Custom geometry with UV coordinates
- **stemstudio-materials** — `set_texture` / `set_external_texture` for static texture assignment (preferred)
