---
title: Multiplayer Overview
slug: multiplayer-overview
description: Understand how StemStudio multiplayer works, including rooms, host authority, synchronized state, and player management.
status: draft
audience: technical-creators
prerequisites: [getting-started/02-editor-tour, scripting/01-behaviors-vs-lambdas]
---

# Multiplayer Overview

StemStudio provides real-time multiplayer through shared rooms. The current multiplayer implementation uses Colyseus for room-based synchronization. When enabled, players join the same room and object transforms, player state, behavior data, and game state stay synchronized across connected clients.

## What This Page Is For

Use this page when you need to answer questions like:

- How does the room model work?
- What data is synchronized between players?
- What is host authority and how does host migration work?
- How are players spawned and managed?
- How do I enable multiplayer for my game?

## The Room Model

Multiplayer in StemStudio is organized around **rooms**. A room is a shared game session that multiple players can join.

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Client A (Host) │◄───────►│  Colyseus Room   │◄───────►│    Client B      │
└──────────────────┘         └────────┬─────────┘         └──────────────────┘
                                      │
                              ┌───────┴───────┐
                              │               │
                       ┌──────▼─────┐  ┌──────▼─────┐
                       │  Client C  │  │  Client D  │
                       └────────────┘  └────────────┘
```

### How Rooms Work

1. When the first player joins a scene, a new Colyseus room is **created**. That player becomes the **host**.
2. When subsequent players join the same scene, they are **matched into an existing room** that has space.
3. If all rooms for that scene are full, the player is added to a **waiting list**.
4. The room has a **maximum client limit** (default: 4 players, configurable).

The room name maps to the scene ID, so players loading the same scene end up in the same room.

### Room Lifecycle

```
1. First player loads the scene
   -> Colyseus room is created
   -> Player becomes the host

2. Additional players load the same scene
   -> StemStudio finds a Colyseus room with space
   -> Player joins the existing room

3. Host disconnects
   -> Host migration: a new host is assigned

4. All players disconnect
   -> Room is cleaned up
```

## Room State

The room state is the authoritative source of truth for all synchronized data. Every client receives the same state, and changes flow through the Colyseus room.

The `GameRoomState` contains:

| Field | Type | Purpose |
|-------|------|---------|
| **ready** | `boolean` | Whether the room is fully initialized |
| **inviteCode** | `string` | Code for joining private rooms |
| **hostSessionId** | `string` | Session ID of the current host |
| **players** | `Map<Player>` | All connected players |
| **objects** | `Map<GameObject>` | All synchronized objects |
| **behaviorData** | `Map<ObjectData>` | Per-object, per-behavior synced state |
| **gameState** | `GameState` | Shared game-level state (score, ended) |
| **behaviors** | `Map<Behavior>` | Shared behavior configurations |
| **scripts** | `Map<Script>` | Shared script data |

### Player State

Each player in the room has:

| Field | Type | Purpose |
|-------|------|---------|
| **id** | `string` | Unique player identifier |
| **sessionId** | `string` | Session ID for the current connection |
| **uuid** | `string` | UUID of the player's game object |
| **origin** | `string` | UUID of the object the player was cloned from |
| **name** | `string` | Display name |
| **slot** | `number` | Unique number (0 to max_clients) for this player |
| **animation** | `string` | Current animation being played |
| **data** | `Map<string>` | Custom key-value data per player |

### Game Object State

Each synchronized object contains:

| Field | Type | Purpose |
|-------|------|---------|
| **uuid** | `string` | Unique object identifier |
| **template** | `string` | Prefab UUID (if cloned from a template) |
| **position** | `Vector3` | World position |
| **scale** | `Vector3` | Object scale |
| **quaternion** | `Quaternion` | Object rotation |
| **motionState** | `ObjectMotionState` | Physics motion data (onGround, linearVelocity) |
| **material** | `Material` | Material properties (color, opacity, emissive) |
| **visible** | `boolean` | Whether the object is visible |
| **animation** | `string` | Current animation |
| **children** | `Map<GameObject>` | Child objects |

### Game State

The shared game state tracks:

| Field | Type | Default |
|-------|------|---------|
| **score** | `number` | `0` |
| **ended** | `boolean` | `false` |

Score changes are broadcast to all clients via the event system.

## Host Authority

The host is the client responsible for running authoritative game logic. Not all clients need to compute every system -- the host handles things that should only run once for the entire room.

### What The Host Does

- Runs global behaviors (day-night cycle, spawn timers, game flow)
- Computes physics for moving platforms and other host-authoritative objects
- Writes behavior data that other clients read
- Makes decisions that should be consistent for all players

### Who Is The Host

The first player to create the room is the initial host. The host is identified by `hostSessionId` in the room state.

### Host Migration

If the host disconnects, a new host is automatically assigned from the remaining players. Behaviors can listen for this change:

```ts
// Add a listener for host changes
const token = multiplayerState.addOnHostChangedListener(() => {
    console.log("Host changed. Am I the new host?", multiplayerState.isHost());
});
```

Any client can check if it is the current host:

```ts
if (this.multiplayerState?.isHost()) {
    // Only the host runs this logic
}
```

## Synchronized Data

### Transform Synchronization

Object transforms (position, rotation, scale) are synchronized with debouncing to avoid flooding the network with minor changes:

| Transform | Debounce Threshold | Meaning |
|-----------|-------------------|---------|
| **Position** | `0.01` units | Movements smaller than 1 centimeter are not sent |
| **Rotation** | `0.5` degrees | Rotations smaller than half a degree are not sent |
| **Scale** | `0.01` units | Scale changes smaller than 1% are not sent |

When a client updates an object's position, rotation, or scale through the physics system, the change is sent only if it exceeds the debounce threshold. The updated state is then broadcast to the other clients in the room.

### Behavior Data

Behaviors can store and synchronize key-value data through `BehaviorDataStorage`. This data is organized per object, per behavior:

```
behaviorData
  -> objectUuid
    -> behaviorId
      -> key: value (string)
      -> key: value (string)
