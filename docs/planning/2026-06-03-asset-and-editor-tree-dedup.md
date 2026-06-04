# Asset & editor-tree de-duplication

Date: 2026-06-03

## Goal

Remove duplicate image assets and the duplicate editor source tree that this
repo inherited from the integrated+OSS monorepo export. Reclaim disk, and —
more importantly — collapse the two parallel `editor/` trees so a fix can't
silently land in only one of them.

## Findings (analysis)

- **655 image files, 84 MB.** ~36 MB (43%) is exact-duplicate content (263
  byte-identical groups at different paths).
- **Root cause:** `packages/shared/src/editor` is a stale fork of
  `packages/editor-oss/src/editor`.
  - `shared/src/editor` is a strict subset (0 unique files) of the editor-oss
    tree, missing 54 files (all `*.test.ts` + extras).
  - **857 of 1,159** shared files have *diverged in content* from their
    editor-oss twin — same path, two different versions.
  - Live reachability trace from the real entry (`packages/marketing/src/index.ts`):
    **editor-oss/src/editor = 1,007 files reachable** (the live tree);
    **shared/src/editor = only 14 files reachable** (a "bridgehead").
  - Alias map: `@web-shared/*` → `packages/shared/src/*`;
    `@stem/editor-oss/*` → `packages/editor-oss/src/*`. Live `shared/src` files
    import `@stem/editor-oss` 1,614×, but import shared's own editor subtree 3×.
- **Split-brain in `AppRouter.tsx`** (lives in `shared/src`, uses relative
  `./editor/...` imports → resolves into the stale shared tree):
  - The **CreateDashboard** route renders `shared/src/editor`'s copy.
  - The **StemEditor** route renders editor-oss's copy (via
    `shared/src/v2/pages/StemEditor` → `@stem/editor-oss/*`).
- **Texture triplication:** `assets/textures/` existed 3× — repo-root
  `client/assets/` (canonical, served at `/assets/` because vite `root: "client"`),
  plus `packages/editor-oss/assets/` and `packages/shared/assets/` copies.

## The 14 live "bridgehead" files in shared/src/editor

These are the only `shared/src/editor` files the live app reaches; the #3
refactor must repoint AppRouter's CreateDashboard import so these resolve to
editor-oss instead, after which the whole shared/src/editor tree is orphaned.

- `Editor.ts`
- `asset-management/AssetSource.ts`
- `asset-management/hooks/assets.ts`
- `asset-management/hooks/publish.ts`
- `assets/v2/CreateDashboard/CreateDashboard.tsx`
- `assets/v2/CreateDashboard/GameOverview/placeholderThumbnails.ts`
- `assets/v2/OSSBootstrapModal/OSSBootstrapModal.tsx`
- `assets/v2/SceneRevisionsModalRenderer/SceneRevisionsModalRenderer.tsx`
- `assets/v2/common/BasicCombobox/BasicCombobox.tsx`
- `assets/v2/materials/materialUtils.ts`
- `assets/v2/types/file.ts`
- `behaviors/BehaviorConfigRegistry.ts`
- `behaviors/LegacyBehaviorMigration.ts`
- `stem-editor/saveStemEditor.ts`

## Assumptions / open questions

