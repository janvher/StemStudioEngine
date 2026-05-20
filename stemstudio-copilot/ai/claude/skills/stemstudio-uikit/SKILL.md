---
name: stemstudio-uikit
description: Create UI elements for 3D game behaviors in Studio 3D using UIKit. Use when the user asks to add UI components like health bars, score displays, menus, HUDs, buttons, text labels, or any interactive interface elements to their game. UIKit provides flexbox-based 3D UI components (Container, Text, Image, Input, Fullscreen) with pointer event support. Examples include "add a health bar", "create a score display", "make a pause menu", "add a button to the object", or "create a HUD".
---

# Studio 3D UIKit — Creating UI in Behaviors

Guide for creating 3D user interfaces inside Studio 3D behaviors using the UIKit library.

UI is created inside behavior scripts. Behaviors are managed via the `stemstudio-behaviors` skill (add, update, attach, detach).

## Available Globals

Three globals are exposed to behavior scripts:

| Global | Description |
|--------|-------------|
| `UIKit` | UIKit namespace — `Container`, `Text`, `Image`, `Input`, `Fullscreen`, `Svg`, `Video`, `reversePainterSortStable` |
| `UIKitPointerEvents` | Pointer event system — `initialize`, `update`, `registerRoot`, `unregisterRoot`, `deinitialize` |

## Behavior Lifecycle for UI

```javascript
this.init = function init(game) {
    // 1. Store game reference
    this.gameManager = game;

    // 2. Initialize pointer events (reference counted)
    UIKitPointerEvents.initialize(game);

    // 3. Enable clipping and transparent sort (required for UIKit)
    game.renderer.localClippingEnabled = true;
    game.renderer.setTransparentSort(UIKit.reversePainterSortStable);

    // 4. Create Fullscreen root (attached to camera for HUD)
    this.root = new UIKit.Fullscreen(game.renderer, {
        flexDirection: 'column',
        gap: 16,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    });
    game.uiCamera.add(this.root);
}

this.onStart = function onStart() {
    // Build UI tree here — add children to this.root
}

this.update = function update(deltaTime) {
    // All three calls are required every frame
    UIKitPointerEvents.update(deltaTime);
}

this.dispose = function dispose() {
    if (this.root) {
        UIKitPointerEvents.unregisterRoot(this.root);
        if (this.root.parent) {
            this.root.parent.remove(this.root);
        }
        this.root.dispose();
        this.root = null;
    }
    UIKitPointerEvents.deinitialize();
}
```

### Key Rules

1. **Create the Fullscreen root in `init()`** — it needs `game.renderer` and `game.uiCamera`
2. **Call the pointer events update every frame** — `UIKitPointerEvents.update(deltaTime)` in your `update()` method
3. **Set renderer properties in `init()`** — `localClippingEnabled = true` and `setTransparentSort(UIKit.reversePainterSortStable)`
4. **Add root to UI camera** — `game.uiCamera.add(this.root)` for Fullscreen HUD
5. **Clean up in `dispose()`** — unregister root, remove from parent, dispose, deinitialize

### Attaching UI to Objects Instead of Camera

To attach UI to a specific 3D object (e.g., floating above an NPC) instead of as a fullscreen HUD:

```javascript
this.onStart = function onStart() {
    const panel = new UIKit.Container({
        width: 200,
        height: 60,
        backgroundColor: 0x222222,
        backgroundOpacity: 0.8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    });

    // Attach to the target object (the 3D object the behavior is on)
    this.target.add(panel);
    UIKitPointerEvents.registerRoot(panel);
}
```

## UIKit Components

### Container

The main building block. Supports flexbox layout, interaction states, and event handlers.

