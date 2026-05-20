# APIs

Reference documentation for the current runtime APIs creators use from behaviors and related systems.

## Articles

1. [Erth Interface](01-erth-interface.md) — Current `this.erth` namespaces: assets, behaviors, lambdas, combat, team, pool, tween, fsm, behaviorTree, spatial
2. [Built-in Events Reference](02-eventbus.md) — Engine events received through `onEvent()`
3. [Global Store](03-global-store.md) — Shared key-value state across behaviors
4. [Game Manager](04-game-manager.md) — Lower-level engine access for advanced cases
5. [GameObject API](05-gameobject-api.md) — GameObject properties, physics, and transforms
6. [UIKit and Pointer Events](06-uikit.md) — 3D UI components and interaction from behavior scripts

## Prerequisites

Read [Behaviors vs Lambdas](../scripting/01-behaviors-vs-lambdas.md) first to understand where these APIs fit in the current runtime model.

> **Audience layering**
> These are developer-track docs — they assume you are writing custom behaviors or lambdas. If you are building without code, you don't need to read this section; the [Built-in Behaviors Reference](../scripting/05-built-in-behaviors.md) is enough.
