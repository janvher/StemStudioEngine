# Copilot inspection allowlist — let the copilot inspect the full scene

## Goal

The playground copilot fails an entire request when its generated
`inspectionStemscript` contains a read-only query that isn't in a narrow
hardcoded allowlist (e.g. `list lights` →
`Generated StemScript used commands that are not allowed in inspection`).

Make the copilot able to inspect the **full** scene and all asset types in the
read-only inspection phase, and resolve the `list lights` surface command to a
real command. Behavior/lambda parameter customization already works on the
mutation side (not blocked by `DISALLOWED_COMMANDS`).

## Root cause

- `validateInspectionStemscript` (`copilot/playgroundStemscriptPlan.ts:161`)
  allows only the 21 commands in the hand-maintained `READ_ONLY_COMMANDS` set.
- The engine's real read-only notion is broader:
  `isReadOnlyCommand` (`agent/script-tool/checkScript.ts:540`) = command starts
  with `get_` / `list_` / `search_`, or is `player` / `select`.
- `list lights` has no alias, so the parser raw-passes it to command `list`
  (`ScriptCommandParser.ts:105`), which is neither read-only nor a real command.

## Approach

- A: Inspection allows any command the engine classifies as read-only, except
  ones globally disallowed in the playground (external search, library, project
  tasks — already in `DISALLOWED_COMMANDS`). Rule:
  `disallowed = !isReadOnlyCommand(cmd) || DISALLOWED_COMMANDS.has(cmd)`.
- B: Add `"list lights": {command: "get_scene_objects"}` to the alias map so the
  surface command the model naturally emits resolves to a real read-only command
  (lights are scene objects; details via the existing `get light` → `get_light_settings`).

## Affected files

- `client/packages/editor-oss/src/agent/script-tool/checkScript.ts` — export
  `isReadOnlyCommand`.
- `client/packages/editor-oss/src/copilot/playgroundStemscriptPlan.ts` — reuse
  `isReadOnlyCommand`; drop the narrow `READ_ONLY_COMMANDS` set.
- `client/packages/editor-oss/src/agent/script-tool/aliases.ts` — add
  `list lights` alias.
- Tests: `playgroundStemscriptPlan.test.ts`, alias/contract tests.

## Steps

- [x] Export `isReadOnlyCommand` from `checkScript.ts`.
- [x] Rewrite `validateInspectionStemscript` to use it + `DISALLOWED_COMMANDS`.
- [x] Remove the now-unused `READ_ONLY_COMMANDS` set.
- [x] Add the `list lights` alias.
- [x] Update/extend tests.

## Validation

- [x] `bun run typecheck` — clean.
- [x] `bun run test` (Vitest) — 2537 passed, incl. new `list lights` regression.
- [ ] Manual code review.