```javascript
const panel = new UIKit.Container({
    // Size
    width: 300,
    height: 200,

    // Background
    backgroundColor: 0x333333,
    backgroundOpacity: 0.9,

    // Border
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 0x666666,
    // Per-corner radius
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    // Shorthand: borderTopRadius, borderBottomRadius
    // Per-side width
    borderTopWidth: 1,
    borderBottomWidth: 1,

    // Padding
    padding: 16,           // All sides
    paddingX: 16,          // Left + Right
    paddingY: 20,          // Top + Bottom
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 16,
    paddingRight: 16,

    // Margin
    margin: 8,
    marginX: 8,
    marginY: 8,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 'auto',    // 'auto' works for flex pushing

    // Flexbox layout
    flexDirection: 'column',    // 'row' | 'column' | 'row-reverse' | 'column-reverse'
    justifyContent: 'center',   // 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around'
    alignItems: 'center',       // 'flex-start' | 'flex-end' | 'center' | 'stretch'
    alignSelf: 'stretch',       // Override parent's alignItems for this child
    alignContent: 'flex-start', // For wrapped flex containers
    gap: 8,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    flexWrap: 'wrap',           // 'nowrap' | 'wrap'

    // Scrolling
    overflow: 'scroll',         // 'visible' | 'hidden' | 'scroll'

    // Positioning
    positionType: 'relative',   // 'relative' | 'absolute'
    positionTop: 0,
    positionRight: 0,
    positionBottom: 0,
    positionLeft: 0,
    inset: 0,                   // Shorthand for all four
    zIndex: 10,

    // Transform
    transformTranslateY: 4,

    // Visibility
    visibility: 'visible', //'visible' | 'hidden'
    opacity: 1,

    // Interaction
    cursor: 'pointer',
    pointerEvents: 'auto',      // 'auto' | 'none'

    // Hover/active states — override properties on state
    hover: { backgroundColor: 0x444444, borderColor: 0x3b82f6 },
    active: { backgroundColor: 0x555555 },

    // Event handlers
    onClick: (e) => { /* e.stopPropagation?.() to prevent bubbling */ },
    onPointerEnter: () => {},
    onPointerLeave: () => {},
    onHoverChange: (isHovered) => {},

    // Cascading style (applies to all children)
    '*': { color: 'white' },
});
```

### Text

Renders text in 3D space.

```javascript
const label = new UIKit.Text({
    text: 'Hello World',
    fontSize: 32,
    fontWeight: 'bold',        // 'normal' | 'medium' | 'semi-bold' | 'bold' | 100-900
    color: 0xffffff,           // Hex number or 'white' string
    opacity: 1,

    // Alignment
    textAlign: 'center',       // 'left' | 'center' | 'right'
    verticalAlign: 'center',   // 'top' | 'center' | 'bottom'

    // Spacing
    letterSpacing: -0.4,
    lineHeight: '150%',        // Number, percentage string, or px string ('20px')

    // Overflow
    maxLines: 2,

    // Layout (Text also supports Container layout properties)
    marginTop: 8,
    padding: 8,
    backgroundColor: 0x000000,  // Text can have a background
});
```

### Image

Displays images from URLs.

```javascript
const img = new UIKit.Image({
    src: 'https://example.com/image.jpg',
    width: 250,
    height: 330,
    objectFit: 'cover',        // 'fill' | 'contain' | 'cover'
    borderRadius: 6,
    opacity: 1,
});
```

### Svg

Renders inline SVG graphics.

```javascript
const icon = new UIKit.Svg({
    width: 24,
    height: 24,
    color: 'white',
    content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" /></svg>',
});
```

### Video

Plays video content in 3D space.

```javascript
const video = new UIKit.Video({
    src: 'https://example.com/video.mp4',
    width: 400,
    height: 225,
    autoplay: true,
    loop: true,
    muted: true,
    borderRadius: 8,
});
```

### Input

Text input field.

```javascript
const input = new UIKit.Input({
    width: 300,
    height: 40,
    placeholder: 'Enter name...',
    defaultValue: '',
    fontSize: 16,
    color: 'white',
    backgroundColor: 0x1e293b,
    hover: { backgroundColor: 0x334155 },
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 0x475569,
    paddingX: 12,

    onValueChange: (value) => {
        console.log('Input changed:', value);
    },
});
```

### Fullscreen

Camera-facing UI that fills the viewport. The primary component for HUDs and overlay menus.

```javascript
// Created in init() — requires game.renderer
this.root = new UIKit.Fullscreen(game.renderer, {
    flexDirection: 'column',
    gap: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
});
// Must be added to UI camera
game.uiCamera.add(this.root);
```

## Updating Properties at Runtime

```javascript
// Update single property
label.setProperties({ text: 'New Text' });

// Update multiple properties at once (more efficient)
container.setProperties({
    backgroundColor: 0xff0000,
    width: 300,
    opacity: 0.5,
    hover: { backgroundColor: 0xcc0000 },
});
```

