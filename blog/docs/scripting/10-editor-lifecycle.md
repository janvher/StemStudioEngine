---
title: Editor Lifecycle (Behavior Plugins)
slug: editor-lifecycle
description: "How behaviors can run inside the editor using onEditor* lifecycle methods, enabling live previews, custom inspector panels, and editor tools."
status: draft
audience: technical-creators
prerequisites: [scripting/02-writing-behaviors]
---

# Editor Lifecycle (Behavior Plugins)

Behaviors normally run only during play mode. But behaviors that implement any `onEditor*` method become **editor plugins** -- they run inside the editor itself, enabling live previews, custom inspector buttons, and editor-time tooling.

## What This Page Is For

Use this page when you need to:

- Build a behavior that runs in the editor (not just play mode)
- Create live previews of behavior effects
- Add custom buttons to the behavior inspector panel
- React to attribute changes in real time
- Understand how the editor detects and manages plugin behaviors

## How Detection Works

When a behavior is attached to an object, the `BehaviorPluginManager` checks whether the behavior defines any `onEditor*` method. If it does, the behavior is treated as an **editor plugin** and receives editor lifecycle callbacks.

The following methods are checked:

- `onEditorAdded`
- `onEditorRemoved`
- `onEditorDispose`
- `onEditorUpdate`
- `onEditorAttributesUpdated`
- `onEditorPanelShown`
- `onEditorPanelHidden`
- `onEditorEvent`

If any of these exist on the behavior instance, `isPlugin()` returns `true` and the behavior is registered as an editor plugin.

## Lifecycle Methods Reference

| Method | When It Runs | Use It For |
|--------|-------------|------------|
| `onEditorAdded(editor)` | Behavior is attached to an object in the editor | Setting up editor-time state, subscribing to editor events |
| `onEditorRemoved()` | Behavior is removed from an object in the editor | Cleaning up editor-time state (not called on mode switch) |
| `onEditorDispose()` | Editor disposes the behavior (mode switch, editor close) | Final cleanup of resources and listeners |
| `onEditorUpdate(deltaTime)` | Every editor frame | Live previews, continuous visual updates |
| `onEditorPanelShown()` | Behavior's inspector panel opens | Setting up panel-specific state |
| `onEditorPanelHidden()` | Behavior's inspector panel closes | Tearing down panel-specific state |
| `onEditorAttributesUpdated()` | Attributes change in the inspector panel | Refreshing visuals to reflect new attribute values |
| `onEditorButtonClicked(action)` | A custom button in the inspector is clicked | Running one-shot editor actions (generate, reset, randomize) |
| `onEditorEvent(msg, data)` | A custom editor event is received | Reacting to editor-specific events from other systems |

### Important Distinctions

- **`onEditorRemoved`** is called when the behavior is explicitly removed from an object. It is **not** called when switching to play mode or closing the editor -- use `onEditorDispose` for that.
- **`onEditorDispose`** is called when the editor disposes the behavior. This happens when switching to play mode or closing the editor. Always clean up listeners and resources here.
- **`onEditorUpdate`** runs every editor frame, not just during play. Use it for live previews, but keep it lightweight to avoid slowing down the editor.

## Example: Live Preview Plugin

This behavior previews a bobbing animation directly in the editor:

```ts
export default class BobbingPreview extends BehaviorBase {
    baseY = 0;
    time = 0;

    // ── Editor Lifecycle ──────────────────────────────

    onEditorAdded(editor) {
        this.baseY = this.target.position.y;
    }

    onEditorUpdate(deltaTime) {
        const amplitude = this.getAttribute("amplitude") ?? 0.5;
        const speed = this.getAttribute("speed") ?? 2;

        this.time += deltaTime * speed;
        this.target.position.y = this.baseY + Math.sin(this.time) * amplitude;
    }

    onEditorAttributesUpdated() {
        // Reset preview when attributes change
        this.time = 0;
        this.target.position.y = this.baseY;
    }

    onEditorDispose() {
        // Restore original position
        this.target.position.y = this.baseY;
    }

    // ── Play Mode ─────────────────────────────────────

    init(game) {
        super.init(game);
        this.baseY = this.target.position.y;
    }

    update(deltaTime) {
        const amplitude = this.getAttribute("amplitude") ?? 0.5;
        const speed = this.getAttribute("speed") ?? 2;

        this.time += deltaTime * speed;
        this.target.position.y = this.baseY + Math.sin(this.time) * amplitude;
    }

    dispose() {
        this.target.position.y = this.baseY;
    }
}
```

## Custom Buttons

Define buttons in `behavior.json` using the `buttons` field:

```json
{
    "id": "terrainPainter",
    "name": "Terrain Painter",
    "buttons": [
        {
            "id": "randomize",
            "label": "Randomize Heights",
            "icon": "shuffle"
        },
        {
            "id": "flatten",
            "label": "Flatten Terrain",
            "icon": "align-bottom"
        }
    ],
    "attributes": { ... }
}
```

Handle clicks in the behavior:

```ts
onEditorButtonClicked(action) {
    switch (action) {
        case "randomize":
            this.randomizeHeights();
            break;
        case "flatten":
            this.flattenTerrain();
            break;
    }
}
```

## Use Cases

| Use Case | Methods Used |
|----------|-------------|
| Live animation preview | `onEditorAdded`, `onEditorUpdate`, `onEditorDispose` |
| Real-time attribute feedback | `onEditorAttributesUpdated` |
| Custom editor buttons | `onEditorButtonClicked` |
| Panel-specific setup | `onEditorPanelShown`, `onEditorPanelHidden` |
| Editor tool with cleanup | `onEditorAdded`, `onEditorRemoved`, `onEditorDispose` |

## Key Files

- `web/src/editor/behaviors/BehaviorPluginManager.ts` -- Plugin detection and lifecycle management
- `web/src/editor/behaviors/BehaviorUIManager.tsx` -- Inspector panel rendering and button handling

## Next Steps

- [Writing Behaviors](02-writing-behaviors.md) -- Full behavior lifecycle reference
- [Communication Patterns](04-communication-patterns.md) -- Event patterns for behavior communication
- [Built-in Behaviors Reference](05-built-in-behaviors.md) -- Existing behaviors to learn from
