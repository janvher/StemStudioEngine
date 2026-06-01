# Import asset dedup + localStorage hygiene

## Goal
Fix the upstream root cause behind today's pirate-ship cluster (can't move,
physics wrongly enabled, missing skybox, `QuotaExceededError`): the project is
bloated and scene-scoped state is being dumped into localStorage. Two changes:

1. **Import asset dedup** — identical source `.glb` files import **once** as a
   shared asset; scene objects reference it. (Pirate-ship has 77 `import model`
   lines pointing at 3 rock files → 77 inline assets today.)
2. **localStorage hygiene (architectural rule)** — localStorage holds **only
   global user/device preferences** (FTUE, theme, language, quality, persistence
   mode). All **scene-scoped** data moves to `scene.userData` (persisted to the
   File System via `ProjectStore`) or is dropped if redundant.

## Why this is the root cause
- `importHandler.ts` model path (≈614-632) creates a new asset **per import**
  with no dedup (the media path at ≈662-670 *does* dedup by name). 77 rocks → 77
  multi-KB inline GLB assets.
- Scene-scoped data is serialized into localStorage (5 MB cap) regardless of
  persistence mode: `autoSaveData` (full scene, every 10 s), copilot preview
  drafts (`previewSceneJson`, per `sceneId`, never pruned), chat snapshots.
- A bloated scene × accumulating per-scene blobs → quota exhausted → even a tiny
  write (`expandedPanels`) throws. Oversized saves are also the likely reason
  `physics:false` / skybox / behavior edits don't persist.

## Open questions (need confirmation)
- **Autosave recovery cache** (`autoSaveData…`): drop entirely (FS folder is
  authoritative), or migrate "recover unsaved work" into `scene.userData`?
- **Instanced rendering** for the 77 identical rocks: do now, or follow-up?
  (Storage dedup is independent of and higher-priority than instanced rendering.)

## localStorage key classification
**Keep (global user/device prefs):** FTUE flags, `codeEditorTheme/FontSize/
FontFamily`, language, quality settings, persistence-mode key, bootstrap flag,
dashboard FTUE, AssetsList filters, code-editor open/pinned/width, playmode-
inspector position, `expandedPanels`, signed-url cache, guest id.

**Move to `scene.userData` (FS) or drop (scene-scoped):**
- `autoSaveData` + `autoSaveTime/SceneID/SceneName/SceneLockedItems`
  (`event/AutoSaveEvent.js`) — drop or migrate.
- copilot preview drafts (`copilotPreviewDraftStorage.ts` localStorage fallback,
  `previewSceneJson`) — keep IndexedDB, remove the full-scene localStorage write.
- chat snapshots (`workspaceChatSnapshot.ts`).
- `savedCameras` (`controls/ControlsManager.js`).
- runtime rig overrides (`assets/js/animations/runtimeRig.ts`).
- `lastPlayState` (`behaviors/packs/character/CharacterBehavior.ts`).

## Affected files
- `agent/script-tool/importHandler.ts` (model dedup)
- `agent/script-tool/useTerminal.ts` / `processResolvedImports` (thread a
  run-scoped content-hash→assetId cache)
- `event/AutoSaveEvent.js`
- `editor/assets/v2/CopilotWorkspace/copilotPreviewDraftStorage.ts`
- `editor/assets/v2/AiCopilot/workspaceChatSnapshot.ts`
- `controls/ControlsManager.js`, `assets/js/animations/runtimeRig.ts`,
  `behaviors/packs/character/CharacterBehavior.ts`
- one-time cleanup that purges stale scene-scoped localStorage keys

## Implementation steps
- [ ] **Import dedup**: hash `sourceGlbBuffer`; run-scoped `Map<hash, assetId>`
      passed through `processImportedFile`. On hit, skip `createModelWithData`,
      reuse `assetId`, still `loadModel(assetId)` + place the new object.
- [ ] Verify multiple scene objects sharing one `asset.id` save/load correctly.
- [ ] **autoSave**: drop (or migrate) the localStorage scene cache per decision.
- [ ] **copilot draft**: remove `writeLocalDraft` full-scene write; IndexedDB only.
- [ ] **chat snapshot / cameras / rig / play-state**: move to `scene.userData`.
- [ ] One-time cleanup of stale scene-scoped localStorage keys on boot.
- [ ] (Optional) instanced rendering for identical shared-asset placements.

## Validation
- [ ] Re-import pirate ship → **3** rock assets, not 77; scene size drops sharply.
- [ ] `localStorage` stays small (run the size-dump one-liner).
- [ ] After reload: `physics:false`, skybox present, behavior edits persist;
      `_matchStarted` flips true and **W moves the ship**.
- [ ] `bun run typecheck`, `bun run lint`, `bun run test`.
- [ ] Re-run OSS smokes touching persistence/import.
- [ ] Manual code review.
