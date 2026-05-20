---
name: stemstudio-threejs-geometry
description: Procedural geometry creation in StemStudio behaviors. Use when the user asks to create custom shapes, procedural terrain details, trail effects, instanced meshes (forests, crowds), or runtime geometry generation inside behaviors. Covers BufferGeometry, InstancedMesh, and geometry merging.
---

# StemStudio Procedural Geometry

Create custom geometry at runtime inside behaviors and lambdas. For standard primitives (box, sphere, plane, cylinder), prefer the `create_primitive` JSONRPC command. Use procedural geometry when you need shapes the primitive system cannot provide.

## Authoritative References

- **~/.claude/stemstudio-docs/behavior-system.md** — Behavior lifecycle and runtime context
- **~/.claude/stemstudio-types/stem-types.d.ts** — ErthInterface, GameObject creation APIs
- **stemstudio-behaviors** — Behavior code structure, lifecycle hooks, cleanup patterns

## StemStudio Context

- Three.js 0.182 is available via the `THREE` global inside behaviors
- **Renderer: WebGPURenderer with WebGL fallback** — StemStudio uses `THREE.WebGPURenderer` as the primary renderer, falling back to WebGL on unsupported devices. Geometry APIs work identically across both renderers. Do NOT create renderers in behaviors — the engine owns the render pipeline.
- Use `this.erth.object.createFromThreeObject(mesh)` to register custom geometry as a GameObject
- **Create geometry in `onStart()`, not `update()`** — geometry creation is expensive
- Always dispose geometry and materials in `dispose()`
- No ES module imports — use `THREE.BufferGeometry`, `THREE.InstancedMesh`, etc. directly

## When To Read More

- Need lifecycle placement or cleanup rules: `~/.claude/stemstudio-docs/behavior-system.md`
- Need exact ErthInterface or GameObject creation types: `~/.claude/stemstudio-types/stem-types.d.ts`
- Need behavior authoring patterns around the geometry code: `stemstudio-behaviors`

## Quick Start — Custom Shape in a Behavior

```javascript
this.onStart = function () {
    // Create a custom star shape
    const shape = new THREE.Shape();
    const outerR = 1, innerR = 0.4, points = 5;
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        shape[method](Math.cos(angle) * r, Math.sin(angle) * r);
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
    const material = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
    this.starMesh = new THREE.Mesh(geometry, material);

    // Register as GameObject so it appears in scene graph
    const gameObj = this.erth.object.createFromThreeObject(this.starMesh);
    this.erth.scene.addObject(gameObj, this.target);

    this._geometry = geometry;
    this._material = material;
};

this.dispose = function () {
    if (this._geometry) this._geometry.dispose();
    if (this._material) this._material.dispose();
};
```

## BufferGeometry — Procedural Meshes

For terrain details, trails, custom shapes, and dynamic geometry:

```javascript
this.onStart = function () {
    const geometry = new THREE.BufferGeometry();

    // Triangle strip for a ribbon/trail
    const positions = new Float32Array([
        -1, 0, 0,   1, 0, 0,   -1, 1, 0,
         1, 1, 0,  -1, 2, 0,    1, 2, 0
    ]);
    const normals = new Float32Array([
        0, 0, 1,  0, 0, 1,  0, 0, 1,
        0, 0, 1,  0, 0, 1,  0, 0, 1
    ]);
    const indices = [0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5];

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    const material = new THREE.MeshStandardMaterial({ color: 0x44aa88, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geometry, material);
    this.target.add(this.mesh);

    this._geometry = geometry;
    this._material = material;
};
```

### Dynamic Geometry Updates

Update vertex positions each frame for animated effects (waves, deformation):

```javascript
this.update = function (deltaTime) {
    if (!this._geometry) return;
    const positions = this._geometry.attributes.position;
    const time = performance.now() * 0.001;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        positions.setY(i, Math.sin(x * 2 + time) * 0.3 + Math.cos(z * 2 + time) * 0.3);
    }
    positions.needsUpdate = true;
    this._geometry.computeVertexNormals();
};
```

