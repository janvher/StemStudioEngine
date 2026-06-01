# OSS behavior de-duplication + edit persistence

Goal: in OSS / playground mode, load and use exactly **one (latest) revision per
logical behavior**, and make a behavior edit actually update the behavior +
scene **and persist to the filesystem store** (so the "Saved" toast is truthful).

## Symptoms (reported)

- Importing the Pirate Ship game shows **3 copies** of every behavior in the
  Behaviors asset panel (AIShipController ×3, ShipController ×3, … 21 total).
- Editing a behavior shows "Behavior saved successfully" but the change is **not
  written to the file system** — gone after reload.

## Root cause (verified)

1. **List = registry, keyed by id.**
   `BehaviorConfigRegistry` is `Map<string, BehaviorConfig>` keyed by `id`
   (`editor/behaviors/BehaviorConfigRegistry.ts:4,8`). The panel renders
   `getAllConfigs()`. Three visible copies ⇒ **three distinct asset ids** all
   with the same `name` — the Map cannot collapse them.

2. **Import creates new assets for the same logical behavior.**
   `agent/script-tool/importHandler.ts:300-370` is idempotent only if it finds
   the existing behavior by YAML `config.id` or by a **unique** name match. Once
   two same-named assets exist, the name fallback bails (lines 325-332) and a
   **new** asset is created — a snowball that produces 3, 4, … copies across
   re-imports / round-trips.

3. **Edit creates a revision but never persists the project.**
   `useBehaviorSave.ts:278-283` calls `createBehaviorRevision({assetId,
   parentRevisionId, config, code})` **without `assetSource`**, so
   `createBehaviorRevision` skips `updateSceneBehaviorRevision`
   (`editor/behaviors/util.ts:389-391`). The new revision is only **seeded into
   the in-memory query cache / OSS session registry** (`seedAssetRevisionData`).
   Nothing writes the project to the `ProjectStore`, so a filesystem reload
   loses the edit. The toast fires regardless (`useBehaviorSave.ts:318`).

## Assumptions / open questions

- OSS keeps one asset id per logical behavior across edits (edits = new
  revisions of the same id). Duplicates therefore have **different** ids and the
  same `name`, so collapsing by `name` → latest is safe for imported games.
- Confirm whether a single import truly produces 3, or whether re-runs/round
  trips accumulate them. The fix is robust either way (collapse + idempotent
  register), but reproduction will validate.

## Affected files

- `editor/behaviors/BehaviorConfigRegistry.ts` — register/dedup semantics.
- `behaviors/BehaviorLoadingService.ts` — load/merge of backend + scene configs.
- `agent/script-tool/importHandler.ts` — behavior import idempotency.
- `editor/assets/v2/AssetsLibrary/BehaviorCreator/hooks/useBehaviorSave.ts` —
  edit save path (pass `assetSource`; persist project in OSS).
- `editor/assets/v2/AssetsLibrary/CodeEditor/CodeEditorShell.tsx` — onSaveComplete.
- Possibly a small persistence hook to save the project after an OSS edit.

## Decisions (confirmed with user, 2026-05-30)

1. **Saved toast must mean persisted to the filesystem store.**
2. **De-duplicate on import**, not on every scene load.
3. **OSS / playground has NO revision management — only the latest version.**

## Plan (confirmed approach)

### Change 1 — OSS: no revision churn, latest-only  (network adapter)
`packages/network/src/adapters/remote-go/asset/index.ts` — `createAssetRevision`
OSS branch currently mints a fresh `oss-rev-${Date.now()}-…` id on every save, so
each edit creates a parallel revision id. Make it **reuse the asset's stable head
revision id** `oss-rev-${assetId}` (the same id `createAsset` assigns) and
**overwrite the registry record in place**. Result: exactly one revision per
asset, the scene's pinned `assetId→revisionId` never drifts, and "latest wins"
is literal. IS_OSS-gated; integrated path untouched.
- [x] Stable head-revision id reuse in `createAssetRevision` OSS branch.

### Change 2 — OSS: dedup behaviors on import  (importHandler)
`packages/editor-oss/src/agent/script-tool/importHandler.ts` (case "behavior").
In OSS, an imported behavior should **replace** any existing same-named
behaviors so the panel converges to one per behavior:
- [x] Capture the just-imported behavior as the survivor (update-in-place when it
      already exists, else create).