## UIKitPointerEvents API

| Method | Description |
|--------|-------------|
| `initialize(game)` | Initialize with game reference (reference counted — multiple behaviors can call this) |
| `deinitialize()` | Decrement ref count, full cleanup when ref count reaches 0 |
| `registerRoot(component)` | Register a UI root for pointer events |
| `unregisterRoot(component)` | Unregister a UI root |
| `update(deltaTime)` | Process pointer events (call every frame) |
| `isActive()` | Check if the system is active |
| `isInitialized()` | Check if game ref exists |
| `getRootCount()` | Number of registered roots |
| `getInitRefCount()` | Current reference count |
| `forceDispose()` | Force immediate cleanup (use sparingly) |

## Complete Examples

### Fullscreen HUD with Click Counter

```javascript
this.init = function init(game) {
  this.gameManager = game;

  //required inits
  UIKitPointerEvents.initialize(game);
  game.renderer.localClippingEnabled = true;
  game.renderer.setTransparentSort(UIKit.reversePainterSortStable);

  this.root = new UIKit.Fullscreen(game.renderer, {
    flexDirection: 'column',
    gap: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  });
  game.uiCamera.add(this.root);

  //required
  UIKitPointerEvents.registerRoot(this.root);
}

this.onStart =  function onStart() {
  let clickCount = 0;
  const clickCountLabel = new UIKit.Text({
    text: 'Clicked 0 time(s)',
    fontSize: 14,
    color: 0x888888,
  });
  this.root.add(clickCountLabel);

  const hoverButton = new UIKit.Container({
    width: 300,
    height: 50,
    backgroundColor: 0x2563eb,
    hover: { backgroundColor: 0x1d4ed8 },
    active: { backgroundColor: 0x1e40af },
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    onClick: () => {
      clickCountLabel.setProperties({ text: `Clicked ${++clickCount} time(s)` });
    },
  });
  this.root.add(hoverButton);

  const hoverLabel = new UIKit.Text({
    text: 'Hover & Click Me',
    fontSize: 18,
    color: 'white',
  });
  hoverButton.add(hoverLabel);
}

this.update = function update(deltaTime) {
  //required
  UIKitPointerEvents.update(deltaTime);
}

this.dispose = function dispose() {
  //required deinits
  if (this.root) {
    UIKitPointerEvents.unregisterRoot(this.root);
    this.root.removeFromParent();
    this.root.dispose();
    this.root = null;
  }
  UIKitPointerEvents.deinitialize();
}

```

### Health Bar (Attached to Object)

```javascript
let healthBar = null;
let healthFill = null;
let currentHealth = 100;
const maxHealth = 100;
const barWidth = 200;

this.init = function init(game) {
    UIKitPointerEvents.initialize(game);
}

this.onStart = function onStart() {
    healthBar = new UIKit.Container({
        width: barWidth,
        height: 20,
        backgroundColor: 0x333333,
        borderRadius: 4,
        overflow: 'hidden',
    });

    healthFill = new UIKit.Container({
        width: barWidth,
        height: '100%',
        backgroundColor: 0x44aa44,
    });

    healthBar.add(healthFill);
    this.target.add(healthBar);
    UIKitPointerEvents.registerRoot(healthBar);
}

this.update = function update(deltaTime) {
    UIKitPointerEvents.update(deltaTime);
}

this.dispose = function dispose() {
    if (healthBar) {
        UIKitPointerEvents.unregisterRoot(healthBar);
        healthBar.removeFromParent();
        healthBar.dispose();
        healthBar = null;
        healthFill = null;
    }
    UIKitPointerEvents.deinitialize();
}

function setHealth(value) {
    currentHealth = Math.max(0, Math.min(value, maxHealth));
    if (healthFill) {
        healthFill.setProperties({
            width: (currentHealth / maxHealth) * barWidth,
            backgroundColor: currentHealth > 30 ? 0x44aa44 : 0xaa4444,
        });
    }
}
```

### Notification Card with Expand/Collapse

