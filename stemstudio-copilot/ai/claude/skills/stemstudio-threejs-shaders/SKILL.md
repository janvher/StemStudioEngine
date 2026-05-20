---
name: stemstudio-threejs-shaders
description: Custom ShaderMaterial and visual effects in StemStudio behaviors. Use when the user asks to create dissolve effects, holograms, fresnel outlines, vertex displacement (waves, deformation), or any custom GLSL shader applied to objects at runtime inside behaviors.
---

# StemStudio Custom Shaders

Create custom ShaderMaterial and RawShaderMaterial effects inside behaviors. For standard PBR materials, prefer the `set_material` JSONRPC command. Use custom shaders when you need visual effects that standard materials cannot achieve.

## Authoritative References

- **~/.claude/stemstudio-docs/behavior-system.md** — Behavior lifecycle and runtime context
- **~/.claude/stemstudio-types/stem-types.d.ts** — Behavior interface, GameManager
- **stemstudio-behaviors** — Behavior code structure, lifecycle hooks, cleanup patterns

## StemStudio Context

- Three.js 0.182 is available via the `THREE` global inside behaviors
- **Renderer: WebGPURenderer with WebGL fallback** — StemStudio uses `THREE.WebGPURenderer` as the primary renderer, falling back to WebGL on unsupported devices. GLSL `ShaderMaterial` works on both renderers via automatic transpilation. For WebGPU-native shaders, use TSL (Three.js Shading Language) node materials — these also work on WebGL via the compatibility layer. Do NOT create renderers or render passes in behaviors — the engine owns the render pipeline.
- Attach ShaderMaterial to `this.target.material` in `onStart()`
- Update uniforms in `update(dt)` for animated effects
- **Always store and restore the original material** — save it in `onStart()`, restore in `dispose()`
- No ES module imports — use `THREE.ShaderMaterial`, `THREE.Vector2`, etc. directly

## When To Read More

- Need behavior lifecycle or cleanup rules: `~/.claude/stemstudio-docs/behavior-system.md`
- Need exact behavior or engine-facing types: `~/.claude/stemstudio-types/stem-types.d.ts`
- Need broader behavior authoring patterns around the shader code: `stemstudio-behaviors`

## Quick Start — Fresnel Glow Effect

```javascript
this.onStart = function () {
    if (!this.target.material) return;
    this._originalMaterial = this.target.material;

    this.target.material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(this.attributes.glowColor || 0x00ffff) },
            fresnelPower: { value: this.attributes.fresnelPower || 2.0 },
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewDir = normalize(-mvPosition.xyz);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            uniform float fresnelPower;
            uniform float time;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                float fresnel = pow(1.0 - dot(vNormal, vViewDir), fresnelPower);
                fresnel *= 0.8 + 0.2 * sin(time * 3.0);
                gl_FragColor = vec4(color * fresnel, fresnel);
            }
        `,
        transparent: true,
        side: THREE.FrontSide,
    });
};

this.update = function (deltaTime) {
    if (this.target.material.uniforms) {
        this.target.material.uniforms.time.value += deltaTime;
    }
};

this.dispose = function () {
    if (this._originalMaterial) {
        if (this.target.material && this.target.material.dispose) {
            this.target.material.dispose();
        }
        this.target.material = this._originalMaterial;
        this._originalMaterial = null;
    }
};
```

## Common Shader Effect Recipes

### Dissolve Effect

```javascript
this.onStart = function () {
    this._originalMaterial = this.target.material;
    this._dissolveProgress = 0;

    this.target.material = new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: new THREE.Color(0xff4444) },
            edgeColor: { value: new THREE.Color(0xff8800) },
            dissolve: { value: 0.0 },
            edgeWidth: { value: 0.05 },
            noiseScale: { value: 4.0 },
        },
        vertexShader: `
            varying vec3 vPosition;
            void main() {
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 edgeColor;
            uniform float dissolve;
            uniform float edgeWidth;
            uniform float noiseScale;
            varying vec3 vPosition;

            // Simple hash noise
            float hash(vec3 p) {
                p = fract(p * 0.1031);
                p += dot(p, p.zyx + 31.32);
                return fract((p.x + p.y) * p.z);
            }

            void main() {
                float noise = hash(vPosition * noiseScale);
                if (noise < dissolve) discard;
                float edge = smoothstep(dissolve, dissolve + edgeWidth, noise);
                vec3 color = mix(edgeColor, baseColor, edge);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.DoubleSide,
    });
};

this.update = function (deltaTime) {
    if (!this.target.material.uniforms) return;
    this._dissolveProgress += deltaTime * (this.attributes.speed || 0.3);
    this.target.material.uniforms.dissolve.value = Math.min(this._dissolveProgress, 1.0);
};
```

