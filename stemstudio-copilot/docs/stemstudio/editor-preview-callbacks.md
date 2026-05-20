# Editor Preview Callbacks

Load when: generating any behavior that creates visible geometry, materials, lights, helper meshes, or texture-driven previews.

The editor and the game loop are separate systems. Editor callbacks make visual behaviors inspectable without entering Play Mode.

Cross-reference:
- [behavior-system.md](behavior-system.md) for lifecycle and runtime context
- [performance-patterns.md](performance-patterns.md) for cleanup and allocation rules

## The Two-Layer Split Rule

Split behavior code into two layers:

1. Rendering / visual construction
   Runs in editor mode and in play mode
2. Game logic
   Runs only in play mode

Rendering belongs in:
- `onEditorAdded`
- `onEditorUpdate`
- `onEditorAttributesUpdated`
- `onEditorDispose`
- `init`
- `update`

Game logic belongs in:
- `init`
- `update`
- `fixedUpdate`
- `onEvent`
- `dispose`

## Rendering-Only Purity

Editor callbacks should contain only rendering code.

Allowed in editor callbacks:
- geometry creation
- material creation and updates
- texture loading and assignment
- mesh/light/helper creation
- transform sync
- attribute-driven visual rebuilds
- editor-only helper visuals via `editor.sceneHelpers`

Forbidden in editor callbacks:
- physics setup or impulses
- `erth.store` reads/writes
- keyboard/mouse/touch listeners
- multiplayer state
- gameplay timers or state machines
- `game.player` or `game.camera`
- UIKit HUD setup
- behavior-to-behavior event traffic

Use `editor.camera` and `editor.scene`, not play-mode services.

## Behaviors That Must Implement Editor Callbacks

Any behavior that creates:
- `THREE.Mesh`
- `THREE.InstancedMesh`
- `THREE.Points`
- `THREE.Line` / `THREE.LineSegments`
- `THREE.Sprite`
- lights
- runtime textures/material previews

should implement at least:
- `onEditorAdded`
- `onEditorDispose`

Also implement `onEditorAttributesUpdated` when attributes change the visual result.

## Available Editor Callbacks for Script Behaviors

| Hook | Signature | When Called |
|------|-----------|-------------|
| `this.onEditorAdded` | `function(editor)` | Behavior becomes active in editor mode |
| `this.onEditorUpdate` | `function()` | Every editor frame. No `deltaTime` is passed |
| `this.onEditorRemoved` | `function()` | Behavior explicitly removed in editor |
| `this.onEditorDispose` | `function()` | Editor is disposed or switches to play mode |
| `this.onEditorAttributesUpdated` | `function()` | Behavior attributes changed in editor |
| `this.onEditorPanelShown` | `function()` | Behavior panel opened |
| `this.onEditorPanelHidden` | `function()` | Behavior panel closed |
| `this.onEditorButtonClicked` | `function(action)` | Custom editor button clicked |
| `this.onEditorEvent` | `function(msg, data)` | Editor-mode event received |

## What Is Available in Editor Mode

- `this.target`
- `this.attributes`
- `this.erth` for asset-oriented operations such as image lookup/texture creation
- `editor.sceneHelpers`
- `editor.scene`
- `editor.camera`

## What Does Not Run in Editor Mode

- `init(game)`
- `update(deltaTime)`
- `fixedUpdate(fixedDeltaTime)`
- `onStart()` / `onStop()`
- `onEvent()`
- `dispose()` (use `onEditorDispose()` instead)

## Shared Build Function Pattern

Use shared helpers so editor preview and play mode stay visually aligned:

```javascript
let game;
let visuals = [];

function buildVisuals(self) {
  const geometry = new THREE.SphereGeometry(0.5, 32, 32);
  const material = new THREE.MeshStandardNodeMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.userData.isRuntimeOnly = true;
  self.target.add(mesh);
  visuals.push({ mesh, geometry, material });
}

function cleanupVisuals() {
  for (const item of visuals) {
    if (item.mesh.parent) item.mesh.parent.remove(item.mesh);
    item.geometry.dispose();
    item.material.dispose();
  }
  visuals = [];
}

this.onEditorAdded = function(editor) {
  buildVisuals(this);
};

this.onEditorUpdate = function() {
  const dt = 0.016;
  for (const item of visuals) {
    item.mesh.rotation.y += dt;
  }
};

this.onEditorAttributesUpdated = function() {
  cleanupVisuals();
  buildVisuals(this);
};

this.onEditorDispose = function() {
  cleanupVisuals();
};

this.init = function(_game) {
  game = _game;
  buildVisuals(this);
};

this.update = function(deltaTime) {
  for (const item of visuals) {
    item.mesh.rotation.y += deltaTime;
  }
};

this.dispose = function() {
  cleanupVisuals();
};
```

## Simplified Preview for Heavy Systems

For expensive visual systems, editor preview can be approximate:
- reduced instance count
- bounding box wireframe
- placeholder mesh
- representative subset of particles/tiles

Document when preview is intentionally simplified.

## Critical Rules

1. Mark runtime-created objects with `userData.isRuntimeOnly = true`
2. Always clean up in `onEditorDispose()` to avoid editor/play duplicates
3. Do not rely on `onEditorRemoved()` for mode-switch cleanup
4. `onEditorUpdate()` has no `deltaTime`; use a fixed value such as `0.016`
5. Use `editor.sceneHelpers` for editor-only guides that must never serialize into the scene
6. Do not access `game` from editor callbacks
7. Asset loading can be previewed in editor mode, but gameplay side effects must wait for play mode

## What Goes Where

| Concern | Editor callbacks | Play-mode hooks |
|---------|------------------|-----------------|
| Mesh/material creation | Yes | Yes |
| Texture assignment | Yes | Yes |
| Procedural preview | Yes | Yes |
| Visual animation | Yes | Yes |
| Physics | No | Yes |
| `erth.store` | No | Yes |
| Input | No | Yes |
| Multiplayer | No | Yes |
| UIKit HUD | No | Yes |
| Gameplay events | No | Yes |
