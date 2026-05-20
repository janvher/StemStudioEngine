# Event System

EventBus API and the complete event catalog for StemStudio behaviors.

## EventBus

Singleton PubSub wrapper using `pubsub-js`. Source: `web/src/behaviors/event/EventBus.ts`

```typescript
class EventBus {
  static instance: EventBus;          // Pre-created singleton
  private tokens: string[];           // Tracks all active subscription tokens
  private constructor();              // Enforces singleton pattern

  subscribe(topic: string, callback: (msg: string, data: any) => void): string;
  unsubscribe(token: string): void;
  send(topic: string, data?: any): void;   // data defaults to {}
  reset(): void;                           // Calls PubSub.clearAllSubscriptions() and empties token list
}
```

### API Details

| Method | Description |
|--------|-------------|
| `subscribe(topic, callback)` | Registers a callback for `topic`. Returns a token string used to unsubscribe. The callback receives `(msg, data)` where `msg` is the topic string. |
| `unsubscribe(token)` | Removes the subscription identified by `token` and removes it from the internal token list. |
| `send(topic, data?)` | Publishes `data` (defaults to `{}`) to all subscribers of `topic`. |
| `reset()` | Clears **all** subscriptions globally via `PubSub.clearAllSubscriptions()` and empties the internal token array. Typically called on scene/game teardown. |

### Usage in Behaviors

```typescript
import EventBus, { IN_GAME_EVENTS } from "../behaviors/event/EventBus";

// Subscribe
const token = EventBus.instance.subscribe(IN_GAME_EVENTS.CONSUMABLE_COLLECTED, (msg, data) => {
  console.log("Collected:", data.target.name);
});

// Send
EventBus.instance.send(IN_GAME_EVENTS.GAME_SCORE_INC, 100);

// Unsubscribe
EventBus.instance.unsubscribe(token);
```

## IN_GAME_EVENTS

Complete enum from `EventBus.ts` (authoritative source). Every entry below is verified against the TypeScript enum definition.

### Game State Events

| Enum Key | Event String | Typical Payload |
|----------|-------------|-----------------|
| `GAME_LIVES_INC` | `game.lives.inc` | number (amount) |
| `GAME_LIVES_DEC` | `game.lives.dec` | number (amount) |
| `GAME_HEALTH_INC` | `game.health.inc` | number (amount) |
| `GAME_HEALTH_DEC` | `game.health.dec` | number (amount) |
| `GAME_SCORE_INC` | `game.score.inc` | number (amount) |
| `GAME_SCORE_DEC` | `game.score.dec` | number (amount) |
| `GAME_TIME_INC` | `game.time.inc` | number (seconds) |
| `GAME_TIME_DEC` | `game.time.dec` | number (seconds) |
| `GAME_LOGIN_SUCCESS` | `game.loginSuccess` | -- |

### Enemy Events

| Enum Key | Event String | Typical Payload |
|----------|-------------|-----------------|
| `ENEMY_SPAWNED` | `enemy.spawned` | `{ target: Object3D }` |
| `ENEMY_DIED` | `enemy.died` | `{ target: Object3D }` |
| `ENEMY_GOT_HIT` | `enemy.got.hit` | `{ target: Object3D, damage? }` |
| `ENEMY_STATE_CHANGED` | `enemy.state.changed` | `{ target: Object3D, state? }` |
| `ENEMY_PLAYER_DETECTED` | `enemy.player.detected` | `{ target: Object3D }` |
| `ENEMY_PLAYER_LOST` | `enemy.player.lost` | `{ target: Object3D }` |
| `ENEMY_ATTACK_STARTED` | `enemy.attack.started` | `{ target: Object3D }` |
| `ENEMY_ATTACK` | `enemy.attack` | `{ target: Object3D }` |
| `ENEMY_ATTACK_ENDED` | `enemy.attack.ended` | `{ target: Object3D }` |

### Character Motion Events

