---
name: stemstudio-scripts
description: Script asset design for Studio 3D — shared JavaScript helpers consumed by behaviors and lambdas via `@import` directives. Use when behaviors duplicate logic that should live in a shared module, when extracting reusable math/UI/state helpers, or when authoring `@import` directives.
---

# StemStudio Scripts

Use this skill to design **script assets** — first-class assets whose body is a plain JavaScript module. Behaviors and lambdas pull them in via `@import` directives at the top of their code blocks.

> **Naming.** The engine asset type is `script` (formerly `import`). The stemscript directive is unchanged: `import script name="..." filepath="..."`. Older docs and YAML envelopes that spell the type as `import` are still accepted on the read path.

The copilot can:
- explain when to extract shared logic into a script asset
- design the API surface of a script module (which functions to export)
- write the module body and the `@import` directive that consumes it
- write or update behaviors / lambdas that call into a script asset
- diagnose `@import` errors (cycles, missing specifiers, bad alias)

The copilot cannot:
- create, delete, or list script assets through runtime commands
- modify a script asset body through runtime commands
- attach a script asset to an object (script assets are not "attached" — they are referenced from behavior code via `@import`)

The user creates and edits script assets in the editor's **Assets → Scripts** panel.

## When To Use a Script Asset

Reach for a script asset when:
- two or more behaviors / lambdas need the same helper code (math, UI builders, formatters, AI utilities)
- a behavior body is over ~150 lines and a chunk of pure helpers can be lifted out
- a runtime helper (state machine factory, debug logger factory, scoring math) is reusable across genres
- a UIKit dual-mode helper or HUD builder is shared between several screens

Do **not** reach for a script asset when:
- the helper is only used by one behavior — keep it inline as a closure-scoped function in that behavior
- the value is per-scene tuning data — use `config.attributes` so it shows up in the editor panel
- you want to import a third-party library — script assets run inside the same compartment as behaviors, with the same endowment whitelist; they cannot reintroduce DOM globals or unsafe APIs

## `@import` Directive Rules

Place every `@import` at the very top of the behavior or lambda code block, one per line, before any other statements.

```js
@import "math-helpers" as math;
@import "hud-helpers" as hud;

let game;
this.init = function(_game) { game = _game; };
this.update = function(dt) {
  this.speed = math.clamp(this.speed + dt, 0, 10);
  hud.updateTimer(dt);
};
```

Grammar (engine-enforced):

```
^\s*@import\s+(['"])<specifier>\1\s+as\s+[A-Za-z_$][\w$]*\s*;?\s*$
```

- **Specifier** — the script asset's logical name (case-insensitive, kebab-case recommended) or its 24-hex asset ID. Logical names survive `dump scene` round-trips and stem export/import.
- **Alias** — any valid JS identifier. Aliases must be unique within a code block.
- **Placement** — directives are stripped before compilation, but blank lines are preserved so line numbers stay stable for stack traces.

Errors are surface-level and synchronous:

| Failure | Result |
|---|---|
| Duplicate alias in the same block | Parse error before script runs |
| Missing specifier (asset not in scene) | Behavior fails to start at runtime |
| Cycle (`A → B → A`) | `"Import cycle detected while loading <key>"` thrown at load |

## Module Authoring Rules

Script assets export **only top-level functions**. Anything else is module-private and frozen with `Object.freeze` before consumers see it.

```js
// math-helpers.js
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }   // exported
const lerp = (a, b, t) => a + (b - a) * t;                             // exported
var _internal = 0;                                                     // NOT exported
function _privateHelper() { /* ... */ }                                // exported (all top-level functions are)
```

Module scope rules:
- Imports run inside their own function scope. They do **not** share closures with the importing behavior.
- Imports cannot reach `this`, `this.erth`, `this.gameObject`, or any behavior instance. **Pass everything you need as function arguments.**
- Injected globals (`THREE`, `UIKit`, `console`, `document`, `window`, `performance`, `fetch`, etc.) are available, same as in behaviors.
- When `scene compartments on`, imports execute in the same compartment as the importer — same endowment whitelist applies.

