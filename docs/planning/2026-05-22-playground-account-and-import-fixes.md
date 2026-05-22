# Playground: account surfaces, publish gating, import bugs

Goal: in playground/OSS mode, user-account surfaces must be meaningful (or
absent). Clicking "Account Settings" crashed the page. Plus follow-up
reports: publish UI shown in playground, model textures lost on reload,
duplicate behaviors in the right panel.

## Done

- [x] **Account Settings crash.** The editor `TopMenu` rendered the
      avatar/`UserMenu` ("Account Settings") + `CreditsBar` unconditionally.
      Clicking it does an in-app `navigate("/settings")` while the editor
      is mounted, which crashes the Chromium renderer (blank screen).
      OSS has no account system. Fix: gated avatar/`UserMenu` + `CreditsBar`
      behind `!IS_OSS` in `TopMenu.tsx`, matching `DashboardHeader`. BYOK
      keys stay reachable via the Copilot panel's "Keys" button.
      Verified with Playwright: no entry, no crash.
- [x] **Publish UI in playground.** `OverviewActionBar` (game-card "…" →
      `/game/:id`) showed Publish/Unpublish + Public/Private. OSS has no
      hosted gallery. Fix: gated both controls behind `!IS_OSS`.
- [x] **Repointed smokes.** `oss-smoke.mjs` and `oss-import-3dchess.mjs`
      navigated `/` expecting the editor's "start from scratch" hero, but
      the marketing site now owns `/`. Repointed both to `/create/project`
      (auto-creates a fresh project + mounts EngineRuntime).
- [x] **Behaviors fail to attach on import** (`Failed to create behavior
      data using "chess.chessGame" id - config not found` — the ⚠ icons).
      `buildBehaviorIdMap` in `useTerminal.ts` read the filepath→logical-id
      link from `manifest.behaviors[]`, but those entries carry no `file`
      field — the link lives in `manifest.files{}`. The map came out empty,
      so `behaviorIdOverride` was never passed and imported behaviors kept
      their YAML `config.id` instead of the `chess.*` id the stemscript's
      `behavior attach` references. Fixed to read `manifest.files`.
      Verified: chess smoke behavior errors 8 → 0, board now renders.

- [x] **Publishing controls shown in playground.** `OverviewActionBar`
      (game-card "…" → `/game/:id`) showed Publish/Unpublish + Public.
      OSS has no hosted gallery; gated both behind `!IS_OSS`.
- [x] **Model textures/meshes lost on save+reload.** Root cause was *not*
      GLB data — it was the scene loader discarding the asset resolution
      context. OSS persists `assetResolutionContext` inside the scene JSON
      (`scene.userData`), but `loadSceneFromProjectStore` (scene/v2.ts)
      handed the loader empty `dependencies: {}` / `logicalIdToAssetId: {}`
      metadata. `scene/util.ts loadScene` treats truthy `dependencies`
      metadata as authoritative and *discards* the scene's own context —
      so every reload wiped the real dependency map and model/behavior
      asset refs failed to resolve (`Failed to resolve asset ref` ×6).
      Fix: `loadSceneFromProjectStore` now extracts the persisted context
      from the scene JSON and surfaces it as metadata.
      Also: `resolveAssetAttributes` (BehaviorHandlers) now pins resolved
      model attributes as scene dependencies so behavior-only-referenced
      assets survive reload too.
      Verified: chess import → save → reload, asset-ref errors 6 → 0,
      board + pieces render after reload.

- [x] **AssetLoader skips OSS model assets on reload** (`[AssetLoader]
      Skipping asset … - no revisionId`). OSS `getSceneAssets` returned
      assets with `headRevisionId` / `revision.id` but no top-level
      `revisionId` / `dataUrl` — the `CachedAsset` fields `seedFromAssets`
      reads. The seeder skipped every model, forcing slow per-asset
      fallback loading. Fix: OSS `getSceneAssets` now also returns
      `revisionId`, `dataUrl`, `dataUrlExpiresAt`. Verified: warning 6 → 0.

## Open — needs follow-up

- [ ] **`Converter: components of ServerObject … is not serialized`**
      (×6, one per model, reload). Benign `console.warn` — model
      components have no serialized override parts (by design: "only the
      materials of server models are serialized"). Models render
      correctly; this is log noise. Silencing it touches shared
      serialization code (integrated path too) — leave unless it proves
      to mask a real defect.
- [ ] **`buildwithstem.com/create/project/<id>` → 404.** Deployment
      routing, not app logic: the marketing host serves the editor SPA
      only on specific paths and has no catch-all for `/create/project/*`.
      The playground iframe loads `/dashboard?mode=playground`; an
      in-iframe hard-navigation to `/create/project/<id>` hits the
      marketing host's 404. Needs a hosting SPA-fallback rule (or keep
      editor navigation within the routes the host serves).
- [ ] **Duplicate behaviors in the right panel** (behaviors listed ~3×).
      The id-override fix above makes the imported behavior register under
      a stable `chess.*` id, which should let `importHandler`'s id-based
      dedup work across re-imports. Re-verify with a reload repro; if
      duplicates persist, the `behaviorConfigRegistry` is likely not
      hydrated when the import re-runs.

## Validation

- [x] `bun run typecheck` — clean
- [x] `bun run lint` — 0 errors (pre-existing warnings only)
- [x] Playwright: editor in playground mode, no Account Settings, no crash
- [ ] Manual code review
- [ ] Re-run `oss-smoke.mjs` end-to-end (currently flaky on the
      save-button testid + bootstrap modal reappearing on reload)
