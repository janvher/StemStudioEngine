# No error-masking fallbacks in playground-critical paths

## Goal

No fallback in the playground-critical paths (import → persistence/save-load →
play) may silently hide a failure. Every fallback must either:

- surface the failure loudly (error log + user-visible signal), or
- fail hard when the fallback is covering a **bug in our own implementation**.

Only a *genuine, expected absence* (file not created yet, no asset subdir,
`crypto` unavailable in an insecure context) may degrade quietly — and even
then it must be the *narrow* expected error, not a blanket `catch {}`.

Playwright tests must exercise these paths so a regression surfaces.

## Scope (decided with user)

Playground-critical paths only: `agent/script-tool/`, `persistence/`, the OSS
save path (`ossSceneSave.ts`), and the stemscript import driver
(`useTerminal.ts`). Render/picking/websocket degradation is explicitly out of
scope (legitimate, non-data-path).

## Guiding rule

`catch { return [] }` / `catch { /* skip */ }` is only acceptable when the
caught error is the **specific** expected one (e.g. `NotFoundError`). A blanket
catch that also swallows parse errors, permission errors, or our own bugs is a
masking fallback and must be split: expected-absence → degrade; anything else →
surface / rethrow.

## Findings & fixes

- [ ] `persistence/FileSystemProjectStore.ts:327` — per-asset read failure on
      **load** silently dropped → scene reloads with missing models, no trace.
      Fix: the manifest lists the asset, so a read failure is real → **throw**.
- [ ] `FileSystemProjectStore.ts:305/315` — `loadAssets` conflates "no asset
      subdir / no manifest" (legit empty → `[]`) with read/parse failure.
      Fix: only `NotFoundError` → `[]`; parse error / other → **throw**.
- [ ] `FileSystemProjectStore.ts:149` — `list()` swallows unreadable/malformed
      project files with no log. Fix: **`console.error` with the filename**
      (keep listing the rest; one bad file must not hide the others, but it
      must be visible).
- [ ] `persistence/ossSceneSave.ts:63` — `persistProjectAssets` failure
      swallowed; save still reports "Saved" while binary assets were lost.
      Fix: **propagate**; surface as a save failure (error toast +
      `sceneSaveFailed`), do not report success.
- [ ] `agent/script-tool/importHandler.ts:360` — `getAsset` failure for an
      asset we just matched in-scene → silently uses a **stale** scene-pinned
      revision (stale-parent merge can drop edits). Fix: log loudly; only fall
      back on genuine not-found, rethrow otherwise.
- [ ] `editor/.../useTerminal.ts` — unresolved import file (e.g. skybox) now
      logs an error entry but the run still reports overall success. Fix: an
      unresolved import **fails the run** (surfaced result), so an incomplete
      import can never masquerade as a clean one.

## Validation

- [x] `bun run typecheck` — clean.
- [x] `bun run lint` — 0 errors (pre-existing `any` warnings only).
- [x] `bun run test` (Vitest) — 2488 passed (+5 new): `FileSystemProjectStore.loadAssets`
      throws on corrupt manifest / missing asset (3 tests) and returns the
      recorded assets on a valid manifest; `ossSaveScene` reports a save FAILURE
      (not success) when asset persistence throws.
