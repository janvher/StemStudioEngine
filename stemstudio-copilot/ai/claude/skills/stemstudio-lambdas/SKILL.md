---
name: stemstudio-lambdas
description: Lambda/ECS data design for Studio 3D. Use when the user needs structured per-object data, schema guidance, or behavior-to-data integration rather than per-object logic.
---

# StemStudio Lambdas

Use this skill to design lambda data, not to execute lambda CRUD.

Lambdas are ECS-style data components — persistent structured data attached to objects. They hold data (health, inventory, tags), not logic. Behaviors read/write lambda data at runtime.

The copilot can:
- explain lambda patterns
- design lambda schemas
- write behavior code that reads or writes lambda data
- help debug lambda access in behaviors

The copilot cannot:
- create, delete, list, or search lambdas directly
- attach or detach lambdas from objects
- modify lambda definitions through runtime commands

The user still creates lambdas in the editor UI.

## When to Use Lambdas

Use a lambda when the problem is mainly structured data:
- health, mana, stamina
- tags, factions, state flags
- inventory or loadout data
- tuning/config values shared by behaviors
- progression or quest state attached to objects

Use a behavior when the problem is mainly logic with side effects:
- movement
- AI
- animation control
- input handling
- event reactions with runtime actions

Rule of thumb:
- data -> lambda
- per-object logic -> behavior
- global singleton state -> store/global game state, not lambda

## Recommended Workflow

1. Decide whether the problem is data-first or logic-first.
2. Design the lambda schema.
3. Ask the user to create the lambda in the editor UI.
4. Write or update behavior code that reads/writes the lambda.
5. Verify the behavior accesses the expected lambda fields.

## Critical Patterns

### Health / resource data

Good lambda fields:
- `current`
- `max`
- `regenRate`
- `isInvulnerable`

Use behaviors for damage application, death reactions, and UI feedback.

### Inventory / equipment

Good lambda fields:
- `slots`
- `items`
- `capacity`
- `equipped`

Use behaviors for pickup logic, equip actions, and UI wiring.

### Tags / state / configuration

Good lambda fields:
- `faction`
- `isActive`
- `tier`
- `spawnGroup`
- `interactionType`

Use behaviors to interpret the data at runtime.

## Design Rules

- Keep each lambda focused on one concern.
- Prefer several small lambdas over one large mixed lambda.
- Use predictable field names and simple primitives unless a nested structure is clearly needed.
- Avoid hiding gameplay logic in lambda data design.
- Reuse existing lambda concepts if the user already has similar data in the project.

## Behavior Integration

When a behavior needs lambda access:
- use the documented lambda APIs from the engine reference
- null-check missing data
- keep read/write paths explicit
- avoid assuming every object has the lambda attached

If lambda-driven code gets complex, load:
- `stemstudio-behaviors` for behavior authoring
- `stemstudio-game-engine` for runtime API details

## When To Read More

- Need lambda access patterns from behavior code: `~/.claude/stemstudio-docs/behavior-system.md`
- Need exact runtime/type contracts for lambda integration: `~/.claude/stemstudio-types/stem-types.d.ts`

## Common Mistakes

- using lambdas for logic that should live in behaviors
- creating one giant “everything” lambda
- designing data without checking how behaviors will access it
- assuming the copilot can create lambdas automatically

## See Also

- `stemstudio-behaviors`
- `stemstudio-scripts` — for shared `@import` helpers consumed from lambda code
- `stemstudio-game-engine`
- `stemstudio-game-design`
