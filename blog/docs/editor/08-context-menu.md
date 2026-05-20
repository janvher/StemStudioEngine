---
title: Context Menu
slug: context-menu
description: Right-click actions in the viewport — creating objects, adding interactions, and copying/pasting.
status: draft
audience: creators
prerequisites: [editor/03-toolbar-and-viewport]
---

# Context Menu

Right-clicking in the 3D viewport opens a context menu with quick actions. The available options depend on whether an object is selected.

## How To Access

Right-click anywhere in the 3D viewport.

---

## Actions Without Selection

When no object is selected, right-clicking shows:

| Action | Description |
|--------|-------------|
| **Create** | Opens the Create submenu to add new objects to the scene |
| **Paste** | Pastes a previously copied object at the clicked position |

---

## Actions With Selection

When an object is selected, right-clicking shows:

| Action | Description |
|--------|-------------|
| **Create** | Opens the Create submenu to add new objects |
| **Add Interaction** | Opens the AI copilot to add interactive behaviors to the selected object |
| **Copy** | Copies the selected object to the clipboard |

---

## Create Submenu

The Create submenu provides a searchable asset browser for adding objects to your scene.

### Layout

| Element | Description |
|---------|-------------|
| **Search bar** | Filter assets by name |
| **Filter tabs** | **All**, **Primitives**, **Models** — filter by asset category |
| **Asset grid** | Visual grid of available assets with thumbnails |
| **Generate with AI** | Button to generate a new 3D model using AI |

### Adding Objects

1. Right-click in the viewport.
2. Click **Create**.
3. Browse or search for the asset you want.
4. Click an asset thumbnail to add it to the scene.

The object is placed at the point where you right-clicked.

### AI Object Creation

Click **"Generate with AI"** in the Create submenu to open the AI model generation workflow:

1. **Enter a prompt** describing the object you want (e.g., "medieval wooden chair").
2. The system searches existing assets that match your description.
3. If no match is found, it generates a new 3D model using AI (Meshy, Tripo, or Erth providers).
4. Preview the generated model.
5. Confirm to add it to your scene and asset library.

---

## Edit Menu (With Object Selected)

When you right-click a selected object, additional context options may include:

| Action | Description |
|--------|-------------|
| **Behaviors** | Shows the list of behaviors currently attached to the object |
| **Add Behavior** | Attach a new behavior to the selected object |
| **Remove Behavior** | Remove an existing behavior from the object |
| **Configure Behavior** | Open the behavior's settings in the right panel |

---

## Tips

- **Right-click placement** positions new objects at the 3D point under your cursor, making it faster than adding from the left panel and repositioning.
- **Copy and paste** preserves all object properties, behaviors, and materials.
- **Use the search** in the Create submenu to quickly find specific primitives or models by name.
- **Add Interaction** is a shortcut to the AI copilot that helps you set up behaviors without writing code.

## Next Steps

- Learn about all viewport interactions in [Toolbar and Viewport](03-toolbar-and-viewport.md).
- Explore the asset library in the [Left Panel](01-left-panel.md).
- Add behaviors to objects using the [Right Panel](02-right-panel.md).