- [x] Playwright: **`oss-import-fallback-verify.mjs` — PASSES 12/12** end-to-end
      on a light real game (small-world) in ~2 min. Asserts the hardened paths
      behave honestly: `no-batch-import-dialog`, `import-no-failed-commands`
      (`failCount===0`), `models-present`, and the crux **`assets-survive-reload`**
      (mesh count preserved across save→reload — a live check that
      `loadAssets`/`ossSaveScene` don't silently drop/swallow). Also strengthened
      `oss-pirate-ship-playground.mjs` (same assertions + dialog guard); it
      confirms `no-batch-import-dialog` but the heaviest game's full import
      exceeds the timeout due to import perf (task #10), so the *fast* verify
      smoke is the authoritative end-to-end Playwright check.
- [ ] Manual code review.

## Per-import timeout (added)

A single `processImportedFile` could previously hang the whole run with no
surfaced error — the ultimate "failure that never surfaces". Each import is now
raced against a 90s ceiling (`withImportTimeout` in `useTerminal.ts`); on
timeout it is reported as a failed result (named culprit logged via
`[import-timeout]`) and the loop continues. Directive-aligned: a hang now
surfaces loudly instead of spinning forever.

## RESOLVED: pirate-ship import hang — root cause found + fixed

- **Root cause:** `showBatchImportDialog` (`ImportBatchDialog.ts`) is a bare
  `new Promise` that only resolves on a user button click — no timeout, no
  headless escape. It opened because 4 of the 5 `PIR_Water.png` texture imports
  did not auto-resolve: the generator emitted duplicate textures as
  `PIR_Water.png-2 … -5` (extension `.png-2`), and `autoResolveImports` filtered
  candidate files by extension **before** matching the explicit `filepath`,
  dropping those odd-extension files. Unresolved → blocking modal → headless
  `__stemRunScript` hung forever (the 20-min "timeout" was that hang).
- **Fix 1 (`ImportBatchDialog.ts`):** an explicit `filepath` now matches against
  the FULL file list, not the extension-filtered subset. The filepath is already
  precise, so the ext guard only ever caused false misses. Regression test:
  `ImportBatchDialog.test.ts` (odd-extension filepath resolves; one file backs
  several imports).
- **Fix 2 (`oss-pirate-ship-playground.mjs`):** the smoke now polls instead of
  blocking inside `evaluate`, asserts `no-batch-import-dialog`, and dismisses the
  dialog if it ever appears — so a future auto-resolution failure fails the test
  loudly in seconds instead of hanging it for 20 minutes.
- **Also found:** the running dev server had been serving a STALE bundle all
  session (none of the edited code executed in the page) until `bun run dev` was
  restarted — that is why browser verification looked broken earlier. Unit tests
  (no browser) were always authoritative.

## Project-data fix (PIR_Water textures)

The 5 `PIR_Water` imports referenced `PIR_Water.png`, `…png-2 … png-5`. The
`-N` files are **5 distinct, valid PNGs** (different md5/size — water frames),
just saddled with a malformed extension suffix. Renamed on disk to
`PIR_Water_2.png … _5.png` and updated the stemscript `filepath=` lines. So the
data is clean AND the resolver is robust (two independent layers).

## Residual: import is slow (NOT hung, NOT in scope of the fallback work)

After the dialog fix the import progresses steadily — object count climbs
90→189 over ~4 min (~2.4s/object) and keeps going; it does not freeze. The
heaviest games (113 imports + hundreds of placement commands, each firing
`objectChanged`/scene reprocessing) take 10–15+ min. This is a performance
matter, separate from "masking fallbacks". Options if pursued: batch/defer
`objectChanged` during bulk script import; the smoke would then complete and its
`failCount===0` / `skybox-object-present` / play assertions can be verified.

## Notes

- The strengthened smoke surfaced that the pirate-ship import **hangs** (object
  count freezes at ~90 of ~101, then the 20-min outer timeout). Confirmed a hang
  (not slowness) — `objCount` frozen, observed repeatedly.
- Pinpointing the exact stall is **blocked by the dev environment**: Vite serves
  the freshly-edited module (verified via curl: `withImportTimeout` present), but
  the running page never executes the edited `runScript` (no injected
  `[phase]`/`[import-diag]`/`[exec-progress]` log ever fires across 6+
  instrumented runs, even with `serviceWorkers: "block"`). Strong indication the
  dev server (or its service worker, registered in `AppUpdateManager.tsx`) is
  serving a **stale bundle**. **Action:** restart `bun run dev` to clear it, then
  re-run the diagnostic (`scripts/playwright/diag-pirate-import-progress.mjs`),
  which will name the hanging import via the per-import timeout.
- NOTE: this also means earlier browser-based smoke results this session may have
  run against stale code. Unit tests (Vitest, no browser/SW) remain authoritative
  and are green.