```javascript
this.init = function init(game) {
    this.gameManager = game;
    UIKitPointerEvents.initialize(game);
    game.renderer.localClippingEnabled = true;
    game.renderer.setTransparentSort(UIKit.reversePainterSortStable);

    this.root = new UIKit.Fullscreen(game.renderer, {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    });
    game.uiCamera.add(this.root);

    UIKitPointerEvents.registerRoot(this.root);
}

this.onStart = function onStart() {
    let cardOpen = false;

    const wrapper = new UIKit.Container({
        flexDirection: 'column',
        width: 440,
    });
    this.root.add(wrapper);

    // Main card (clickable)
    const mainCard = new UIKit.Container({
        backgroundColor: 0xffffff,
        borderRadius: 20,
        flexDirection: 'column',
        cursor: 'pointer',
        zIndex: 10,
        onClick: () => {
            cardOpen = !cardOpen;
            detailPanel.setProperties({ height: cardOpen ? 300 : 0 });
        },
    });
    wrapper.add(mainCard);

    // Header
    const header = new UIKit.Container({
        width: '100%',
        height: 200,
        backgroundColor: 0x6366f1,
        borderTopRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
    });
    mainCard.add(header);

    header.add(new UIKit.Text({ text: 'My App', fontSize: 32, color: 'white', fontWeight: 'bold' }));
    header.add(new UIKit.Text({ text: 'Dashboard', fontSize: 16, color: 0xc7d2fe }));

    // Info bar
    const infoBar = new UIKit.Container({
        backgroundColor: 0xffffff,
        flexDirection: 'row',
        padding: 28,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomRadius: 20,
    });
    mainCard.add(infoBar);

    infoBar.add(new UIKit.Text({ text: '3 new notifications', fontSize: 18, color: 0x18181b }));

    // Expandable detail panel
    const detailPanel = new UIKit.Container({
        width: '100%',
        height: 0,
        overflow: 'hidden',
        flexDirection: 'column',
        marginTop: -20,
    });
    wrapper.add(detailPanel);

    const detailInner = new UIKit.Container({
        paddingTop: 40,
        padding: 24,
        backgroundColor: 0xf4f4f5,
        borderRadius: 20,
        flexDirection: 'column',
        width: '100%',
        gap: 12,
    });
    detailPanel.add(detailInner);

    const items = [
        { title: 'Your call has been confirmed.', time: '1 hour ago' },
        { title: 'You have a new message!', time: '1 hour ago' },
        { title: 'Subscription expiring soon!', time: '2 hours ago' },
    ];

    items.forEach(item => {
        const row = new UIKit.Container({ flexDirection: 'row', gap: 12, alignItems: 'flex-start' });
        detailInner.add(row);

        row.add(new UIKit.Container({
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: 0x18181b, marginTop: 4,
        }));

        const col = new UIKit.Container({ flexDirection: 'column', gap: 4 });
        row.add(col);
        col.add(new UIKit.Text({ text: item.title, fontSize: 14, color: 0x09090b }));
        col.add(new UIKit.Text({ text: item.time, fontSize: 14, color: 0x71717a }));
    });
}

this.update = function update(deltaTime) {
    UIKitPointerEvents.update(deltaTime);
}

this.dispose = function dispose() {
    if (this.root) {
        UIKitPointerEvents.unregisterRoot(this.root);
        if (this.root.parent) this.root.parent.remove(this.root);
        this.root.dispose();
        this.root = null;
    }
    UIKitPointerEvents.deinitialize();
}
```

### Scrollable List

```javascript
this.onStart = function onStart() {
    const scrollContainer = new UIKit.Container({
        width: 300,
        height: 200,
        overflow: 'scroll',
        backgroundColor: 0x0f172a,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 0x334155,
        flexDirection: 'column',
        paddingY: 8,
    });
    this.root.add(scrollContainer);

    for (let i = 0; i < 20; i++) {
        const item = new UIKit.Container({
            width: '100%',
            height: 36,
            paddingX: 14,
            alignItems: 'center',
            hover: { backgroundColor: 0x1e293b },
            cursor: 'pointer',
            onClick: () => console.log(`Selected item ${i + 1}`),
        });
        scrollContainer.add(item);

        item.add(new UIKit.Text({
            text: `Item ${i + 1}`,
            fontSize: 14,
            color: 0xcbd5e1,
        }));
    }
}
```

### Toggle Switch