| Enum Key | Event String |
|----------|-------------|
| `CHARACTER_IDLE` | `character.motion.none` |
| `CHARACTER_MOTION_START` | `character.motion_start` |
| `CHARACTER_MOTION` | `character.motion` |
| `CHARACTER_MOTION_END` | `character.motion_end` |
| `CHARACTER_MOTION_WALK_START` | `character.motion.walk_start` |
| `CHARACTER_MOTION_WALK` | `character.motion.walk` |
| `CHARACTER_MOTION_WALK_END` | `character.motion.walk_end` |
| `CHARACTER_MOTION_RUN_START` | `character.motion.run_start` |
| `CHARACTER_MOTION_RUN` | `character.motion.run` |
| `CHARACTER_MOTION_RUN_END` | `character.motion.run_end` |

Payload: `{ target: Object3D, velocity?, direction?, ... }` (characterData object)

### Character Action Events

| Enum Key | Event String |
|----------|-------------|
| `CHARACTER_ACTION_FALL_BACK` | `character.action.fall_back` |
| `CHARACTER_ACTION_DEAD` | `character.action.dead` |
| `CHARACTER_ACTION_JUMP_START` | `character.action.jump_start` |
| `CHARACTER_ACTION_JUMP` | `character.action.jump` |
| `CHARACTER_ACTION_LAND` | `character.action.land` |
| `CHARACTER_ACTION_CLIMB_START` | `character.action.climb_start` |
| `CHARACTER_ACTION_CLIMB` | `character.action.climb` |
| `CHARACTER_ACTION_CLIMB_END` | `character.action.climb_end` |
| `CHARACTER_ACTION_CROUCH_START` | `character.action.crouch_start` |
| `CHARACTER_ACTION_CROUCH` | `character.action.crouch` |
| `CHARACTER_ACTION_CROUCH_END` | `character.action.crouch_end` |
| `CHARACTER_ACTION_FALL_START` | `character.action.fall_start` |
| `CHARACTER_ACTION_FALL` | `character.action.fall` |
| `CHARACTER_ACTION_FALL_END` | `character.action.fall_end` |
| `CHARACTER_ACTION_INTERACT` | `character.action.interact` |

Payload: characterData object

### Character Animation Events

| Enum Key | Event String |
|----------|-------------|
| `CHARACTER_ANIMATION_TRIGGER` | `character.animation.trigger` |
| `CHARACTER_ANIMATION_STOP` | `character.animation.stop` |
| `CHARACTER_ANIMATION_COMPLETE` | `character.animation.complete` |

### Consumable Events

| Enum Key | Event String | Typical Payload |
|----------|-------------|-----------------|
| `CONSUMABLE_IN_RANGE` | `consumable.in.range` | `{ target: Object3D }` |
| `CONSUMABLE_NOT_IN_RANGE` | `consumable.not.in.range` | `{ target: Object3D }` |
| `CONSUMABLE_COLLECTED` | `consumable.collected` | `{ target: Object3D }` |
| `CONSUMABLE_COLLIDED` | `consumable.collided` | `{ target: Object3D }` |

### Object / Interaction Events

| Enum Key | Event String | Typical Payload |
|----------|-------------|-----------------|
| `JUMPPAD_ACTIVATED` | `jumppad.activated` | `{ target: Object3D }` |
| `PLATFORM_ACTIVATED` | `platform.activated` | `{ target: Object3D }` |
| `PLATFORM_MOVING` | `platform.moving` | `{ target: Object3D }` |
| `PLATFORM_DEACTIVATED` | `platform.deactivated` | `{ target: Object3D }` |
| `VOLUME_ACTIVATED` | `volume.activated` | `{ target: Object3D }` |
| `RANDOMIZED_SPAWNER_ACTIVATED` | `randomized.spawner.activated` | `{ target: Object3D }` |
| `SPAWN_ACTIVATED` | `spawner.activated` | `{ target: Object3D }` |
| `TELEPORT_ACTIVATED` | `teleport.activated` | `{ target: Object3D }` |

