---
name: stemstudio-game-ui-design
description: Plan HUDs, menus, overlays, and information hierarchy for StemStudio games. Use when the user wants UI composition, screen structure, or presentation decisions before implementation.
---

# StemStudio Game UI Design

Use this skill for UI planning and composition. It should decide what the interface needs, where it should live, and how it should support gameplay. Route to `stemstudio-uikit` for concrete implementation.

## Use This Skill When

- The user asks to design a HUD, menu, minimap, inventory, tutorial overlay, or game-over screen
- The request is about layout, hierarchy, readability, or UX rather than component syntax
- You need to decide whether UI is HUD, diegetic, world-space, or fullscreen overlay

## Choose The Right UI Form

| Need | Recommended Form |
| --- | --- |
| Health, score, ammo, quest state | Non-diegetic HUD |
| Signs, terminals, floating labels, enemy health bars | World-space or diegetic UI |
| Pause, settings, game over, mission complete | Fullscreen overlay |
| Context-sensitive hints | Small anchored prompt near the action or at screen edge |

## Design Workflow

1. Identify the gameplay information the player actually needs.
2. Rank it by urgency and frequency.
3. Pick the lightest UI form that communicates it clearly.
4. Reserve stable screen regions for persistent HUD elements.
5. Hand off to `stemstudio-uikit` for implementation.

## Practical Patterns

- Health or stamina:
  - keep persistent
  - place in a stable corner
  - emphasize threshold changes more than raw numbers
- Score, currency, collectibles:
  - use compact counters
  - group related values together
- Objective or tutorial text:
  - keep short
  - show only when relevant
- Pause/settings menu:
  - strong hierarchy
  - clear primary action and back path
- Minimap:
  - use only when spatial navigation matters
  - avoid it in very small scenes unless the user explicitly asks

## Readability Rules

- Prefer a few persistent UI anchors over many scattered panels.
- Avoid covering the center of play unless the UI is modal.
- Keep contrast high and wording short.
- Use motion and emphasis sparingly; gameplay state should remain readable at a glance.

## StemStudio-Specific Notes

- Runtime UI is UIKit, not HTML or React.
- Fullscreen HUDs must account for the fixed editor header.
- If the request includes implementation details, route to `stemstudio-uikit` after the layout is decided.

## When To Read More

- Need actual UIKit implementation syntax: `stemstudio-uikit`
- Need behavior lifecycle details for UI behaviors: `~/.claude/stemstudio-docs/behavior-system.md`
- Need exact UIKit types: `~/.claude/stemstudio-types/stem-types.d.ts`

## Hard Rules

- Do not invent complicated UI when a compact HUD will do.
- Do not design screens that hide core gameplay unnecessarily.
- Keep the design brief enough that implementation can start immediately.