### Hologram Effect

```javascript
this.onStart = function () {
    this._originalMaterial = this.target.material;

    this.target.material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color: { value: new THREE.Color(0x00ffff) },
            scanlineSpeed: { value: 2.0 },
            scanlineCount: { value: 50.0 },
            flickerSpeed: { value: 10.0 },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                vViewDir = normalize(-mvPos.xyz);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color;
            uniform float scanlineSpeed;
            uniform float scanlineCount;
            uniform float flickerSpeed;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                float scanline = sin(vUv.y * scanlineCount + time * scanlineSpeed) * 0.5 + 0.5;
                float fresnel = pow(1.0 - dot(vNormal, vViewDir), 2.0);
                float flicker = 0.9 + 0.1 * sin(time * flickerSpeed);
                float alpha = (0.3 + fresnel * 0.7) * scanline * flicker;
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
};
```

### Vertex Displacement (Water Waves)

```javascript
this.onStart = function () {
    this._originalMaterial = this.target.material;

    this.target.material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            waveHeight: { value: this.attributes.waveHeight || 0.3 },
            waveFreq: { value: this.attributes.waveFrequency || 2.0 },
            color1: { value: new THREE.Color(0x006994) },
            color2: { value: new THREE.Color(0x00b4d8) },
        },
        vertexShader: `
            uniform float time;
            uniform float waveHeight;
            uniform float waveFreq;
            varying float vHeight;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec3 pos = position;
                pos.y += sin(pos.x * waveFreq + time * 2.0) * waveHeight;
                pos.y += cos(pos.z * waveFreq * 0.7 + time * 1.5) * waveHeight * 0.5;
                vHeight = pos.y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color1;
            uniform vec3 color2;
            varying float vHeight;
            varying vec2 vUv;
            void main() {
                float t = smoothstep(-0.3, 0.3, vHeight);
                vec3 color = mix(color1, color2, t);
                gl_FragColor = vec4(color, 0.85);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
    });
};
```

## Key Pattern: Material Cleanup

**Every shader behavior MUST follow this pattern:**

```javascript
this.onStart = function () {
    // 1. Save original
    this._originalMaterial = this.target.material;
    // 2. Create custom shader
    this.target.material = new THREE.ShaderMaterial({ /* ... */ });
};

this.dispose = function () {
    // 3. Dispose custom shader
    if (this.target.material && this.target.material !== this._originalMaterial) {
        this.target.material.dispose();
    }
    // 4. Restore original
    if (this._originalMaterial) {
        this.target.material = this._originalMaterial;
        this._originalMaterial = null;
    }
};
```

## Uniform Types Reference

| GLSL Type | JavaScript Value |
|-----------|-----------------|
| `float` | `{ value: 1.0 }` |
| `vec2` | `{ value: new THREE.Vector2(x, y) }` |
| `vec3` | `{ value: new THREE.Vector3(x, y, z) }` or `{ value: new THREE.Color(hex) }` |
| `vec4` | `{ value: new THREE.Vector4(x, y, z, w) }` |
| `mat4` | `{ value: new THREE.Matrix4() }` |
| `sampler2D` | `{ value: texture }` (THREE.Texture) |
| `bool` | `{ value: true }` (passed as int) |

## Verification

- Enter Play Mode — Confirm shader effect renders on the target object
- Check console for GLSL compilation errors
- `get_object --target "ObjectName"` — Verify object exists and has the behavior attached

## When Things Go Wrong

- **Shader compilation error** — Check browser console for GLSL errors. Common issues: missing semicolons, undeclared varyings, mismatched types
- **Object turns black** — Shader is failing silently. Simplify to a flat color fragment shader first, then add complexity
- **Effect not animating** — Ensure `update()` is incrementing the `time` uniform
- **Original material lost** — Always save `this._originalMaterial` before replacing. Check `dispose()` restores it

## See Also

- **stemstudio-behaviors** — Behavior lifecycle for shader behaviors
- **stemstudio-threejs-geometry** — Custom geometry to apply shaders to
- **stemstudio-threejs-textures** — Texture uniforms for shader effects
- **stemstudio-materials** — `set_material` for standard PBR materials (preferred for simple cases)
