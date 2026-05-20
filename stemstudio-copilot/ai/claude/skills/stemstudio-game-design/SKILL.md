---
name: stemstudio-game-design
description: Genre blueprints, game-feel guidance, and build-order planning for Studio 3D. Use when the user wants a whole game, a genre direction, or better game feel rather than a single asset or command.
---

# StemStudio Game Design

This is a planning and composition skill, not a primary execution skill.

Use it when the task is about:
- choosing a genre structure
- deciding build order for a full game
- improving game feel
- selecting mechanics, pacing, or difficulty patterns
- mapping a vague request into concrete StemStudio skills

## Workflow

1. Identify the genre or nearest playbook.
2. Define the core loop in one sentence.
3. Lock the camera and control scheme early.
4. **Look up the genre's physics defaults row** in `~/.claude/stemstudio-docs/physics-system.md` "Physics Defaults by Genre" — gravity, player body type, environment shape, recommended preset. This row informs the very first object physics decisions; load it before any `stemstudio-physics` work.
5. Define win state, fail state, and progression.
6. Break the game into build slices:
   environment
   player and camera
   verbs and interactions
   enemies, hazards, or challenge systems
   progression and feedback
   polish
7. Route each slice to the smallest execution skill that can deliver it.
8. Verify one slice at a time instead of planning the whole game as one giant batch.

## Creation Workflow

For broad "make a game" requests, use this order:

1. Choose the closest genre playbook in `~/.claude/stemstudio-docs/genres/`
2. Read `~/.claude/stemstudio-docs/game-design-patterns.md`
3. Read `~/.claude/stemstudio-docs/camera-guide.md` if camera choice is not already obvious
4. Build a graybox first
5. Implement the player loop before enemy or scoring systems
6. Add progression, fail states, and feedback only after the main verb feels good
7. Route polish into VFX, audio, UI, lighting, and post-processing last

## Genre Routing

Use these as compact starting points:

- platformer or endless runner: jump timing, readable lanes or platforms, fail volumes, collectables, strong side-view camera
- action adventure or collectathon: traversal, quests or pickups, spatial exploration, enemy encounters, checkpointing
- fps shooter: weapon loop, enemy readability, health and ammo feedback, encounter pacing
- racing or kart: track readability, checkpoints, boosts, collision forgiveness, follow camera
- puzzle exploration: low mechanic count, high readability, strong state change feedback
- tower defense: waves, lanes, towers, base health, upgrade pacing
- turn-based strategy: turn order, unit roles, battlefield readability, state panels
- fighting: short rounds, spacing, hit confirms, camera framing, input responsiveness
- survival crafting or simulation management: resource loops, build or unlock cadence, clear economy feedback
- horror: tension pacing, visibility control, scarcity, audio cues, safe versus unsafe spaces

## Game Feel Checklist

When a game feels flat, improve:
- feedback on success and failure
- movement readability
- camera appropriateness
- pacing between actions
- visible state changes
- sound/VFX reinforcement
- progression of challenge
- touch and mobile readability when the game must work beyond keyboard/mouse

Typical polish routes:
- VFX and impact feedback -> `stemstudio-vfx`
- behavior tuning -> `stemstudio-behaviors`
- atmosphere/post-processing -> `stemstudio-atmosphere`
- camera setup -> `stemstudio-camera`
- reusable encounter pieces -> `stemstudio-prefabs`

## Composition Rules

- Prefer built-in behaviors before custom code.
- Prefer prefab reuse before rebuilding repeated setups.
- Use primitives for structural geometry and search/import for recognizable authored assets.
- Keep one creation strategy per object.
- Keep data in lambdas and logic in behaviors.
- Do not over-design systems the user did not ask for.
- Design for visible feedback early; a mechanic without feedback will feel broken even if the logic works.

## Build Order Templates

### New game from scratch

1. define genre, fantasy, and core loop
2. choose camera and movement model
3. build navigable space or board layout
4. implement player or primary interaction verb
5. add challenge layer: enemies, obstacles, puzzles, or economy loop
6. add scoring, fail states, progression, and feedback
7. add polish, VFX, audio, UI, and atmosphere

### Improve an existing prototype

1. inspect current scene and mechanics
2. identify the weakest layer
3. improve one loop at a time
4. verify before adding more systems

## When To Read More

- Need a deeper mechanic pattern library: `~/.claude/stemstudio-docs/game-design-patterns.md`
- Need a matching genre playbook: `~/.claude/stemstudio-docs/genres/`
- Need camera selection rules: `~/.claude/stemstudio-docs/camera-guide.md`
- Need to know whether a built-in behavior already covers the mechanic: `~/.claude/stemstudio-docs/behavior-catalog.md`
- Need exact event topics while planning cross-system behavior interactions: `~/.claude/stemstudio-types/stem-events-registry.json`

For implementation, switch to the execution skill that matches the current layer instead of staying in this skill.

## Common Mistakes

- using this skill as if it were an API reference
- loading many implementation skills before the game loop is defined
- adding polish before the core loop is working
- skipping camera and control choices until late in the build
- planning enemies and scoring before the player verb feels good
- overbuilding systems the user did not request

## See Also

- `stemstudio-copilot`
- `stemstudio-scene`
- `stemstudio-objects`
- `stemstudio-behaviors`
- `stemstudio-atmosphere`
- `stemstudio-camera`
- `stemstudio-vfx`