- The CreateDashboard + 13 transitive files in `shared/src/editor` have *diverged*
  from their editor-oss twins. Before repointing, diff each pair to confirm the
  editor-oss version is the intended one (it carries the tests and is the live
  StemEditor tree, so it should be — but verify, don't assume).
- Need to confirm no runtime/static-host config serves `/packages/.../assets/`
  URLs (none found in source; build `copy.js` only copies `client/assets`).

## Affected files / areas

- `packages/shared/src/AppRouter.tsx` (repoint CreateDashboard lazy import)
- `packages/shared/src/{PublicAppContainer,AppContainer,PublicAppContainerLite}.tsx`
  (the other edges that reach into `shared/src/editor`)
- `packages/shared/src/editor/**` (delete once orphaned)
- `packages/editor-oss/assets/textures/`, `packages/shared/assets/textures/` (DONE)
- ~63 unreferenced images (17 MB) flagged by basename heuristic

## Implementation steps

### Step 1 — Texture triplication (DONE 2026-06-03)
- [x] Verify `editor-oss/assets/textures` is byte-identical to canonical
      `client/assets/textures`, and `shared/assets/textures` = same 14 + 3
      unreferenced lensflare files
- [x] Verify 0 source references to `packages/*/assets/textures`
- [x] `git rm -r packages/editor-oss/assets/textures packages/shared/assets/textures`
      (31 files, ~12.9 MB)

### Step 2 — Unreferenced images (DONE 2026-06-03, 20 files / ~3.1 MB)
A naive basename scan flagged 130 images; **91 were false positives**. The
detector traps (record these — they recur):
- **`%20` URL-encoding** in markdown image links (`images/basic%20primitives.PNG`)
  — blog/docs screenshots are referenced this way; nearly all are USED.
- **Static imports with spaces** (`import x from ".../Custom Text.svg"`).
- **Dynamic variants** (`heart-red.svg`, `magic-ai-dark.svg`) — verify there is
  no `heart-${state}.svg` template AND no used sibling before deleting.
- **Runtime/lib-loaded textures** in the served `client/assets/textures/` dir.
- [x] Re-scan with `%20`-aware + stem-aware + fixed-string (handles spaces) match
- [x] Confirm no dynamic/templated path, no scene/stemscript fixture, no vendored
      JS lib reaches each candidate (VolumetricFire/ShaderParticleEngine code is
      absent — only their orphaned texture dirs remained)
- [x] `git rm` 20 confirmed-dead: 11 legacy engine textures
      (terrain/VolumetricFire/SPE/particles/patterns), 5 editor-oss UI assets,
      4 shared-tree dupes
- Residual caveat: `client/assets/textures/` is statically served, so a user's
  *locally-saved* project (outside the repo) could reference a deleted texture.
  All deletions are git-tracked → reversible.
- NOT touched: `scripts/playwright/*-output/*.png` (~1.9 MB) — gitignored,
  untracked, regenerable test artifacts; not project assets.

### Step 3 — REVISED after investigation (DONE 2026-06-03, 272 files / 17.9 MB)

The earlier "857 diverged files" reading was wrong. Investigation showed:
- **All 857 `shared/src/editor/*.{ts,tsx}` are 1-line re-export shims**
  (`export * from "@stem/editor-oss/..."`) — a `@web-shared/editor` facade
  barrel, NOT a duplicate implementation. Zero non-shim files. So there is
  **no duplicate code** and **no routing refactor needed**.
- **All 272 images under `shared/src/editor/assets` are orphaned** (17.9 MB):
  the shims redirect to editor-oss, whose components import editor-oss's image
  copies, so the shared image copies are in no module graph. `shared/src/editor`
  is not a served static dir (only `client/assets` + `client/public` are), so
  an import is the only reachability path — and there are zero importers.

- [x] Confirm shim ratio (857/857) and image orphan-hood (272/272, 0 importers
      across the whole repo via alias or relative path)
- [x] `git rm` all 272 orphaned image assets under `shared/src/editor`
- [x] Leave the 857 shims intact (~40 KB; 14 are the live `@web-shared/editor`
      facade used by `AppRouter`/`AppContainer` — removing them would need a
      routing repoint for no meaningful disk gain)

### Step 4 — Eliminate the shim layer (DONE 2026-06-03, 883 files)

Done after all — turned out low-risk and aligned with the codebase's own
`oss-boundary` lint rule ("editor-oss should route to itself via
`@stem/editor-oss/*` — not through the `@web-shared` shim", per the 2026-05-16
self-reference cleanup).

- The 857 `shared/src/editor/*.{ts,tsx}` shims had only **17 consumers** total
  (14 `.ts/.tsx` + 3 `.js` — the latter missed by a `.ts/.tsx`-only grep, caught
  on a broader sweep). The big dynamic-import list was editor-oss importing its
  OWN `./editor/` tree relatively — not shims.
- [x] Repoint all 17 imports (`@web-shared/editor/*`, `src/editor/*`, relative
      `./editor/*`) → `@stem/editor-oss/editor/*` across 9 files in
      `network/`, `editor-oss/`, and the `shared/` app shells
- [x] Verify zero remaining references into the shim tree (all code exts)
- [x] `git rm -r packages/shared/src/editor` (883 files: 857 shims + 26 orphan
      css/glb/yaml/README + stray `.memsearch` artifacts)
- [x] `bun run typecheck` clean; OSS `vite build` green (5329 modules, 24.6s)

Note: `shared/src` still contains other shim subtrees (e.g.
`shared/src/behaviors/.../editor/`, `shared/src/assets/js/*`) that form the
wider `@web-shared` facade and ARE still consumed — those are out of scope and
left intact.

## Validation

- [ ] `bun run typecheck`
- [ ] `bun run lint`
- [ ] `bun run test` (Vitest)
- [ ] `bun run vite-build`
- [ ] E2E smokes (CreateDashboard + persistence are directly touched by Step 3):
      `node scripts/playwright/oss-smoke.mjs`,
      `oss-filesystem-roundtrip.mjs`, `oss-open-folder-banner.mjs`,
      `oss-import-3dchess.mjs`
- [ ] Manual code review