### NPC Events

| Enum Key | Event String | Typical Payload |
|----------|-------------|-----------------|
| `NPC_INTERACTION_STARTED` | `npc.interaction.started` | `{ target: Object3D }` |
| `NPC_INTERACTION_ENDED` | `npc.interaction.ended` | `{ target: Object3D }` |
| `NPC_ACTION_STARTED` | `npc.action.started` | `{ target: Object3D }` |
| `NPC_ACTION_ENDED` | `npc.action.ended` | `{ target: Object3D }` |

## BEHAVIOR_EVENTS

Separate enum for behavior-specific events (also exported from `EventBus.ts`):

| Enum Key | Event String | Description |
|----------|-------------|-------------|
| `DAY_NIGHT_CYCLE` | `DayNightCycle` | Fired by the DayNightCycle behavior on cycle transitions |

## IFRAME_MESSAGES

Enum from `stem-events-registry.json` for iframe/game-lifecycle communication. These are not part of the in-game EventBus but are used for host-page messaging:

| Enum Key | Event String |
|----------|-------------|
| `GAME_STARTED` | `gameStarted` |
| `GAME_RESUMED` | `gameResumed` |
| `GAME_PAUSED` | `gamePaused` |
| `GAME_ENDED` | `gameEnded` |
| `GAME_CLOSED` | `gameClosed` |
| `GAME_CLOSE_AND_SAVE` | `gameCloseAndSave` |
| `GAME_CREATED` | `gameCreated` |
| `GAME_PLAYER_ERROR` | `gamePlayerError` |
| `GAME_ERROR` | `gameError` |
| `GAME_MULTIPLAYER_ERROR` | `gameMultiplayerError` |
| `PLAYER_ADDED_LISTENER` | `playerAddedListener` |
| `HEALTH_UPDATE` | `healthUpdate` |

## Additional Runtime Events

The `_allUsedEvents` list in `stem-events-registry.json` includes events that are fired at runtime but are not part of any TypeScript enum. These are emitted directly as string topics:

| Event String | Notes |
|-------------|-------|
| `device.orientation` | Fired on device orientation changes (mobile) |
| `gameServices.authenticated` | Fired when game services authentication completes |

## stem-events-registry.json

The file `stem-events-registry.json` at the project root is the machine-readable registry of **all** enum-backed events and constants used by the engine. It mirrors the TypeScript enums (including `IN_GAME_EVENTS`, `BEHAVIOR_EVENTS`, `IFRAME_MESSAGES`, and many non-event enums such as `ENEMY_TYPES`, `WEAPON_TYPES`, `CAMERA_TYPES`, etc.). Its `_allUsedEvents` array is a deduplicated, sorted list of every event string observed in the codebase. Use this file when you need to programmatically enumerate available events or validate event strings.

## Custom Events

Behaviors can send and listen to arbitrary string topics beyond the enum values:

```typescript
// Send custom event
EventBus.instance.send("my.custom.event", { value: 42 });

// Touch controls support custom event buttons
// behavior.json config:
"buttonAction": "customEvent",
"onButtonPress": "my.jump.event",
"onButtonRelease": "my.jump.release"
```

### Payload Conventions

| Pattern | Typical payload |
|---------|----------------|
| Game state (inc/dec) | `number` (amount to add/subtract) |
| Character events | `{ target: Object3D, velocity?, direction? }` |
| Object events | `{ target: Object3D }` |
| Enemy events | `{ target: Object3D, state?, damage? }` |
| NPC events | `{ target: Object3D }` |
| Custom events | Any value (object, number, string) |

## Integration with Trigger Behavior

The `trigger` behavior can listen to any IN_GAME_EVENTS and custom events to conditionally activate other behaviors. The `visualEffect` behavior supports triggering particle effects on 40+ events from the IN_GAME_EVENTS enum.