## InstancedMesh — High-Performance Duplication

For forests, crowds, grass, debris — thousands of identical objects with different transforms:

```javascript
this.onStart = function () {
    const count = this.attributes.instanceCount || 1000;
    const geometry = new THREE.SphereGeometry(0.3, 8, 6);
    const material = new THREE.MeshStandardMaterial({ color: 0x228833 });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    const area = this.attributes.spreadArea || 50;

    for (let i = 0; i < count; i++) {
        dummy.position.set(
            (Math.random() - 0.5) * area,
            0,
            (Math.random() - 0.5) * area
        );
        dummy.scale.setScalar(0.5 + Math.random() * 1.5);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    this.target.add(this.instancedMesh);
    this._geometry = geometry;
    this._material = material;
};

this.dispose = function () {
    if (this.instancedMesh) {
        this.target.remove(this.instancedMesh);
        this.instancedMesh.dispose();
    }
    if (this._geometry) this._geometry.dispose();
    if (this._material) this._material.dispose();
};
```

### Per-Instance Colors

```javascript
const color = new THREE.Color();
for (let i = 0; i < count; i++) {
    color.setHSL(Math.random() * 0.1 + 0.25, 0.7, 0.5); // Green variations
    this.instancedMesh.setColorAt(i, color);
}
this.instancedMesh.instanceColor.needsUpdate = true;
```

## Geometry Merging — Static Optimization

Merge multiple geometries into one draw call for static scene elements:

```javascript
this.onStart = function () {
    const geometries = [];
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < 100; i++) {
        const geo = new THREE.BoxGeometry(
            0.5 + Math.random(), 0.5 + Math.random(), 0.5 + Math.random()
        );
        matrix.makeTranslation(
            (Math.random() - 0.5) * 20,
            Math.random() * 5,
            (Math.random() - 0.5) * 20
        );
        geo.applyMatrix4(matrix);
        geometries.push(geo);
    }

    // mergeGeometries available via THREE.BufferGeometryUtils
    const merged = THREE.BufferGeometryUtils.mergeGeometries(geometries);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    this.merged = new THREE.Mesh(merged, material);
    this.target.add(this.merged);

    geometries.forEach(g => g.dispose());
    this._mergedGeo = merged;
    this._material = material;
};
```

## Common Geometry Recipes

| Shape | Approach |
|-------|----------|
| Star/polygon | `THREE.Shape` + `THREE.ExtrudeGeometry` |
| Trail/ribbon | `THREE.BufferGeometry` with dynamic position updates |
| Procedural terrain patch | `THREE.PlaneGeometry` with displaced vertex Y values |
| Forest/grass | `THREE.InstancedMesh` with randomized transforms |
| Merged rubble/debris | `THREE.BufferGeometryUtils.mergeGeometries()` |
| Tube/pipe | `THREE.TubeGeometry` with custom `THREE.Curve3` path |
| Lathe (vase, bottle) | `THREE.LatheGeometry` with profile points |

## Verification

After creating procedural geometry, verify with:
- `get_scene_objects` — Check the new object appears in scene hierarchy
- `get_object --target "ObjectName"` — Verify parent-child relationship
- Enter Play Mode — Confirm geometry renders correctly

## When Things Go Wrong

- **Geometry not visible** — Check normals are computed (`geometry.computeVertexNormals()`), material `side` property, and mesh is added to scene
- **Performance issues** — Move geometry creation from `update()` to `onStart()`. Use InstancedMesh for repeated shapes
- **Memory leaks** — Always dispose geometry and materials in `dispose()`. Remove meshes from parent

## See Also

- **stemstudio-behaviors** — Behavior lifecycle, ErthInterface for `createFromThreeObject()`
- **stemstudio-threejs-shaders** — Custom materials for procedural geometry
- **stemstudio-threejs-textures** — UV mapping and texturing custom geometry
- **stemstudio-objects** — `create_primitive` for standard shapes (preferred over procedural for simple objects)
