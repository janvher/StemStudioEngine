# Scripting

How to add game logic with behaviors and lambdas in StemStudio.

## Articles

1. [Behaviors vs Lambdas](01-behaviors-vs-lambdas.md) — The current mental model and decision guide
2. [Writing Behaviors](02-writing-behaviors.md) — Lifecycle, attributes, config, and examples
3. [Writing Lambdas](03-writing-lambdas.md) — Lambda packs, component schema, execution, and examples
4. [Communication Patterns](04-communication-patterns.md) — Behavior references, store, lambda queries, and data flow
5. [Built-in Behaviors Reference](05-built-in-behaviors.md) — Built-in behavior packs by category
6. [Code Editor Workflow](06-code-editor-workflow.md) — Unified editor workflow for behaviors, lambdas, scripts, files, revisions, and popout editing

> **Audience layering**
> - **No-code creators:** start at [Built-in Behaviors](05-built-in-behaviors.md). Most games can be built end-to-end by attaching and configuring these.
> - **JS developers:** start at [Behaviors vs Lambdas](01-behaviors-vs-lambdas.md), then [Writing Behaviors](02-writing-behaviors.md) for the lifecycle and `this.erth` API.

### Tutorials

7. [Tutorial: Reset / Respawn System](07-tutorial-reset-respawn.md) — Teleport, velocity clearing, debounce, and dynamic spawn points
8. [Tutorial: Vehicle / Behavior Swapping](08-tutorial-vehicle-swap.md) — Event-driven communication, behavior toggling, and model swapping
9. [Tutorial: NPC State Machine](09-tutorial-npc-state-machine.md) — Patrol, detect, interact, and animate an NPC with a state machine

### Advanced

10. [Editor Lifecycle (Behavior Plugins)](10-editor-lifecycle.md) — Live previews, custom buttons, and editor-time behavior hooks

## Questions These Articles Answer

- When should I choose a behavior over a lambda?
- How do I attach logic to a single object?
- How do I batch-process many objects efficiently?
- How do behaviors and lambdas communicate?
- What built-in behaviors are already available?
- How do I work safely inside the current unified scripting editor?

## Prerequisites

Read [Editor Tour](../getting-started/02-editor-tour.md) to understand where behaviors and lambdas appear in the UI.
