# Performance Patterns

Load when: a behavior does heavy per-frame work, creates runtime objects, manages many dynamic entities, or targets complex scenes.

Cross-reference:
- [behavior-system.md](behavior-system.md) for lifecycle and `throttleConfig`
- [editor-preview-callbacks.md](editor-preview-callbacks.md) for editor/play cleanup separation

## Hot-Path Allocation Rule

Never allocate these objects inside `update()` or `fixedUpdate()` unless it is a one-time guarded init:
- `THREE.Vector3`
- `THREE.Quaternion`
- `THREE.Matrix4`
- `THREE.Euler`
- `THREE.Color`
- `THREE.Raycaster`
- `THREE.Box3`

Bad:

```javascript
this.update = function(deltaTime) {
  const dir = new THREE.Vector3(0, 0, -1);
  const ray = new THREE.Raycaster(this.target.position, dir);
  const hits = ray.intersectObjects(game.scene.children);
};
```

Good:

```javascript
let game;
const dir = new THREE.Vector3();
const ray = new THREE.Raycaster();

this.init = function(_game) {
  game = _game;
};

this.update = function(deltaTime) {
  dir.set(0, 0, -1).applyQuaternion(this.target.quaternion);
  ray.set(this.target.position, dir);
  const hits = ray.intersectObjects(game.scene.children);
};
```

Acceptable guarded one-time init:

```javascript
this.update = function(deltaTime) {
  if (!this._helper) this._helper = new THREE.Vector3();
};
```

## `throttleConfig` Guidance

Use `throttleConfig` in `behavior.json` or attach-time config when the behavior does meaningful per-frame work.

Required when the behavior:
- traverses the scene
- raycasts
- manages many objects
- performs expensive AI or spatial queries

Recommended priority levels:

| Priority | Use Case |
|----------|----------|
| `CRITICAL` | Player controller, active camera |
| `HIGH` | Combat, AI, vehicle logic |
| `MEDIUM` | Supporting gameplay systems |
| `LOW` | Ambient systems |
| `MINIMAL` | Debug or decorative systems |

Typical config:

```json
{
  "throttleConfig": {
    "throttlePriority": "MEDIUM",
    "enableFrustumCulling": true,
    "enableDistanceThrottling": true,
    "requiresConsistentUpdates": false
  }
}
```

Use `requiresConsistentUpdates: true` only when visual or gameplay correctness genuinely depends on every frame.

## InstancedMesh for Repeated Geometry

When creating more than a handful of identical meshes with the same geometry/material, use `THREE.InstancedMesh`.

Bad:

```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardNodeMaterial({ color: 0x00ff00 });

for (let i = 0; i < 100; i++) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(i * 2, 0, 0);
  mesh.userData.isRuntimeOnly = true;
  this.target.add(mesh);
}
```

Good:

```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardNodeMaterial({ color: 0x00ff00 });
const instanced = new THREE.InstancedMesh(geometry, material, 100);
const matrix = new THREE.Matrix4();

for (let i = 0; i < 100; i++) {
  matrix.makeTranslation(i * 2, 0, 0);
  instanced.setMatrixAt(i, matrix);
}

instanced.instanceMatrix.needsUpdate = true;
instanced.userData.isRuntimeOnly = true;
this.target.add(instanced);
```

## Mandatory `dispose()` Rule

Every behavior that creates runtime resources should clean them up in `dispose()`.

Checklist:

| Resource | Cleanup |
|----------|---------|
| Geometry | `geometry.dispose()` |
| Material | `material.dispose()` |
| Texture | `texture.dispose()` |
| Render target | `renderTarget.dispose()` |
| Runtime object | remove from parent |
| Event listener | unregister/remove |
| Timer | `clearTimeout` / `clearInterval` |
| Audio source | stop/disconnect if needed |

Pattern:

```javascript
let game;
let visuals = [];
let timers = [];

this.init = function(_game) {
  game = _game;

  const geometry = new THREE.SphereGeometry(1);
  const material = new THREE.MeshStandardNodeMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  mesh.userData.isRuntimeOnly = true;
  this.target.add(mesh);
  visuals.push({ mesh, geometry, material });

  timers.push(setInterval(function() {}, 1000));
};

this.dispose = function() {
  for (const item of visuals) {
    if (item.mesh.parent) item.mesh.parent.remove(item.mesh);
    item.geometry.dispose();
    item.material.dispose();
  }
  visuals = [];

  for (const timer of timers) {
    clearInterval(timer);
  }
  timers = [];
};
```

## `scene.add()` vs Engine-Aware Object Creation

Avoid `game.scene.add()` for runtime-owned objects when engine-aware helpers are available.

Preferred options:
- `this.target.add(mesh)` for child objects on the current host object
- `game.addObject(object, parent?)` for raw `Object3D` values that should be tracked by the engine
- `await this.erth.scene.addObject(gameObject, parent?)` for `GameObject` values

Rules:
1. Mark runtime objects with `userData.isRuntimeOnly = true`
2. Use engine-aware add/remove flows when the object must participate in save/runtime tracking
3. Clean everything up in `dispose()`

## Object Pool Pattern

For projectiles, hit effects, enemies, or other frequently recycled objects, use a pool instead of create/destroy churn.

```javascript
let pool;

this.init = function(_game) {
  pool = this.erth.pool.create({
    create: () => ({
      mesh: new THREE.Mesh(
        new THREE.SphereGeometry(0.1),
        new THREE.MeshBasicNodeMaterial({ color: 0xff0000 })
      ),
    }),
    reset: (item) => {
      item.mesh.visible = false;
      item.mesh.position.set(0, 0, 0);
    },
    initialSize: 20,
    maxSize: 100,
  });
};
```

Use pooling when:
- objects spawn often
- lifetime is short
- many identical objects are active across the session

## Common Performance Anti-Patterns

- raycasting every frame against the entire scene without filtering
- allocating math objects inside `update()` or `fixedUpdate()`
- creating many identical meshes instead of instancing
- using `requiresConsistentUpdates: true` everywhere
- forgetting `dispose()` cleanup
- rebuilding heavy procedural geometry on every small attribute change
