# OSS GLB import: skip redundant GLTFExporter round-trip

## Goal
Cut import time for stemscripts with many GLB models. Importing the Pirate
Ship game (101 `import model` commands) blocks the main thread for ~1000s
because each model is parsed → re-exported via `GLTFExporter` → re-parsed.
For sources that are already self-contained GLB, the re-export is pure waste.

## Evidence
- Diagnostic caught a single `page.evaluate` blocked 291s→1290s during
  import-resolution → main thread monopolized ~1000s, never reaching the
  command-execution loop.
- 101 model imports; `convertToGlb(model, signal, {})` is called with empty
  options, so it does *only* the `GLTFExporter.parse` round-trip (no
  simplify/compress/optimize) — wasted for an already-valid GLB.

## Approach
In `importHandler.ts` model case, after `loadModelFromFile` returns
`{rootFile, format, atlasData, textureOverrides}`:
- Fast path when `format === "glb" && !atlasData && !textureOverrides`
  (self-contained GLB, no loose-texture remapping): use
  `await rootFile.arrayBuffer()` as `sourceGlbBuffer`, skipping `convertToGlb`.
- Otherwise (FBX/OBJ/gltf+loose-textures/atlas): keep `convertToGlb` — the
  exporter is required to normalize those into a single GLB.
- Keep the existing `loadModel(asset.id, context)` re-load for scene/asset
  wiring + reload persistence (NOT skipped — out of scope, correctness risk).

## Affected files
- `client/packages/editor-oss/src/agent/script-tool/importHandler.ts` (model case)

## Implementation steps
- [ ] Capture `rootFile`, `format`, `atlasData`, `textureOverrides` from
      `loadModelFromFile`.
- [ ] Compute `sourceGlbBuffer` via fast path or `convertToGlb` fallback.
- [ ] Leave LOD/thumbnail OSS gates and `loadModel` re-load unchanged.

## Validation steps
- [x] `bun run typecheck`
- [x] Manual code review.

## Findings (post-implementation)
Per-step timing instrumentation (temporary, since removed) of a full
pirate-ship import showed:
- `import-resolution = 333.5s` (109 imports; 100 models) — the dominant phase.
- `execute-loop = 33.4s` (incl. one pathological `behavior attach
  ship-pirate-large.glb` = **23.8s** on first exported-behavior attach).
- `save = 1.1s`. Total ≈ 377s when run fire-and-forget.

**The fast path is INERT for this game.** Every model reports
`fmt=glb, atlas=false, ovr=true`: the Kenney models reference an external
`colormap` texture, so `loadModelFromFile` sets `textureOverrides` and
`convertToGlb` (the GLTFExporter bake, ~1.2s/model) is genuinely required to
inline that texture into a single GLB. The skip only benefits self-contained
GLBs with no loose textures (other games), so it is kept as a correct,
low-risk optimization but does not speed up pirate-ship.

**The 1200s smoke timeouts were not a hang.** Real work is ~377s; the import
is borderline vs the cap and highly sensitive to machine/harness load
(fire-and-forget diag finished at 377s; the smoke's awaited `page.evaluate`
under concurrent load exceeded the cap). The genuine lever to make large
shared-texture imports reliably fast is to avoid re-baking the same external
texture into N separate GLBs (bake once / share the texture asset) — a larger
import-pipeline change, deferred pending product decision.