```js
// damage-helpers.js — exports pure functions; the behavior passes context in
function applyDamage(erth, targetBehavior, amount) {
  return targetBehavior.requestAttributeChange(
    "health",
    targetBehavior.getAttribute("health") - amount,
    { sync: true },
  );
}
```

```js
// behavior consuming damage-helpers
@import "damage-helpers" as damage;

this.update = function(dt) {
  const enemy = this.erth.behaviors.find(this.gameObject.target, "enemy.stats");
  if (enemy) damage.applyDamage(this.erth, enemy, 5);
};
```

## File Format

A script asset body ships in one of two formats:

| Format | When to use | Notes |
|---|---|---|
| **YAML envelope** (`.yaml` / `.yml`) | Shared helpers, anything you want documented or versioned | Carries `config.name` + `config.description` alongside the `code:` block. Round-trips cleanly through `dump scene`. Recommended for anything reused across games. |
| **Raw `.js`** | Quick prototypes, single-game ad-hoc helpers | Filename (sans extension) becomes the logical id if `name=` is absent. No description field. |

YAML envelope:

```yaml
# imports/math-helpers.yaml
meta:
  tool: StemStudio
  type: import          # legacy spelling, still accepted
  exportVersion: 1
config:
  name: math-helpers
  description: Shared clamp / lerp / easing helpers used by movers and UI animators
code: |
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  const lerp = (a, b, t) => a + (b - a) * t;
```

## Recommended Workflow

1. **Identify duplication.** When two or more behaviors share helper code, propose extracting it into a script asset.
2. **Design the API.** Decide which functions to export. Keep them pure: every export takes its inputs as arguments. No `this`, no closed-over behavior state.
3. **Pick a name.** Kebab-case, scoped to one concern (`math-helpers`, `hud-timer`, `damage-falloff`). Avoid generic names like `utils`.
4. **Ask the user to create the asset** in the editor's **Assets → Scripts** panel (or accept the user's existing script asset). Use the YAML envelope for anything reusable, raw `.js` for one-off prototypes.
5. **Write the consuming behavior** with the `@import` directive at the top of the code block.
6. **Verify** by reading back the behavior with `get_behavior` and confirming `codeValidation` is clean.

## Design Rules

- **One concern per asset.** If a helper module grows past ~150 lines, it's probably two assets.
- **Pure functions only.** No mutation of behavior state from inside an export. Pass `erth` / `game` / specific behaviors as arguments when helpers need them.
- **Stable export shape.** Renaming an exported function is a breaking change for every consumer's `@import`. Prefer additive changes.
- **No heavy work at module top level.** Top-level code runs every time the module is loaded. Put initialization inside a function the consumer calls.
- **Keep designer-facing tuning out.** Per-scene tuning belongs in `config.attributes` on the consuming behavior, not in a script asset's exported constants.

## Common Mistakes

- writing `@import` directives below other statements (must be at the very top)
- assigning a helper to `this` instead of passing it as an argument
- creating a "utils" script asset that bundles unrelated helpers
- assuming the copilot can create script assets directly — it cannot; ask the user
- writing `import` (ES module) inside a behavior instead of `@import` at the top
- relying on `this.erth` or `this.gameObject` from inside a script asset (not available)
- letting the dependency graph cycle (`A → B → A`)

## When To Read More

- Need full directive grammar, transitive imports, or specifier remapping across scenes: `~/.claude/stemstudio-docs/script-imports.md`
- Need behavior lifecycle / `this.erth` API: `~/.claude/stemstudio-docs/behavior-system.md`
- Need exact engine/type contracts: `~/.claude/stemstudio-types/stem-types.d.ts`

## See Also

- `stemstudio-behaviors` — for authoring the consuming behavior
- `stemstudio-lambdas` — when the shared helper is consumed from lambda code
- `stemstudio-game-engine` — for runtime / `this.erth` API surface
- `stemstudio-uikit` — when the script asset is a UIKit dual-mode helper or HUD builder
