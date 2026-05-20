---
title: Left Panel — Assets, Library, and Tools
slug: left-panel-assets-library-tools
description: Learn how the current left panel works for scene hierarchy, asset creation, imports, uploads, and code assets.
status: draft
audience: creators
prerequisites: [getting-started/02-editor-tour]
---

# Left Panel — Assets, Library, and Tools

The left panel is where you browse your scene hierarchy, add content, open asset tools, and jump into code assets.

![Full left panel with several asset categories visible](images/Left_Panel.PNG)

## What This Page Is For

Use this page when you need to:

- switch between scene hierarchy and asset browsing
- create or upload new assets
- import behaviors, lambdas, or stems
- open behaviors, lambdas, imports, and files in the code editor

## Two Modes: Project And Library & Tools

In professional mode, the left panel has two tabs:

- **Project** for the scene hierarchy
- **Library & Tools** for assets and creation tools

In simplified mode, StemStudio can collapse this into an **Assets** view with an **Add Object** flow instead of the full professional tab layout.

### Project

Use the **Project** tab when you want to work with objects already in the scene:

- select objects by name
- inspect parent/child relationships
- reorganize the hierarchy
- find hard-to-click nested objects

### Library & Tools

Use **Library & Tools** when you want to add or manage assets.

At the top of this tab, the **Manage Library** button opens the broader asset library flow for finding and importing reusable assets.

## Current Category List

The current left-panel asset rows are:

| Category | What it contains |
|----------|------------------|
| **Primitives** | Built-in shapes and quick-start geometry |
| **Models** | Uploaded or imported 3D model assets |
| **Behaviors** | Behavior assets for per-object gameplay logic |
| **Lambdas** | Shared runtime system assets |
| **Scripts** | Reusable JavaScript modules shared by behaviors and lambdas via `@import` directives |
| **Tools** | Editor/runtime helper objects like billboards, lights, scene volumes, spawn points, and point sounds |
| **Stems** | Reusable prefab-style assets |
| **Particle Effects** | Quarks-based VFX assets |
| **Sounds** | Audio assets |
| **Images** | Image and texture assets |
| **Videos** | Video assets |
| **Files** | General file assets, especially useful for text-based support files |

> AI NPCs, AI Models, Scenes, and Textures are managed through the **Manage Library** button at the top of the panel rather than from the inline rows.

## What Each Script Category Does

### Behaviors

Use **Behaviors** to browse and create per-object gameplay scripts.

From this row you can:

- create a new behavior
- import behavior YAML
- open an existing behavior in the unified code editor

Creating a behavior opens the modern code editor flow, not a separate legacy modal.

### Lambdas

Use **Lambdas** to browse and create shared ECS-style processing systems.

From this row you can:

- create a new lambda
- import lambda YAML
- open an existing lambda in the unified code editor

### Scripts

Use **Scripts** for shared JavaScript modules. These are reusable code assets that behaviors and lambdas pull in via the `@import` directive.

From this row you can:

- create a new script module
- open an existing script in the unified code editor

### Files

Use **Files** for general file assets. Text-based files can also appear in the code editor’s asset tree for direct editing.

## Upload And Create Actions

Different rows support different actions.

| Category | Create / Upload flow |
|----------|----------------------|
| **Models** | Opens the model upload workflow |
| **Behaviors** | Opens the unified code editor in new-behavior mode |
| **Lambdas** | Opens the unified code editor in new-lambda mode |
| **Scripts** | Opens the unified code editor in new-script mode |
| **Particle Effects** | Opens the particle upload flow |
| **Sounds** | Upload audio files |
| **Images** | Upload image files |
| **Videos** | Upload video files, typically admin-only |
| **Files** | Upload arbitrary files |

## Importing Assets

The import button currently applies to:

- **Behaviors**
- **Lambdas**
- **Stems**

These imports use YAML export files.

## Searching The Left Panel

The search field filters the visible asset rows by name.

When you search:

- matching entries are easier to locate across categories
- the panel becomes much faster to scan in large scenes
- AI-related generate actions may appear for relevant asset types

## Practical Creator Workflow

A common loop looks like this:

1. Open **Library & Tools**.
2. Add a primitive, model, stem, or tool object.
3. Create or open a behavior, lambda, or import as needed.
4. Select the scene object.
5. Configure it in the right panel.
6. Test in play mode.

## Common Mistakes

- **Looking for shared modules in the behavior or lambda rows.** The **Scripts** row is the home for shared `@import` modules.
- **Treating the left panel as only a browser.** It is also the entry point for creating behaviors, lambdas, scripts, and files.
- **Expecting all files to open in Monaco.** Only text-based files show up in the code editor workspace.
- **Using the left panel to attach behaviors to objects.** The left panel manages assets; object attachment still happens through the right panel.

## Next Steps

- Read [Right Panel](02-right-panel.md) to attach and configure behaviors or lambdas on an object.
- Read [Code Editor Workflow](../scripting/06-code-editor-workflow.md) to understand the current scripting editor.
- Read [Importing Assets](../assets/02-importing-assets.md) for file-format guidance.
