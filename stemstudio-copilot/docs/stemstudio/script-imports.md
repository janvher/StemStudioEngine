# Script Imports

Behaviors and lambdas in StemStudio can share code through **script assets** — first-class assets whose body is a JavaScript module, referenced from behavior/lambda code via `@import` directives.

> Engine asset type is `script` (formerly `import`). Both spellings parse on read; new docs use `script`.

## Directive Syntax

```js
@import "asset-or-logical-id" as alias;
```

Rules enforced by `parseScriptImports`:

- Directives live at the **top of the code block**, one per line.
- Grammar: `^\s*@import\s+(['"])<specifier>\1\s+as\s+[A-Za-z_$][\w$]*\s*;?\s*$`
- Specifier is either a 24-hex asset id or a logical name (case-insensitive, normalized to lowercase).
- Alias is a valid JS identifier, unique per code block.
- Invalid directives raise parse errors before the script runs.

```js
@import "math-helpers" as math;
@import "hud-helpers" as hud;

this.update = function(dt) {
  this.speed = math.clamp(this.speed + dt, 0, 10);
  hud.updateTimer(dt);
};
```

## What Gets Exported

Top-level **function declarations** and top-level **`const`/`let`/`var` bound to function expressions or arrow functions** become exports. Everything else stays module-private.

```js
// math-helpers
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }   // exported
const lerp = (a, b, t) => a + (b - a) * t;                             // exported
var _internal = 0;                                                     // NOT exported (not a function)
function _privateHelper() { /* ... */ }                                // exported
```

The resulting module object is `Object.freeze`d before consumers see it.

## Module Scope

- Each import runs inside its own function scope. It does **not** share closures with the importing behavior.
- Injected globals (`THREE`, `UIKit`, `console`, `document`, `window`, `performance`, `fetch`, etc.) are available — same compartment rules as behavior code.
- Imports cannot reach `this`, `this.erth`, `this.gameObject`, or any behavior instance. Pass what you need as function arguments.
- When compartments are on, imports run inside the same compartment as the importer; the endowment whitelist still applies.

## Transitive Imports

Imports may `@import` other imports. The engine resolves the full dependency graph and caches each module by `(assetId, revisionId)`.

- **Cycles are forbidden.** `A → B → A` throws `"Import cycle detected while loading <key>"` synchronously during load.
- Each `(assetId, revisionId)` pair is evaluated **once per scene** and reused across importers.

## File Formats

A script asset body ships as either:

- **YAML envelope** (`.yaml` / `.yml`) — recommended for reusable helpers; carries `config.name` + `config.description` alongside `code:`.
- **Raw `.js`** — quick prototypes; filename becomes the logical id if `name=` is absent.

```yaml
# imports/math-helpers.yaml
meta:
  tool: StemStudio
  type: import          # legacy spelling, still accepted
  exportVersion: 1
config:
  name: math-helpers
  description: Shared clamp / lerp / easing helpers
code: |
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  const lerp = (a, b, t) => a + (b - a) * t;
```

## Specifier Remapping Across Scenes

When a stem or scene bundle is exported and re-imported elsewhere, the engine remaps 24-hex asset IDs via `remapScriptImportSpecifiers`. Logical names pass through unchanged. If an imported game fails because an `@import` cannot resolve, check that:

- the script asset exists in the destination scene, and
- the specifier in the behavior matches the new logical name or remapped ID.

## Copilot Constraints

The copilot has no runtime commands to create, list, or modify script assets. Use the `stemstudio-scripts` skill for design guidance and ask the user to create the asset in the editor's **Assets → Scripts** panel.

## See Also

- Skill: `stemstudio-scripts`
- Behavior authoring: `behavior-system.md`
