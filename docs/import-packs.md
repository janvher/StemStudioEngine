# Import Packs

An **import pack** is a curated, read-only JavaScript module that ships with
the editor and can be cloned into a project as a **Script asset** in one click.
Once added, behaviors and lambdas pull it in with an `@import` directive and
call its exported helpers — shared math, RNG, UI scaffolding, and the like.

Think of packs as the engine's standard library for game code: instead of
copy-pasting a simplex-noise implementation into five behaviors, you add the
`noise` pack once and `@import` it wherever you need it.

> Import packs contain **code only** — no behaviors, lambdas, prefabs, or
> assets. For attachable game logic see [`built-in-behaviors.md`](./built-in-behaviors.md)
> and [`lambdas.md`](./lambdas.md).

---

## What ships

Three packs are bundled today, under
`client/packages/editor-oss/src/editor/scripts/builtinPacks/`:

| Pack | What it gives you |
|---|---|
| `noise` | Seedable 2D/3D simplex noise. Deterministic — same seed, same field. Terrain heights, clouds, particle drift, organic motion. |
| `prng` | Seeded pseudo-random generator (alea). Deterministic across multiplayer clients and replays — same seed → same sequence everywhere. |
| `uikit-dual-mode` | UIKit lifecycle helper that renders the same `UIKit.Fullscreen` tree in both editor preview and play mode, replacing per-behavior inlined IIFEs. |

Each is a StemStudio export-envelope YAML file (`meta` / `config` / `code`) —
the same shape you get when you export a Script asset from the editor.

---

## Anatomy of a pack

The loader interface (`builtinPacks/index.ts`) is deliberately tiny:

```ts
export interface ImportPack {
    name: string;        // stable id — also becomes the Script asset name
    description: string; // shown in the picker
    code: string;        // JS source, cloned verbatim into the new Script asset
}
```

Packs are bundled into the client at **build time** via Vite's
`import.meta.glob("./*.yaml")` — there is no backend round-trip and no runtime
fetch. `getSystemImportPacks()` parses and caches them on first use.

The YAML envelope:

```yaml
meta:
  tool: StemStudio
  type: import        # "import" or "script" both accepted
  exportVersion: 1
config:
  name: noise
  description: |
    Seedable 2D and 3D simplex noise. Deterministic …
code: |
  // JavaScript source here — copied verbatim into the Script asset
```

---

## Adding a pack to your project (step by step)

1. Open the **Assets** sidebar (left panel) and find the **Scripts** row.
2. Click the **Add New** (upload) button on that row to open the import menu.
3. Choose **Browse packs**. The picker lists every bundled pack with its
   description. Packs already in the project are greyed out with a checkmark so
   you can't add a duplicate.
4. Click a pack — say `noise`. It is cloned into the scene as a Script asset
   named `noise` (its `code` copied verbatim).
5. The creation hook scans the new code for its own `@import` dependencies and
   seeds the dependency cache, so the asset is immediately resolvable.

That's it — the pack is now a normal Script asset in your project, editable
like any other (though you'll usually leave the curated source as-is).

The same **Add New → Browse packs** flow is available from the script **Code
Editor** modal in the right panel; both routes converge on the same picker and
the same `useCreateScript()` hook.

---

## Using a pack from a behavior or lambda

Once the Script asset exists, pull it in with an `@import "<name>" as <alias>;`
directive at the top of your behavior/lambda code. The alias becomes a normal
object whose methods are the pack's exports.

### `noise` — procedural fields

```js
@import "noise" as noise;

const n = noise.create("world-1");          // seed by string or number
const h = n.noise2D(x * 0.05, z * 0.05);    // -1..1  (e.g. terrain height)
const v = n.noise3D(x, y, z);               // -1..1  (e.g. 3D density)
```

### `prng` — deterministic randomness

```js
@import "prng" as prng;

const rng  = prng.create("level-42");        // seed by string or number
const x    = rng.next();                      // 0..1
const dice = rng.intRange(1, 7);              // [1,6] inclusive
const pick = rng.pick(["a", "b", "c"]);
const dup  = rng.clone();                     // independent copy at same state
rng.skip(1000);                               // advance N steps without consuming
```

Because the sequence is fully determined by the seed, every multiplayer client
that uses the same seed sees the same rolls — use `prng`, not `Math.random()`,
for anything that must agree across clients or replays.

### `uikit-dual-mode` — UI that works in editor and play

```js
@import "uikit-dual-mode" as uikit;

this.init = function (_game) {
    this._uikitCtx = uikit.createPlayContext(_game);
    this._uiRoot   = uikit.buildRoot(this._uikitCtx);
    this._buildUIKitContent();
    uikit.attach(this, this._uikitCtx);
};
this.update  = function (dt) { uikit.tick(this, dt); };
this.dispose = function ()   { uikit.teardown(this); };

this.onEditorAdded = async function (editor) {
    if (!this._uiRoot) {
        this._uikitCtx = await uikit.createEditorContext(editor);
        this._uiRoot   = uikit.buildRoot(this._uikitCtx);
        this._buildUIKitContent();
    }
};
```

(Requires `editor.ensureUICamera()` and `GameManager.initUIKit()` — present in
this build. See [`uikit-api.md`](./uikit-api.md).)

---

## How packs relate to the rest of the import system

The packs picker is one entry into the broader **script-tool import pipeline**
(`client/packages/editor-oss/src/agent/script-tool/`). The same pipeline also
handles:

- **Uploading a file** — `.js`/`.mjs`/`.cjs` (raw code; filename becomes the
  asset name) or a `.yaml` export envelope (parsed the same way packs are).
- **New empty import** — a blank Script asset you write from scratch.

All of these land as Script assets through `useCreateScript()`, which scans for
`@import` dependencies and seeds the dependency cache.

The dashboard's **Import stemscript folder** feature is a larger sibling: it
stages a whole exported folder via `sessionStorage`, navigates to a fresh
project, and runs the `exec` flow to materialize an entire saved project
(scenes, assets, scripts) at once. Import packs are the single-module version
of the same idea.

---

## Shipping a new pack

Because packs are loaded by a build-time glob, adding one is just dropping a
file in — no code changes:

1. In the editor, author the helper as a Script asset and **export** it (you
   get a `meta`/`config`/`code` YAML envelope).
2. Drop that `.yaml` into
   `client/packages/editor-oss/src/editor/scripts/builtinPacks/`.
3. Ensure `meta.type` is `import` or `script`, and `config.name` + `code` are
   present (the loader skips files that fail these checks and logs why).
4. Rebuild the client. `getSystemImportPacks()` picks it up automatically and
   it appears in the picker, sorted by name.

---

## Verification

The packs picker feeds the script-tool import pipeline, which the OSS smokes
cover:

```bash
bun run typecheck
bun run test          # Vitest — NOT `bun test`
node scripts/playwright/oss-import-3dchess.mjs   # needs `bun run dev` on :5173
```

Re-run the import/persistence smokes if you change the picker, the loader, or
`useCreateScript()`.
