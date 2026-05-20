---
title: "Tutorial: Vehicle Swapping"
slug: tutorial-vehicle-swap
description: "Switch between vehicle objects at runtime using behavior events and object-level pause or resume."
status: draft
audience: technical-creators
prerequisites: [scripting/02-writing-behaviors, scripting/04-communication-patterns]
---

# Tutorial: Vehicle Swapping with Events

Build a behavior that manages a set of vehicle objects. Switching vehicles hides and pauses the old object, shows and resumes the new one, and emits a `"vehicleChanged"` event so HUD or audio behaviors can react.

> **Inspired by** the [8th Wall Physics Playground](https://github.com/8thwall/studio-physics-playground-example) `vehicleSwap` component -- adapted to StemStudio behaviors.

## What You Will Learn

- Using the `onEvent()` lifecycle hook for receiving events from other behaviors
- Sending events via `game.behaviorManager.sendEventToObjectBehaviors()` for targeted communication
- Pausing and resuming vehicle objects with `this.game.pauseObject()` and `this.game.resumeObject()`
- Using group array attributes for configurable lists
- Toggling object visibility to swap models
- Building a simple state machine with an `activeIndex`

## Scene Setup

1. Create a **root object** (empty group) for the player.
2. Add 2-3 child objects under it, each containing a different model (e.g. a car, a bike, a hovercraft).
3. Attach the relevant controller behaviors to each vehicle model object.
4. Attach the **Vehicle / Behavior Swap** behavior to the root object.
5. In the behavior attributes, add one entry per vehicle in the **Vehicles** group array, filling in the label and model object reference.
6. Optionally create UIKit buttons that emit `"vehicleSelect"` events (see the example below).

## The Behavior

### behavior.json

```json
{
    "id": "vehicleSwap",
    "name": "Vehicle / Behavior Swap",
    "description": "Switches between vehicle objects and swaps the visible model using onEvent.",
    "author": "StemStudio",
    "version": "1.0.0",
    "tags": ["tutorial", "events", "state-machine"],
    "main": "script.js",
    "throttleConfig": {
        "throttlePriority": "HIGH",
        "enableFrustumCulling": false,
        "enableDistanceThrottling": false,
        "requiresConsistentUpdates": true
    },
    "attributes": {
        "vehicles": {
            "name": "Vehicles",
            "type": "group",
            "array": true,
            "itemLabel": "Vehicle",
            "default": [],
            "attributes": {
                "label": {
                    "name": "Label",
                    "type": "string",
                    "default": "Car",
                    "description": "Display name for the vehicle."
                },
                "modelObject": {
                    "name": "Model Object",
                    "type": "object",
                    "description": "Scene object containing the vehicle model."
                }
            }
        },
        "defaultIndex": {
            "name": "Default Vehicle Index",
            "type": "number",
            "default": 0,
            "min": 0,
            "description": "Which vehicle is active on start (0-based index)."
        }
    }
}
```

### script.js

```js
export default class VehicleSwap extends BehaviorBase {

    activeIndex = -1;

    init(game) {
        super.init(game);
    }

    onStart() {
        const defaultIdx = this.getAttribute("defaultIndex") ?? 0;
        this.switchTo(defaultIdx);
    }

    findSceneObject(uuid) {
        return this.game?.scene?.getObjectByProperty("uuid", uuid) ?? null;
    }

    switchTo(index) {
        const vehicles = this.getAttribute("vehicles") ?? [];
        if (index < 0 || index >= vehicles.length) return;
        if (index === this.activeIndex) return;

        // Deactivate current
        if (this.activeIndex >= 0) {
            this.setVehicleActive(vehicles[this.activeIndex], false);
        }

        // Activate new
        this.activeIndex = index;
        this.setVehicleActive(vehicles[index], true);

        // Notify other behaviors on this object about the vehicle change
        this.game?.behaviorManager?.sendEventToObjectBehaviors(
            this.target, "vehicleChanged", { index, label: vehicles[index].label }
        );
    }

    setVehicleActive(vehicle, active) {
        if (!vehicle.modelObject) return;

        const obj = this.findSceneObject(vehicle.modelObject);
        if (!obj) return;

        obj.visible = active;

        if (active) {
            this.game?.resumeObject(obj, true);
        } else {
            this.game?.pauseObject(obj, true);
        }
    }

    onEvent(msg, data) {
        if (msg === "vehicleSelect" && typeof data?.index === "number") {
            this.switchTo(data.index);
        }
    }

    dispose() {}
}
```

## How It Works

### Group array attributes

The `vehicles` attribute uses `type: "group"` with `array: true`. Each entry stores a label and an object reference. Creators add or remove entries in the editor UI, making the swap list configurable without changing code.

### Event-driven communication

The `onEvent` lifecycle hook receives `"vehicleSelect"` messages sent via `this.game.behaviorManager.sendEventToObjectBehaviors()`. This decouples the swap logic from the triggering mechanism.

### Pause / resume

When a vehicle is deactivated, `this.game.pauseObject()` pauses behaviors on that object and removes it from active physics simulation. When re-activated, `this.game.resumeObject()` restores the object cleanly. This is a better fit for the current runtime than reaching for per-behavior pause helpers.

### Visibility toggling

Each vehicle entry references a scene object (the model). Toggling `obj.visible` shows or hides it instantly. Only the active vehicle's model is visible at any time.

### Notifying vehicleChanged

After switching, the behavior calls `sendEventToObjectBehaviors()` to emit `"vehicleChanged"` to all behaviors on the object. A HUD behavior implements `onEvent` to receive these and update the display.

### Triggering from UI buttons

Here is a minimal example of a helper behavior attached to the **same root object** that creates UIKit buttons to trigger swaps:

```js
// Attach this helper to the same root object as VehicleSwap
onStart() {
    const panel = new UIKit.Container({ width: 3, height: 0.5 });
    const labels = ["Car", "Bike", "Hovercraft"];

    labels.forEach((label, i) => {
        const btn = new UIKit.Text({
            content: label,
            fontSize: 0.08,
            backgroundColor: "#444",
            padding: 0.05,
        });
        btn.addEventListener("click", () => {
            this.game?.behaviorManager?.sendEventToObjectBehaviors(
                this.target, "vehicleSelect", { index: i }
            );
        });
        panel.add(btn);
    });

    this.target.add(panel);
}
```

## Try It

- Add a third vehicle to the group array and test swapping between all three.
- Wire up keyboard shortcuts (e.g. `1`, `2`, `3`) instead of UI buttons.
- Listen for `"vehicleChanged"` in another behavior to play a sound effect on swap.
- Combine with the [Reset / Respawn](07-tutorial-reset-respawn.md) behavior so each vehicle has its own spawn point.

## Next Steps

- [Communication Patterns](04-communication-patterns.md) -- Full guide to behavior references, store, and event patterns
- [Built-in Behaviors Reference](05-built-in-behaviors.md) -- Existing controller behaviors you can swap between
- [HUD and UI](../gameplay/05-hud-and-ui.md) -- Build a vehicle selection HUD
- [Tutorial: Reset / Respawn](07-tutorial-reset-respawn.md) -- Add respawn support to your swappable vehicles
