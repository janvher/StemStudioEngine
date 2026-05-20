---
name: stemstudio-eventbus
description: EventBus guidance for behavior-to-behavior messaging in Studio 3D. Use when behaviors need decoupled communication, topic design, or event lifecycle cleanup.
---

# StemStudio EventBus

Use this skill when behaviors need publish/subscribe communication.

This is primarily a behavior-authoring skill, not a scene-command skill.

## Use This Skill For

- topic naming
- sending events between behaviors
- subscribing and unsubscribing safely
- choosing event-driven coordination over direct references

## Critical Pattern

Always:
- subscribe in the correct startup phase
- store subscription tokens
- unsubscribe in cleanup
- keep payloads small and explicit

Use EventBus when systems should be decoupled. Do not use it as a replacement for plain local state.

## Typical Uses

- player/enemy communication
- game-state broadcasts
- UI-triggered behavior reactions
- collectible and trigger notifications
- cross-object coordination without tight references

## When To Read More

- Need publish/subscribe API behavior or topic conventions: `~/.claude/stemstudio-docs/event-system.md`
- Need exact registered topics or constants: `~/.claude/stemstudio-types/stem-events-registry.json`
- Need exact type declarations: `~/.claude/stemstudio-types/stem-types.d.ts`

If you are writing the behavior itself, also load `stemstudio-behaviors`.

## Common Mistakes

- forgetting to unsubscribe in cleanup
- inventing event names when a registered topic already exists
- sending oversized payloads
- using EventBus where direct local logic would be simpler

## Verification

Verify by:
- checking sender and receiver topic names match
- confirming subscription lifecycle cleanup
- logging or tracing event flow only as narrowly as needed for debugging

## See Also

- `stemstudio-behaviors`
- `stemstudio-game-engine`