```javascript
function createToggle(onChange) {
    let isOn = false;

    const track = new UIKit.Container({
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: 0xd4d4d8,
        cursor: 'pointer',
        justifyContent: 'center',
        onClick: (e) => {
            e.stopPropagation?.();
            isOn = !isOn;
            track.setProperties({ backgroundColor: isOn ? 0x18181b : 0xd4d4d8 });
            thumb.setProperties({ marginLeft: isOn ? 22 : 2 });
            if (onChange) onChange(isOn);
        },
    });

    const thumb = new UIKit.Container({
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 0xffffff,
        marginLeft: 2,
        alignSelf: 'center',
    });
    track.add(thumb);

    return track;
}
```

### Stats Row

```javascript
function createStatCard(title, value, change) {
    const card = new UIKit.Container({
        flexDirection: 'column',
        flexBasis: 0,
        flexGrow: 1,
        backgroundColor: 0xffffff,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 0xe4e4e7,
        padding: 24,
        gap: 4,
    });

    card.add(new UIKit.Text({ text: title, fontSize: 14, color: 0x71717a }));
    card.add(new UIKit.Text({ text: value, fontSize: 24, fontWeight: 'bold', color: 0x09090b }));
    card.add(new UIKit.Text({ text: change, fontSize: 12, color: 0x71717a }));

    return card;
}

// Usage in onStart:
const row = new UIKit.Container({ flexDirection: 'row', gap: 16, width: '100%' });
this.root.add(row);

row.add(createStatCard('Revenue', '$45,231', '+20.1%'));
row.add(createStatCard('Users', '+2,350', '+180.1%'));
row.add(createStatCard('Sales', '+12,234', '+19%'));
```

### Horizontal Bar Chart

```javascript
function createBarChart(data, maxValue, width, height) {
    const chart = new UIKit.Container({
        width, height,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-end',
    });

    data.forEach(item => {
        const col = new UIKit.Container({
            flexDirection: 'column',
            flexGrow: 1,
            alignItems: 'center',
            gap: 4,
            height: '100%',
            justifyContent: 'flex-end',
        });
        chart.add(col);

        col.add(new UIKit.Container({
            width: '100%',
            height: `${Math.min(1, item.value / maxValue) * 100}%`,
            backgroundColor: 0x18181b,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
        }));

        col.add(new UIKit.Text({
            text: item.label,
            fontSize: 12,
            color: 0x71717a,
        }));
    });

    return chart;
}
```

### Auth Form (Login/Signup)

```javascript
this.onStart = function onStart() {
    const form = new UIKit.Container({
        flexDirection: 'column',
        width: 350,
        gap: 24,
        alignItems: 'center',
    });
    this.root.add(form);

    form.add(new UIKit.Text({
        text: 'Create an account',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    }));

    form.add(new UIKit.Text({
        text: 'Enter your email below to create your account',
        fontSize: 14,
        color: 0x71717a,
        textAlign: 'center',
    }));

    const fields = new UIKit.Container({ flexDirection: 'column', gap: 8, width: '100%' });
    form.add(fields);

    fields.add(new UIKit.Input({
        width: '100%',
        placeholder: 'name@example.com',
    }));

    fields.add(new UIKit.Input({
        width: '100%',
        placeholder: 'password',
        type: 'password',
    }));

    // Submit button
    const submitBtn = new UIKit.Container({
        width: '100%',
        height: 40,
        backgroundColor: 0x18181b,
        hover: { backgroundColor: 0x27272a },
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        onClick: () => console.log('Sign in clicked'),
    });
    fields.add(submitBtn);
    submitBtn.add(new UIKit.Text({ text: 'Sign In', color: 'white', fontSize: 14 }));
}
```

## Layout Patterns

### Absolute Positioning

```javascript
// Overlay button in top-right corner
const closeBtn = new UIKit.Container({
    positionType: 'absolute',
    positionRight: 16,
    positionTop: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 0x333333,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
});
```

### Flex Push with `marginLeft: 'auto'`

```javascript
// Push element to the right in a row
const row = new UIKit.Container({ flexDirection: 'row', width: '100%' });
row.add(new UIKit.Text({ text: 'Left' }));
row.add(new UIKit.Text({ text: 'Right', marginLeft: 'auto' }));
```

### Two-Column Split Layout

```javascript
const page = new UIKit.Container({
    width: '100%',
    height: '100%',
    flexDirection: 'row',
});

const leftPanel = new UIKit.Container({
    flexGrow: 1,
    flexBasis: 0,
    height: '100%',
    backgroundColor: 0x18181b,
    padding: 40,
    '*': { color: 'white' },
});
page.add(leftPanel);

const rightPanel = new UIKit.Container({
    flexGrow: 1,
    flexBasis: 0,
    height: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
});
page.add(rightPanel);
```

