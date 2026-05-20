---
title: Specialized Editors
slug: specialized-editors
description: Full-screen editors for particle effects (VFX), animation graphs, and HUD/UI layout.
status: draft
audience: technical-creators
prerequisites: [editor/02-right-panel]
---

# Specialized Editors

StemStudio includes three full-screen editors for advanced content creation: the **VFX Editor** for particle effects, the **Animation Combiner** for animation state machines, and the **HUD Editor** for in-game UI layout.

---

## VFX Editor

The VFX Editor is a full-screen environment for editing particle effects (visual effects). It provides a live preview, per-emitter controls, and a playback toolbar.

### How To Access

1. Select an object with a **Particle Emitter** behavior in the scene.
2. In the right panel, find the Particle Emitter section.
3. Click **"Edit Particle Effect"**.
4. The VFX Editor opens full-screen.

### Interface Layout

| Panel | Description |
|-------|-------------|
| **Preview** | A 3D viewport showing the particle effect in real time. You can orbit, zoom, and pan the camera |
| **Emitters Panel** | Lists all emitters in the particle system. Add, edit, rename, or delete individual emitters |
| **Properties Panel** | Shows editable properties for the selected emitter (emission rate, lifetime, size, color, texture, physics, etc.) |
| **Play Bar** | Transport controls at the bottom: Play, Pause, Stop |

### Workflow

1. **Select an emitter** from the emitters panel to edit its properties.
2. **Adjust properties** in the properties panel. Changes are reflected live in the preview.
3. **Add emitters** using the add button in the emitters panel to create multi-emitter effects.
4. **Preview playback** using the play bar to see the effect animate.
5. **Save** your changes or **Cancel** to discard and return to the main editor.

### Backup and Restore

The VFX Editor automatically backs up the particle effect state when you open it. If you cancel your changes, the backup is restored. Saved changes overwrite the backup.

---

## Animation Combiner

The Animation Combiner is a full-screen editor for managing animations on 3D models and building animation state machines (animation graphs).

### How To Access

1. Select a 3D model with animations in the scene.
2. In the right panel, click **"Show Animation Combiner"**.
3. The Animation Combiner opens full-screen.

### Interface Layout

| Panel | Description |
|-------|-------------|
| **Model Viewer** | A 3D viewport showing the model with bone visualization. Preview animations in real time |
| **Animation List** | Lists all animations attached to the model. Play, rename, or delete individual animations |
| **Animation Graph Editor** | A node-based visual editor for creating animation state machines |

### Animation List

The animation list shows every animation clip on the model. From here you can:

- **Play** an animation to preview it on the model
- **Rename** animations for clarity
- **Delete** animations you do not need
- **Import Mixamo animations** to add new animation clips from the Mixamo library

### Animation Graph Editor

The animation graph editor lets you build state machines that control how animations transition during gameplay.

**Key concepts:**

| Concept | Description |
|---------|-------------|
| **States** | Each state represents an animation (or blend tree). States are displayed as nodes in the graph |
| **Transitions** | Edges connecting two states. Define when and how to transition from one animation to another |
| **Conditions** | Rules on transitions that must be met before the transition fires |
| **Parameters** | Variables that drive transition conditions. Types: **Float**, **Int**, **Bool**, **Trigger** |

**Actions:**

- **Add states** by right-clicking the canvas and selecting "Add State"
- **Connect states** by dragging from one node's output to another node's input to create a transition
- **Configure transitions** by selecting an edge to set conditions and blending options
- **Set a default state** that plays when the game starts

### AI Auto-Generate Graph

The Animation Combiner includes an AI feature that can automatically generate an animation graph based on the available animation clips. This creates a reasonable starting state machine that you can then refine.

### Import and Export

- **Import:** Load a previously saved animation graph from a JSON file
- **Export:** Save the current animation graph as a JSON file for reuse in other models or projects

---

## HUD Editor

The HUD Editor is a full-screen layout tool for designing in-game user interface elements: menus, health bars, score displays, and mobile controls.

### How To Access

1. In the right panel, click **"Open UI Panel"** (or find the HUD/UI section).
2. The HUD Editor opens full-screen.

### Tabs

The HUD Editor has four tabs, each for a different game screen:

| Tab | Purpose |
|-----|---------|
| **Game Start Menu** | The menu shown before gameplay begins (logo, play button, settings) |
| **In-Game Menu** | The pause or options menu shown during gameplay |
| **Game HUD** | The heads-up display visible during gameplay (health, score, timer, items) |
| **Mobile Controls** | Touch controls for mobile devices (virtual joystick, action buttons) |

### Slot-Based Layout

Each tab uses a slot-based layout system. Slots are predefined positions on the screen where you can place UI widgets. Click a slot to open a configuration popup where you select and customize a widget.

### Available Widgets

| Widget | Available In | Description |
|--------|-------------|-------------|
| **Logo** | Game Start Menu | Display a custom logo image |
| **Game Button** | Game Start Menu, In-Game Menu | Configurable button with custom text, colors, and click sounds |
| **Health** | Game HUD | Displays the player's health bar or hearts |
| **Score** | Game HUD | Displays the current score |
| **Timer** | Game HUD | Shows a countdown or elapsed time |
| **Lives** | Game HUD | Displays remaining lives |
| **Collectable** | Game HUD | Shows collected item count |
| **Mini Map** | Game HUD | A top-down minimap view of the scene |
| **Banner** | Game HUD | A text or image banner across the screen |
| **Item Buttons** | Game HUD | Numbered item slots (1-5) for inventory or ability hotkeys |

### Configuring Widgets

Each widget has its own set of properties. For example:

- **Game buttons** can have custom text, background color, text color, hover effects, and click sounds
- **Health/Score/Timer** can be configured with icons, fonts, and display formats
- **Mini map** can be sized and positioned
- **Item buttons** map to keyboard keys (1-5) for quick access

---

## Tips

- **VFX Editor:** Use multiple emitters in a single particle effect to create complex effects like a campfire (flame + smoke + sparks).
- **Animation Combiner:** Name your animations descriptively (e.g., "idle", "walk", "run", "jump") to make the animation graph easier to understand.
- **Animation Graph:** Use **Trigger** parameters for one-shot animations (like "attack" or "jump") and **Bool** parameters for sustained states (like "isRunning").
- **HUD Editor:** Test your HUD layout on different screen sizes. The slot-based system adapts to various resolutions.
- **Mobile Controls:** Always set up the Mobile Controls tab if your game targets mobile platforms.

## Next Steps

- Learn about particle effects in [Particles and VFX](../gameplay/03-particles-vfx.md).
- Set up animations in [Animation](../gameplay/02-animation.md).
- Configure in-game UI in [HUD and UI](../gameplay/05-hud-and-ui.md).