- [x] After import, in OSS, collapse every other same-named `AssetType.Behavior`
      record: new `unregisterOssAsset()` drops the orphan record + both registry
      keys; `unregisterConfig` / `unregisterScript` clear the registries. Scene
      objects attach by the logical/alias id (→ survivor), so no re-pointing is
      needed. Re-import heals existing 3× duplicates → 1×.

### Change 3 — OSS: behavior edit persists to filesystem  (CodeEditorShell)
`packages/editor-oss/src/editor/assets/v2/AssetsLibrary/CodeEditor/CodeEditorShell.tsx`
`handleSaveComplete` already runs `updateSceneBehaviorRevision`. In OSS, follow it
with `saveScene(false, false)` (→ `ossSaveScene` → `ProjectStore.save` +
`persistProjectAssets`) so the edited behavior + scene body reach the filesystem
before the success state. Mirrors the existing `useImportBehaviors` pattern
(`services.ts:122`).
- [x] Persist via `saveScene(false,false)` after an OSS behavior save
      (`CodeEditorShell.handleSaveComplete` / `handleSaveAllComplete`, OSS-gated).

## Follow-up fixes (2026-05-30, from user testing)

### Change 4 — first behavior save not persisting  (network adapter)
`createAssetRevision` (OSS) re-registered the record **without `projectId`**, so
after an edit the behavior fell out of `getOssAssetsForProject(projectId)` and
`persistProjectAssets` skipped it — the first save silently dropped the change.
Now the overwrite carries `projectId` (and `thumbnailDataUrl`) across, falling
back to the current `editor.sceneID` so a behavior created before the project's
first save still gets tagged on its next revision.
- [x] Preserve `projectId` / `thumbnailDataUrl` on the in-place revision rewrite.

### Change 5 — spinner toast during stemscript import
`showToast.tsx` gains `showLoadingToast(title, body) → id` (persistent
`type: "loading"` spinner, `duration: Infinity`) and `dismissToast(id)`.
`useTerminal.runScript` shows it before executing the script and dismisses it in
the `finally` (after the auto-save), so the user sees a spinner while the
stemscript runs.
- [x] `showLoadingToast` / `dismissToast` helpers + `runScript` wiring.

## Follow-up fixes (2026-05-30, round 2 — from console evidence)

### Change 6 — first behavior edit reverts on reload  (the actual root cause)
Console showed `[Editor] Saved scene behavior configs` listing **every** imported
behavior **twice** with the same `config.id`. Cause: a behavior is registered
under two registry keys (its asset id AND its import alias), so
`getAllConfigs()` returns it twice. A behavior edit re-registers only the
asset-id key (moving it to the end of the Map), leaving the alias-keyed copy
**stale**. The scene saved both fresh+stale; on reload the stale duplicate could
hydrate last and win → the first edit "reverted" (the second worked because the
fresh entry had moved to the Map's end). NOTE: Change 4's `projectId` reasoning
was wrong-model — OSS behaviors are inlined in the scene JSON
(`isLegacyBehaviorId` is true for `oss-asset-*`), not stored as asset files.
- [x] `Editor.saveLegacySceneBehaviorConfigs` de-duplicates configs by
      `config.id`, keeping the last (newest) registration. Halves the saved
      behaviorConfigs and makes the first edit persist.

### Change 7 — suggest widget pops on space (first line)
`scriptCompletions.ts` returned the full globals+lifecycle list as an
unconditional "General" fallthrough, so after typing a space (cursor not on a
word) Monaco kept the suggest widget open showing everything. Now returns no
general suggestions when `word.word` is empty.
- [x] Guard the general fallthrough on a non-empty current word.

## Validation

- [x] `bun run typecheck` (0 errors).
- [x] `bun run lint` on changed files (0 errors; only pre-existing `any` warnings).
- [x] Targeted Vitest: import / behaviorRevision / BehaviorLoadingService /
      script-tool / network adapter — 127+ pass.
- [ ] Re-import Pirate Ship in OSS filesystem playground → exactly 7 behaviors
      listed; repeated re-import stays at 7. (Blocked locally: the Pirate Ship
      import exceeds the Playwright harness's 20-min budget — verify manually or
      with a lighter game.)
- [ ] Edit a behavior → reload from filesystem store → edit is present. (Manual.)
- [ ] `node scripts/playwright/oss-smoke.mjs` and the FS roundtrip smoke.
- [ ] Manual code review.