### Scrollable Content Area

```javascript
const scrollWrapper = new UIKit.Container({
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'scroll',
});
```

### Icon Grid with Wrapping

```javascript
const grid = new UIKit.Container({
    width: '100%',
    flexGrow: 1,
    overflow: 'scroll',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignContent: 'flex-start',
});
```

## Best Practices

1. **Always set renderer properties** — `localClippingEnabled = true` and `setTransparentSort(UIKit.reversePainterSortStable)` in `init()`
2. **Update pointer events per frame** — `UIKitPointerEvents.update(deltaTime)` in `update()`
3. **Use `cursor: 'pointer'`** on clickable elements
4. **Use `e.stopPropagation?.()`** in nested onClick handlers to prevent event bubbling
5. **Batch updates** — `setProperties()` with multiple properties at once
6. **Use `pointerEvents: 'none'`** on decorative elements to skip hit testing
7. **Use `overflow: 'hidden'`** for containers with fill bars
8. **Clean up in `dispose()`** — unregister roots, remove from parent, dispose, clear references
9. **Colors** — use hex numbers (`0x2563eb`) or strings (`'white'`) — CSS color names work too

## Troubleshooting

### UI Not Visible
1. Did you call `game.renderer.localClippingEnabled = true`?
2. Did you call `game.renderer.setTransparentSort(UIKit.reversePainterSortStable)`?
3. Is the Fullscreen root added to `game.uiCamera`?
4. Is 'visibility' set to 'visible'?

### Interactions Not Working
1. Is `UIKitPointerEvents.initialize(game)` called in `init()`?
2. Is `UIKitPointerEvents.update(deltaTime)` called every frame?
3. Is `UIKitPointerEvents.registerRoot(root)` called for each root?
4. Is the `cursor: 'pointer'` set on clickable elements?
5. Is `pointerEvents` not set to `'none'` on the element?

### Animations / Expand-Collapse
- Animate by changing `height` (e.g., `0` to `300`) with `overflow: 'hidden'`
- Use `visibility` property with values "visible" or "hidden" to show/hide elements
- Use `setProperties()` to update at runtime

## Verification

- **Confirm UI visible**: Check that `localClippingEnabled = true` and `setTransparentSort` are set in `init()`
- **Confirm interactions work**: Check that `UIKitPointerEvents.initialize(game)`, `registerRoot()`, and `update(deltaTime)` are all called
- **Test in play mode**: UI only renders during play mode. Enter play mode to see the UI.
- **Check component tree**: Add `console.log` in `onStart` to verify components are created and added to root

## When Things Go Wrong

- "UI not visible" → Check all 3 required init steps: `localClippingEnabled`, `setTransparentSort`, and root added to `game.uiCamera`
- "Clicks not working" → Verify `UIKitPointerEvents.initialize(game)` in `init()`, `registerRoot(root)` after creating root, and `update(deltaTime)` called every frame
- "UI overlaps incorrectly" → Use `zIndex` to control layer order. Fullscreen roots render in creation order.
- "Text not showing" → Ensure `color` is set (defaults may be transparent). Use hex numbers (`0xffffff`) or strings (`'white'`).
- "Scroll not working" → Set `overflow: 'scroll'` on the container. Content must exceed container height/width.
- "Memory leak" → Ensure `dispose()` calls `unregisterRoot`, `removeFromParent`, `dispose()` on root, and `deinitialize()`.
- Never retry the same failing approach — check initialization order and required calls first.

## Safety Guardrails

- Always clean up in `dispose()` — unregister roots, remove from parent, dispose, clear references
- Use `e.stopPropagation?.()` in nested onClick handlers to prevent unintended event bubbling
- Set `pointerEvents: 'none'` on decorative/non-interactive elements
- Keep UI behavior code focused — complex game logic should be in separate behaviors that communicate via `game.behaviorManager.sendEventToObjectBehaviors`

## See Also

- **stemstudio-behaviors** — UIKit code lives inside behavior scripts
- **stemstudio-audio** — Sound feedback on UI interactions
- **stemstudio-game-design** — HUD and menu design patterns for different game genres