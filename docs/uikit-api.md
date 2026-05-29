# UIKit API

Behavior and lambda scripts receive two UIKit globals:

```ts
UIKit
UIKitPointerEvents
```

Use UIKit for in-scene panels, diegetic UI, HUD overlays, labels, buttons, and interactive 3D controls.

## Basic in-world panel

```ts
let panel;
let scoreText;

this.init = function (game) {
  UIKitPointerEvents.initialize(game);
};

this.onStart = function () {
  panel = new UIKit.Container({
    width: 220,
    height: 80,
    backgroundColor: 0x222222,
    backgroundOpacity: 0.85,
    borderRadius: 8,
    padding: 12,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "auto",
  });

  scoreText = new UIKit.Text({
    text: "Score: 0",
    fontSize: 22,
    color: 0xffffff,
  });

  panel.add(scoreText);
  this.target.add(panel);
  UIKitPointerEvents.registerRoot(panel);
};

this.update = function (deltaTime) {
  UIKitPointerEvents.update(deltaTime);
};

this.dispose = function () {
  if (panel) {
    UIKitPointerEvents.unregisterRoot(panel);
    panel.dispose();
    panel = null;
  }
  UIKitPointerEvents.deinitialize();
};
```

## Fullscreen HUD

`UIKit.Fullscreen` should be parented to a camera. Use `game.uiCamera` when available, with `game.camera` as the fallback.

```ts
let hud;

this.init = function (game) {
  this.game = game;
  UIKitPointerEvents.initialize(game);
};

this.onStart = function () {
  hud = new UIKit.Fullscreen(this.game.renderer, {
    flexDirection: "column",
    pointerEvents: "auto",
  });

  hud.add(new UIKit.Text({
    text: "Wave 1",
    fontSize: 28,
    color: 0xffffff,
  }));

  const camera = this.game.uiCamera ?? this.game.camera;
  camera.add(hud);
  UIKitPointerEvents.registerRoot(hud);
};

this.update = function (deltaTime) {
  UIKitPointerEvents.update(deltaTime);
};

this.dispose = function () {
  if (hud) {
    UIKitPointerEvents.unregisterRoot(hud);
    hud.parent?.remove(hud);
    hud.dispose();
    hud = null;
  }
  UIKitPointerEvents.deinitialize();
};
```

## Components

### Container

`UIKit.Container` is the layout building block. It supports fixed sizing, flexbox-style layout, backgrounds, borders, overflow, and pointer handlers.

```ts
const button = new UIKit.Container({
  width: 120,
  height: 40,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: 0x3344aa,
  borderRadius: 6,
  pointerEvents: "auto",
  hover: {backgroundColor: 0x4455cc},
  active: {backgroundColor: 0x223388},
  onClick: () => console.log("clicked"),
});
```

Common properties:

```ts
width
height
backgroundColor
backgroundOpacity
borderRadius
borderWidth
borderColor
padding
paddingTop
paddingBottom
paddingLeft
paddingRight
margin
flexDirection
justifyContent
alignItems
gap
overflow
pointerEvents
hover
active
onClick
onPointerEnter
onPointerLeave
```

### Text

```ts
const label = new UIKit.Text({
  text: "Ready",
  fontSize: 24,
  fontWeight: "bold",
  color: 0xffffff,
  opacity: 1,
  textAlign: "center",
  verticalAlign: "center",
  lineHeight: 1.2,
  maxLines: 2,
});
```

### Image

```ts
const icon = new UIKit.Image({
  src: "https://example.com/icon.png",
  width: 48,
  height: 48,
  objectFit: "contain",
  borderRadius: 6,
});
```

### Input

```ts
const nameInput = new UIKit.Input({
  value: "",
  placeholder: "Name",
  fontSize: 18,
  color: 0xffffff,
  backgroundColor: 0x222222,
  borderRadius: 4,
  padding: 8,
  onValueChange: (value) => {
    this.erth.store.set("player.name", value);
  },
});
```

### Other components

| Component | Use |
|---|---|
| `UIKit.Fullscreen` | Camera-attached viewport UI |
| `UIKit.Content` | Scrollable content inside a container |
| `UIKit.Svg` | SVG graphics |
| `UIKit.Video` | Video surfaces |

## Updating properties

Call `setProperties()` to update one or more properties.

```ts
scoreText.setProperties({text: `Score: ${score}`});

button.setProperties({
  backgroundColor: disabled ? 0x555555 : 0x3344aa,
  pointerEvents: disabled ? "none" : "auto",
});
```

## Pointer events lifecycle

`UIKitPointerEvents` is reference counted so multiple behaviors can use it at the same time.

```ts
UIKitPointerEvents.initialize(game);
UIKitPointerEvents.registerRoot(root);
UIKitPointerEvents.update(deltaTime);
UIKitPointerEvents.unregisterRoot(root);
UIKitPointerEvents.deinitialize();
```

Available methods:

| Method | Use |
|---|---|
| `initialize(game)` | Store GameManager and increment the init reference count |
| `deinitialize()` | Decrement the init reference count |
| `registerRoot(component)` | Enable pointer events for a root component |
| `unregisterRoot(component)` | Remove a root component |
| `update(deltaTime?)` | Update pointer state and registered roots |
| `forceDispose()` | Force cleanup, bypassing reference counts |
| `isActive()` | True when pointer events are running with roots |
| `isInitialized()` | True when a game reference is present |
| `getRootCount()` | Number of registered roots |
| `getInitRefCount()` | Current initialization reference count |

Always pair `initialize()` with `deinitialize()`, and `registerRoot()` with `unregisterRoot()`.

## Common patterns

### Health bar

```ts
function createHealthBar(width, height, health, maxHealth) {
  const root = new UIKit.Container({
    width,
    height,
    backgroundColor: 0x333333,
    borderRadius: 4,
    overflow: "hidden",
  });

  const fill = new UIKit.Container({
    width: (health / maxHealth) * width,
    height: "100%",
    backgroundColor: health > 30 ? 0x44aa44 : 0xaa4444,
  });

  root.add(fill);
  return {root, fill};
}
```

### Button with text

```ts
const button = new UIKit.Container({
  width: 140,
  height: 44,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: 0x224488,
  borderRadius: 6,
  pointerEvents: "auto",
  onClick: () => this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "menu.start"),
});

button.add(new UIKit.Text({
  text: "Start",
  fontSize: 18,
  color: 0xffffff,
}));
```

