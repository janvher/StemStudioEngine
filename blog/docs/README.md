---
title: StemStudio Documentation
slug: /
description: Learn how to build 3D games and interactive experiences with StemStudio.
---

# StemStudio Documentation

StemStudio is a browser-based 3D game editor for building and publishing interactive experiences — no downloads, no installs.

## Pick Your Path

These docs are layered for two audiences. Each section's README points you to the right entry point for both.

- **No-code / visual editor** — drag assets, attach built-in behaviors, publish. Start with [Quickstart](/quickstart) → [Getting Started](getting-started/README.md).
- **JavaScript developer** — write custom behaviors, lambdas, and call runtime APIs. Start with [Behaviors vs Lambdas](scripting/01-behaviors-vs-lambdas.md) → [Erth Interface](apis/01-erth-interface.md).

## Quick Links

| Task | Go here |
|------|---------|
| Use the AI copilot | [AI Copilot](ai/01-ai-copilot.md) |
| Generate 3D models with AI | [AI Model Generation](ai/03-ai-model-generation.md) |
| Create AI NPCs | [AI NPCs](ai/02-ai-npcs.md) |
| Add sound effects | [Audio](gameplay/04-audio.md) |
| Use a built-in behavior | [Built-in Behaviors](scripting/05-built-in-behaviors.md) |
| Look up all events | [Built-in Events](apis/02-eventbus.md) |
| Work inside the unified script editor | [Code Editor Workflow](scripting/06-code-editor-workflow.md) |
| Make objects communicate | [Communication Patterns](scripting/04-communication-patterns.md) |
| Create or manage projects | [Dashboard and Project Flow](getting-started/04-dashboard-and-projects.md) |
| Look up the full API | [Erth Interface](apis/01-erth-interface.md) |
| Follow the tutorial | [Getting Started Tutorial](getting-started/getting-started-tutorial.md) |
| Look up keyboard shortcuts | [Keyboard Shortcuts](editor/05-keyboard-shortcuts.md) |
| Add an object to my scene | [Left Panel](editor/01-left-panel.md) |
| Build for mobile | [Mobile Builds](publishing/03-mobile-builds.md) |
| Enable multiplayer | [Multiplayer Overview](multiplayer/01-multiplayer-overview.md) |
| Add particle effects | [Particles and VFX](gameplay/03-particles-vfx.md) |
| Set up physics | [Physics](gameplay/01-physics.md) |
| Publish to Steam/Discord/CrazyGames | [Platform Integrations](publishing/04-platform-integrations.md) |
| Look up all primitives | [Primitives Reference](assets/03-primitives-reference.md) |
| Publish my game | [Publishing Games](publishing/01-publishing-games.md) |
| Configure an object | [Right Panel](editor/02-right-panel.md) |
| Review art asset guidelines | [Art Specs & Recommendations](assets/10-art-specs.md) |
| Build an outdoor world | [World Building and Environment](gameplay/07-world-building.md) |
| Add gameplay logic | [Writing Behaviors](scripting/02-writing-behaviors.md) |
| Persist player progress / inventory / currency across sessions | [Game Services API](services/README.md) |
| Implement player-to-player trading | [Inventory, Currency, Trading](services/03-inventory-currency-trading.md) |
| Add a leaderboard | [Player and Progression](services/02-player-and-progression.md) |

---

## Documentation Sections

### [Getting Started](getting-started/README.md)
Product overview, editor walkthrough, first game tutorial, and project/dashboard basics.

### [Editor](editor/README.md)
Left panel, right panel, toolbar, project settings, and keyboard shortcuts.

### [Assets](assets/README.md)
Asset library, importing, primitives reference, stems/prefabs, and materials.

### [Scripting](scripting/README.md)
Behaviors vs lambdas, writing custom scripts, the unified code editor workflow, communication patterns, and the built-in behavior reference.

### [APIs](apis/README.md)
Current `this.erth` runtime namespaces, built-in events, global store, GameManager, and GameObject API.

### [Gameplay](gameplay/README.md)
Physics, animation, particles/VFX, audio, HUD/UI, camera, and world-building workflows.

### [AI](ai/README.md)
AI copilot, AI NPCs, 3D model generation, and image generation.

### [Multiplayer](multiplayer/README.md)
Multiplayer mental model and writing multiplayer-safe code.

### [Publishing](publishing/README.md)
Publishing games, publishing assets, mobile builds, and platform integrations.

### [Game Services API](services/README.md)
Backend REST + WebSocket APIs for persistent player profiles, progression, inventory, currency, trading, world state, combat, asset delivery, and telemetry. Multi-tenant — works for any StemStudio game.
