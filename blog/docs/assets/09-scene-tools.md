---
title: Scene Tools
slug: scene-tools
description: Scene Volumes, Spawn Points, and Point Sound — invisible gameplay tools for triggers, spawning, and spatial audio.
status: draft
audience: creators
prerequisites: [editor/01-left-panel, gameplay/01-physics]
---

# Scene Tools

Scene tools are invisible objects that control gameplay logic. They do not render in the final game but define trigger zones, player spawn locations, and spatial audio sources.

All scene tools are found in **Library & Tools > Tools** in the left panel.

---

## Scene Volumes

Scene volumes are invisible trigger zones that react when a player or object enters them. Use them for kill zones, blocking walls, dialogue triggers, win/lose conditions, and custom game events.

### How To Add

1. Open the **Library & Tools** tab in the left panel.
2. Expand the **Tools** category.
3. Click **Scene Volumes**.
4. A volume object is added to your scene.

### Volume Presets

When you add a scene volume, you can choose from six presets that configure the volume's behavior:

| Preset | Volume Type | Behavior |
|--------|------------|----------|
| **Blocking** | Blocking Volume | Blocks characters from passing through. Default: block characters = on, block enemies = off, block throwables = off |
| **Kill** | Kill Volume | Deals damage on contact. Default: damage = 9999, lose points = 2, lose time = 2 |
| **Dialogue** | Dialogue Volume | Triggers a dialogue event. No blocking or damage |
| **Lose** | Lose Volume | Triggers a lose condition. Default: lose points = 1, lose time = 1 |
| **Win** | Win Volume | Triggers a win condition. No blocking or damage |
| **Custom** | Custom | No preset behavior. Configure all properties manually |

### Volume Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Volume Type** | text (auto-set) | Blocking | Internal type identifier set by the preset |
| **Block Enemies** | toggle | off | When enabled, enemies cannot pass through this volume |
| **Block Throwables** | toggle | off | When enabled, throwable objects are blocked |
| **Block Characters** | toggle | on | When enabled, player characters are blocked |
| **Damage Amount** | number (min 0) | 20 | Damage dealt to the player on contact. Set to 9999 for instant kill |
| **Lose Points** | number (min 0) | 2 | Score points deducted when a player enters the volume |
| **Lose Time** | number (min 0) | 2 | Seconds deducted from the game timer |

### Game Event Integration

Scene volumes emit events when entered. You can use these events in your behaviors and lambdas to trigger custom game logic such as showing dialogue, playing sounds, or changing levels.

> **Tip:** Scale the volume object to define the size of the trigger zone. The volume's transform (position, rotation, scale) determines the area that triggers events.

---

## Spawn Points

Spawn points define where players appear when a game starts or when they respawn after dying. They are invisible in play mode but shown as visual markers in the editor.

### How To Add

1. Open the **Library & Tools** tab in the left panel.
2. Expand the **Tools** category.
3. Click **Spawn Point**.
4. A spawn point marker is added to your scene.

### Editor Visualization

In the editor, spawn points display as a visual marker with:
- A head and body silhouette showing player position
- An arrow indicating the spawn facing direction

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Spawn Number** | number | — | The priority order for this spawn point (lower numbers are used first) |
| **Spawn Type** | dropdown | Normal | **Normal** (used for all players) or **Team** (assigned to a specific team in multiplayer) |

### Multiplayer Usage

In multiplayer games, place multiple spawn points around the map. Use the **Team** spawn type to assign specific spawn locations to different teams. The **Spawn Number** determines priority when multiple spawn points of the same type are available.

> **Tip:** Place spawn points slightly above the ground to prevent players from spawning inside the floor geometry.

---

## Point Sound

Point sound is a spatial audio source that plays sound from a specific location in the scene. The sound volume and panning change based on the listener's distance and direction.

Point sound uses the **Generic Sound** behavior under the hood.

### How To Add

1. Open the **Library & Tools** tab in the left panel.
2. Expand the **Tools** category.
3. Click **Point Sound**.
4. A point sound object is added to your scene.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Audio Asset** | audio picker | — | The sound file from your project's asset library |
| **Positional** | toggle | off | When enabled, sound is spatialized in 3D (volume and panning change with distance) |
| **Rolloff Factor** | number (min 0) | 1 | How quickly the sound fades with distance. Higher values = faster fade. Only visible when Positional is enabled |
| **Looping Sound** | toggle | off | When enabled, the sound repeats continuously |
| **Auto Play** | toggle | off | When enabled, the sound starts playing when the scene loads |
| **Volume** | slider (0-1) | 1 | Playback volume. 0 = silent, 1 = full volume |
| **Start On Trigger** | toggle | off | When enabled, the sound plays only when activated by a trigger event |

### Event-Driven Control

Point sounds can be controlled at runtime through behavior events:

| Event | Action |
|-------|--------|
| **sound:play** | Start playing the sound |
| **sound:stop** | Stop the sound |
| **sound:pause** | Pause playback |
| **sound:resume** | Resume from where it was paused |
| **sound:setVolume** | Change the volume level |
| **trigger (activate)** | Start the sound via trigger |
| **trigger (deactivate)** | Stop the sound via trigger |

> **Tip:** Enable **Positional** audio and place point sounds near objects like campfires, waterfalls, or machinery to create immersive spatial audio that gets louder as the player approaches.

---

## Tips

- **Scene volumes are invisible in play mode.** Use the editor viewport to verify their position and scale before testing.
- **Combine volumes with spawn points** to create respawn systems: a kill volume resets the player, and a spawn point determines where they reappear.
- **Use custom volumes** with behavior scripts for advanced game logic like checkpoints, collectible zones, or area-based effects.
- **Point sounds with autoplay and looping** are perfect for ambient environmental audio (wind, water, fire).
- **Adjust rolloff factor** on point sounds to control how far the sound carries. A rolloff of 1 is standard; higher values make the sound more localized.

## Next Steps

- Set up game rules and scoring in [HUD and UI](../gameplay/05-hud-and-ui.md).
- Learn about behaviors for custom game logic in [Writing Behaviors](../scripting/02-writing-behaviors.md).
- Configure camera behavior during gameplay in [Camera](../gameplay/06-camera.md).
