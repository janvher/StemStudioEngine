# Viewport Safe Area API

## Goal

- [x] Expose a runtime safe-area API derived from the actual play viewport so behavior DOM and screen-space UI can avoid StemStudio chrome.

## Assumptions

- [x] The play viewport element is already the source of truth for the unobscured runtime area.
- [x] Behaviors should consume a stable `this.erth.viewport` or `game` API instead of hard-coded window metrics.

## Affected Files

- [x] `client/packages/editor-oss/src/EngineRuntime.ts`
- [x] `client/packages/editor-oss/src/behaviors/game/GameManager.ts`
- [x] `client/packages/editor-oss/src/behaviors/stem/*`
- [x] `client/packages/editor-oss/src/editor/assets/v2/BehaviorEditor/types/behavior.d.ts`
- [x] `docs/runtime-api.md`
- [x] `../Games-StemScript/Pirate-Ship-Battle-Royal-v1.0/behaviors/*.yaml`

## Implementation

- [x] Add a measured safe-area object based on the runtime viewport rect.
- [x] Expose the API through `this.erth.viewport` and `game.getViewportSafeArea()`.
- [x] Update Pirate Ship Battle Royale DOM/UI behaviors to use the safe area for layout and screen projection.

## Validation

- [x] Run a narrow test for the safe-area measurement/interface.
- [x] Run targeted diagnostics/type checks for touched files.
- [x] Manual code review.