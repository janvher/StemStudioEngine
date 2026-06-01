# OSS model import: stop assuming every model file is a ZIP

## Goal
Fix the regression where many game models silently fail to import (100-cars,
3d-chess) while others import fine (pirate-ship), and behaviors import in all
cases.

## Root cause (verified by repro)
`processImportedFile` (script-tool import path) calls
`loadModelFromFile(file, abortSignal, companionFiles, "application/zip")` —
hardcoding the source container as a ZIP archive (comment: `//all models are
ZIP archives`). `loadModelFromFile` then runs `expandZip` (JSZip) on it.

- Pirate-ship `.glb` files are *actually* ZIP archives (`PK\x03\x04`) bundling
  model + textures → `expandZip` works → models load.
- 100-cars `.glb` (`glTF…`) and 3d-chess `.gltf` (`{`) are raw model files →
  `expandZip` throws `Can't find end of central directory : is this a zip
  file?` → `processImportedFile` returns `{success:false}` per model.

The per-model failure does **not** throw, so the script continues, behaviors
(which come later and don't go through this path) import normally, and exec
reports "done". Net effect: a mixed library imports "about half" of its models.

Every other caller of `loadModelFromFile` (UI upload, batch LOD, URL upload,
asset-pack import) passes no `overriddenFileType` and lets the function detect
the container from `file.type`. Only the script-tool path forces zip.

## Repro
`GAME_FOLDER=/Users/n/erth/Games-StemScript/3d-chess node
scripts/playwright/repro-import-inspect.mjs` → persisted scene had 0 model
objects / 0 model assets, only the 3 behaviors; per-import logs showed all 6
models failing with the JSZip "central directory" error.

## Affected files
- `client/packages/editor-oss/src/agent/script-tool/importHandler.ts` (model case)

## Implementation
- [x] Sniff the real container in the model case: read the first 4 bytes and
      treat the file as a ZIP only when they are `PK\x03\x04`. Pass
      `"application/zip"` to `loadModelFromFile` only for true zips; pass `""`
      otherwise so raw `.glb`/`.gltf`/`.fbx`/`.obj` take the direct-load path
      (with companion files).
- [x] Update the misleading `//all models are ZIP archives` comment.

## Validation
- [x] Repro on 3d-chess: 6/6 model objects + 6 model assets persisted (was 0).
- [x] Repro on 100-cars: 11/11 model objects + 11 model assets persisted (was 0).
- [x] Pirate-ship still imports (zip-wrapped glb path is byte-for-byte unchanged
      — PK-magic files still pass "application/zip"). Logs confirm expandZip +
      texture-override + convertToGlb running normally; the repro's empty
      persisted scene is the known ~333s import-vs-save timing artifact
      (`exec done signal: null`), not a failure.
- [x] `bun run typecheck`
- [x] Remove temporary `[DIAG]` instrumentation from `useTerminal.ts`.
- [ ] Manual code review.
