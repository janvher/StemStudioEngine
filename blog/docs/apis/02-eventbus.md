---
title: "Built-in Events Reference"
slug: eventbus
description: "Complete catalog of built-in gameplay events emitted by engine systems. Use the onEvent() lifecycle hook in your behaviors to react to these events."
status: draft
audience: technical-creators
prerequisites: [scripting/01-behaviors-vs-lambdas, apis/01-erth-interface]
---

# Built-in Events Reference

StemStudio's engine systems and built-in behaviors emit events during gameplay. Your custom behaviors receive these events through the `onEvent` lifecycle hook.

This page is mainly a **receive-side reference**. In current scripting guidance, new custom scripts should listen with `onEvent(msg, data)` rather than building around deprecated direct `EventBus.send()` patterns.

## What This Page Is For

Use this page when you need to:

- Look up the topic string for a built-in gameplay event
- React to engine events in your behavior code
- Understand what data is sent with each event

## Receiving Events

Implement the `onEvent` lifecycle hook in your behavior to react to engine events:

```javascript
this.onEvent = function(msg, data) {
    if (msg === "enemy.died") {
        console.log("Enemy died:", data);
    }
};
```

Or in a class-based behavior:

```ts
onEvent(msg: string, data: any): void {
    switch (msg) {
        case "consumable.collected":
            this.onItemCollected(data);
            break;
        case "character.action.jump_start":
            this.playJumpEffect();
            break;
    }
}
```

---

## Game State Events

These events control score, lives, health, and time through the GameManager.

| Topic | Description | Data |
|-------|-------------|------|
| `game.lives.inc` | Increase player lives | `number` (amount) |
| `game.lives.dec` | Decrease player lives | `number` (amount) |
| `game.health.inc` | Increase player health | `number` (amount) |
| `game.health.dec` | Decrease player health | `number` (amount) |
| `game.score.inc` | Increase score | `number` (amount) |
| `game.score.dec` | Decrease score | `number` (amount) |
| `game.time.inc` | Add time to game timer | `number` (seconds) |
| `game.time.dec` | Subtract time from game timer | `number` (seconds) |
| `game.loginSuccess` | Player login completed | `GameLoginData` |

---

## Enemy Events

Emitted by enemy-related behaviors (spawners, AI, combat).

| Topic | Description |
|-------|-------------|
| `enemy.spawned` | An enemy was spawned |
| `enemy.died` | An enemy was destroyed |
| `enemy.got.hit` | An enemy took damage |
| `enemy.state.changed` | An enemy's state machine transitioned |
| `enemy.player.detected` | An enemy detected the player |
| `enemy.player.lost` | An enemy lost sight of the player |
| `enemy.attack.started` | An enemy began an attack sequence |
| `enemy.attack` | An enemy attack is in progress |
| `enemy.attack.ended` | An enemy finished an attack sequence |

---

## Character Motion Events

Emitted by the character controller when the player moves.

| Topic | Description |
|-------|-------------|
| `character.motion.none` | Character is idle |
| `character.motion_start` | Character started moving |
| `character.motion` | Character is moving (fires each frame) |
| `character.motion_end` | Character stopped moving |
| `character.motion.walk_start` | Walk began |
| `character.motion.walk` | Walking (fires each frame) |
| `character.motion.walk_end` | Walk ended |
| `character.motion.run_start` | Run began |
| `character.motion.run` | Running (fires each frame) |
| `character.motion.run_end` | Run ended |

---

## Character Action Events

Emitted by the character controller for jumps, climbs, crouches, falls, and interactions.

| Topic | Description |
|-------|-------------|
| `character.action.jump_start` | Jump initiated |
| `character.action.jump` | In the air (fires each frame) |
| `character.action.land` | Landed after a jump |
| `character.action.climb_start` | Started climbing |
| `character.action.climb` | Climbing (fires each frame) |
| `character.action.climb_end` | Finished climbing |
| `character.action.crouch_start` | Started crouching |
| `character.action.crouch` | Crouching (fires each frame) |
| `character.action.crouch_end` | Stopped crouching |
| `character.action.fall_start` | Started falling |
| `character.action.fall` | Falling (fires each frame) |
| `character.action.fall_end` | Finished falling |
| `character.action.fall_back` | Fell backward |
| `character.action.dead` | Character died |
| `character.action.interact` | Character interacted with something |

---

## Animation Events

Control character animations programmatically.

| Topic | Description |
|-------|-------------|
| `character.animation.trigger` | Trigger an animation to play |
| `character.animation.stop` | Stop the current animation |
| `character.animation.complete` | An animation finished playing |

---

## Consumable Events

Emitted by consumable behaviors (collectibles, pickups).

| Topic | Description |
|-------|-------------|
| `consumable.in.range` | Player entered pickup range |
| `consumable.not.in.range` | Player left pickup range |
| `consumable.collected` | Item was collected |
| `consumable.collided` | Player collided with a consumable |

---

## Trigger and Platform Events

Emitted by trigger volumes, jump pads, platforms, spawners, and teleporters.

| Topic | Description |
|-------|-------------|
| `jumppad.activated` | A jump pad was triggered |
| `platform.activated` | A platform was activated |
| `platform.moving` | A platform is currently moving |
| `platform.deactivated` | A platform was deactivated |
| `volume.activated` | A trigger volume was entered |
| `randomized.spawner.activated` | A randomized spawner fired |
| `spawner.activated` | A spawner fired |
| `teleport.activated` | A teleporter was used |

---

## NPC Events

Emitted by AI NPC behaviors during conversations and actions.

| Topic | Description |
|-------|-------------|
| `npc.interaction.started` | Player started an NPC conversation |
| `npc.interaction.ended` | NPC conversation ended |
| `npc.action.started` | NPC started performing an action |
| `npc.action.ended` | NPC finished performing an action |

---

## Example: Reacting to Multiple Events

```ts
onEvent(msg: string, data: any): void {
    switch (msg) {
        case "enemy.died":
            this.enemyCount--;
            if (this.enemyCount <= 0) {
                this.erth?.store.set("waveCleared", true);
            }
            break;

        case "consumable.collected":
            const score = this.erth?.store.get<number>("score") ?? 0;
            this.erth?.store.set("score", score + (data.points ?? 10));
            break;

        case "character.action.dead":
            this.showGameOverScreen();
            break;
    }
}
```

## Next Steps

- Learn about [Communication Patterns](../scripting/04-communication-patterns.md) for behavior-to-behavior messaging and the global store.
- See [GameManager](04-game-manager.md) to understand how game state events are processed.
- Read [Erth Interface](01-erth-interface.md) for the primary behavior API.