```

The host typically writes behavior data, and other clients read it and respond in `onStateUpdated`. See [Multiplayer Scripting](02-multiplayer-scripting.md) for details.

### Player Data

Each player has a `data` map for custom key-value pairs. This is useful for per-player state like selected character, team assignment, or custom stats.

### Animations

Animation changes are synchronized per object. When a client changes an object's animation, the change is broadcast and all other clients play the same animation with crossfade transitions.

## Player Spawning And Management

### How Players Join

1. A player connects to the room.
2. A `Player` entry is added to `room.state.players`.
3. Once the player's UUID is assigned, their character object is cloned from the template.
4. The cloned object is added to the scene with the assigned UUID.
5. Remote player animations are initialized from the template model.

### Player Removal

When a player disconnects:

1. Their `Player` entry is removed from `room.state.players`.
2. Their game object is removed from all other clients' scenes.
3. Animation mixers and player object references are cleaned up.

### Player Slots

Each player receives a unique **slot** number (0 to max_clients). Slots can be used for:

- Team assignment
- Color coding
- Spawn point selection
- Any logic that needs a unique per-player index

### Listeners

You can listen for player events:

```ts
// Player joined
multiplayerState.addOnPlayerAddedListener((player) => {
    console.log("Player joined:", player.name);
});

// Player left
multiplayerState.addOnPlayerRemovedListener((player) => {
    console.log("Player left:", player.name);
});

// Player data changed
multiplayerState.addOnPlayerDataChangedListener((player, key) => {
    console.log(`${player.name} changed ${key}`);
});
```

## Room Capacity

The default maximum is **4 players per room**. This can be configured in the project settings.

When a player tries to join and all rooms are full, they see a waiting queue UI. They join the next available room when a slot opens.

## Enabling Multiplayer

### In Project Settings

1. Click the scene background to deselect all objects.
2. Open the **Settings** tab in the right panel.
3. Find the **Multiplayer** section.
4. Enable multiplayer.
5. Configure the maximum number of players.

### What Changes When Multiplayer Is Enabled

When multiplayer is on:

- Physics runs in the shared multiplayer simulation instead of locally on each client
- Behaviors receive `onStateUpdated` callbacks when synced data changes
- The host runs authoritative logic
- Player objects are cloned and synchronized across all clients
- Object transforms are debounced before being synchronized to the room

When multiplayer is off:

- Physics runs locally
- No network traffic
- Single-player only

## Private Rooms

You can create private rooms with invite codes:

```ts
// Create a private room
const room = await multiplayerState.createPrivateRoom("My Game Room");
// room.inviteCode -> share this with friends

// List your private rooms
const rooms = await multiplayerState.getPrivateRooms();

// Get info about a room
const info = await multiplayerState.getRoomInfo(inviteCode);

// Delete a private room
await multiplayerState.deletePrivateRoom(inviteCode);
```

## Chat

Multiplayer includes a built-in chat system:

```ts
// Send a message
multiplayerState.sendChatMessage("Hello everyone!");

// Listen for messages
multiplayerState.addOnChatMessageReceivedListener(
    (messageId, senderId, message, filtered, timestamp) => {
        console.log(`${senderId}: ${message}`);
    }
);
```

Messages are filtered for content moderation.

## Connection And Reconnection

### Disconnection Detection

The system uses heartbeat messages to detect paused hosts and disconnected clients.

```ts
// Listen for disconnection
multiplayerState.addOnClientDisconnectedListener((consented) => {
    if (consented) {
        console.log("Player left intentionally");
    } else {
        console.log("Player lost connection");
    }
});
```

### Reconnection

Players can reconnect to an existing room:

```ts
await multiplayerState.reconnect(inviteCode);
```

## Things To Know

- StemStudio manages room creation, synchronization, and host migration automatically.
- The current multiplayer implementation uses Colyseus rooms for synchronization.
- All state changes flow through the room. Clients do not communicate directly with each other.
- Physics in multiplayer mode runs in the shared multiplayer simulation, not independently on each client.
- Large numbers of synchronized objects can increase bandwidth. Keep synchronized object counts reasonable.
- Behavior data values are stored as strings. Serialize complex data with `JSON.stringify`.
- Players must be signed in to join multiplayer rooms.

## Next Steps

- Read [Multiplayer Scripting](02-multiplayer-scripting.md) to learn how to write behaviors that work correctly in multiplayer.
- Read [Behaviors vs Lambdas](../scripting/01-behaviors-vs-lambdas.md) to understand how behaviors fit into the scripting model.
- Read [Communication Patterns](../scripting/04-communication-patterns.md) for event-based patterns that complement multiplayer sync.
