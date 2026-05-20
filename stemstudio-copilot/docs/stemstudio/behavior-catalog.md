# Behavior Catalog

Built-in behavior packs in `web/src/behaviors/packs/`.

## Full Catalog

| Pack ID | Display Name | Category | Description | Key Attributes |
|---------|-------------|----------|-------------|----------------|
| `aiNpc` | AI NPC | AI/NPC | AI-powered NPC with voice/text conversations, autonomous behavior, physical interactions, and personality customization | `npc_profile`, `voice_id`, `range`, `walkSpeed`, `runSpeed`, `roamDistance`, `environment`, `groups` |
| `animation` | Animation | Animation & VFX | Play and control model animations with loop, speed, and trigger options | `startOnTrigger`, `animation`, `loop`, `speed` |
| `billboard` | Billboard | Display/Media | Display images, webpages, or YouTube videos on mesh with camera-facing and occlusion detection | `billboardMode`, `faceCamera`, `transparent`, `twoSided`, `assetFile`, `urlLink`, `loop` |
| `character` | Character | Movement | Core player character controller with walking, running, jumping, climbing, crouching, camera control, and multiplayer support | `isDefault`, `health`, `walkSpeed`, `runSpeed`, `jumpHeight`, `climbSpeed`, `maxSlope`, `lookSpeed`, `autoForward` |
| `consumable` | Consumable | Interactive | Collectible items that grant score, health, ammo, shield, money, speed, scale, or jump boosts | `inventoryType`, `pointAmount`, `healthAmount`, `ammoAmount`, `shieldAmount`, `moneyAmount`, `speedAmount`, `timeToShowAgain` |
| `csm` | Cascaded Shadow Maps | Environment | Advanced shadow rendering with cascaded shadow maps at varying distances from the camera | `fade`, `mode`, `cascades`, `lightMargin` |
| `dayNightCycle` | Day Night Cycle | Environment | Realistic atmospheric day-night cycle with sun rotation and sky appearance updates | `enableDayNightCycle`, `initialTimeHours`, `rotationSpeed`, `isPaused` |
| `enableDisable` | Enable/Disable | Game Mechanics | Activate, deactivate, or toggle objects and their behaviors at runtime via triggers | `startOnTrigger`, `action`, `targetType`, `targetObject`, `targetObjectBehaviors` |
| `enemy` | Enemy | AI/NPC | AI-driven enemy with state-based behavior, combat mechanics, weapons, detection, and multiplayer sync | `enemyType`, `weapon`, `health`, `movementSpeed`, `attackDamage`, `attackDistance`, `attackSpeed`, `roamDistance`, `respawnAmount` |
| `follow` | Follow | Movement | Smoothly follow and track a target object with configurable distance and speed | `startOnTrigger`, `followTargetUuid`, `distance`, `speed`, `rotate` |
| `genericSound` | Generic Sound | Audio | Spatial audio playback system with positional sound, volume control, and event triggers | `startOnTrigger`, `soundFile`, `positional`, `rolloffFactor`, `looping`, `autoPlay`, `volume` |
| `image_billboard` | Image Billboard | Display/Media | Display images from URLs or project library on mesh with scaling and fitting options | `external_url`, `internal_url`, `useLocalFile`, `rotate`, `aspect`, `fit` |
| `jointFixed` | Fixed Joint | Physics | Rigidly connects two physics-enabled objects, preventing any relative motion | `objectB`, `collisionEnabled` |
| `jointHinge` | Hinge Joint | Physics | Single-axis rotational constraint (door hinge, wheel axle) with optional motor and angular limits | `objectB`, `collisionEnabled`, `axis`, `angularLimitEnabled`, `angularLimit`, `motorEnabled`, `motorSpeed`, `motorTorque` |
| `jointPoint2Point` | Point-to-Point Joint | Physics | Ball-and-socket joint connecting two objects at specific pivot points | `objectB`, `collisionEnabled`, `pivotA`, `pivotB` |
| `jumppad` | Jump Pad | Interactive | Physics-based launcher that applies impulse forces on collision with configurable strength and angle | `strengthMode`, `strength`, `maxStrength`, `enableAngle`, `angleMode`, `angle` |
| `navmesh` | NavMesh | Navigation | Navigation mesh generator using Recast with pathfinding services for AI agents | `enabled`, `cellSize`, `cellHeight`, `agentHeight`, `agentRadius`, `agentMaxClimb`, `agentMaxSlope`, `autoGenerate` |
| `navmesh-connection` | NavMesh Connection | Navigation | Off-mesh connections for AI agents to traverse gaps, ledges, and teleporters between NavMesh areas | `enabled`, `targetObject`, `bidirectional`, `radius`, `showConnection` |
| `npc` | NPC | AI/NPC | Simplified non-hostile NPC with basic roaming, idle behaviors, and health | `movementType`, `health`, `movementSpeed`, `roamDistance`, `engageDistance` |
| `objectInteractions` | Object Interactions | Interactive | Player actions for picking up, dropping, pushing, pulling, and inventorying objects | `pickUp`, `drop`, `push`, `pull`, `placeInInventory` |
| `platform` | Platform | Movement | Animated kinematic platform for moving floors, elevators, and transport surfaces with tween-based motion | `startOnTrigger`, `move`, `speed`, `loopMode` |
| `randomizedSpawner` | Randomized Spawner | Game Mechanics | Weighted random spawn system for prefabs based on probability percentages | `startOnTrigger`, `multipleSpawn`, `randomList` |
| `shop` | Shop | Game Mechanics | Interactive HTML-based shop interface with items, prices, and payment support | `shopImage`, `introDialog`, `items` |
| `skybox` | Skybox | Environment | Configures mesh objects as skyboxes by disabling physics, shadows, and making materials transparent | _(none)_ |
| `spawn` | Spawn | Game Mechanics | Instantiates a target object at the spawner's location by moving or cloning | `startOnTrigger`, `objectUuidToSpawn`, `spawnType` |
| `spawnpoint` | Spawn Point | Game Mechanics | Marks player spawn locations with slot assignment and spawn type | `slot`, `spawnType` |
| `teleport` | Teleport | Interactive | Instant player transportation to a target location on collision | `teleportTargetUuid` |
| `terrain` | Terrain | Environment | Endless procedural terrain using Perlin noise with multi-layer texturing, object placement, and physics | `isEndlessTerrain`, `useGPU`, `maxHeight`, `seed`, `grassMaxHeight`, `rockMaxHeight` |
| `touchControls` | Touch Controls | Input | Mobile touch input with joysticks, buttons, and steering wheels; adapts to device type and orientation | `mobileEnabled`, `tabletEnabled`, `desktopEnabled`, `editorLayoutPreview`, `editorLayoutOrientation` |
| `trigger` | Trigger | Game Mechanics | Conditional trigger system that activates/deactivates behaviors based on player interaction, collision, or key presses | `if_condition`, `then_steps`, `else_steps` |
| `tween` | Tween Animation | Animation & VFX | Smooth interpolation of position, rotation, and scale with 20+ easing functions and loop modes | `startOnTrigger`, `move`, `rotate`, `scale`, `speed`, `easing`, `loopMode` |
| `video_billboard` | Video Billboard | Display/Media | Video playback on mesh surfaces with autoplay, loop, proximity activation, and volume control | `startOnTrigger`, `external_url`, `internal_url`, `autoplay`, `loop`, `proximity`, `volume`, `muted` |
| `visualEffect` | Visual Effect | Animation & VFX | GPU-accelerated particle effects using three.quarks with event-driven triggering | `startOnTrigger`, `triggerOnAdded`, `triggerByParent`, `restartOnTrigger`, `triggerEvents`, `stopEvents` |
| `volume` | Volume | Interactive | Collision volume zones that trigger game events: kill, win, lose, damage, blocking, and custom | `startOnTrigger`, `volumeOptions` |

## By Category

### Movement
- **character** — Core player character controller: walking, running, jumping, climbing, crouching, falling. Auto-configures capsule physics. Integrated third-person camera. Supports multiplayer and avatar swapping.
- **follow** — Follow a target object with configurable speed, distance, and optional rotation tracking.
- **platform** — Animated kinematic platforms (elevators, moving floors) with tween-based movement, configurable speed, and loop modes.

### AI / NPC
- **aiNpc** — Advanced AI-powered NPC with LLM-driven voice/text conversations, autonomous behavior (roaming, idle), physical actions (pick up, navigate, gesture), personality profiles, and contextual awareness.
- **npc** — Simplified non-hostile NPC with roaming or stationary idle behavior, health, and configurable animations.
- **enemy** — AI-driven enemy with melee/ranged combat, state-based behavior (idle, patrol, chase, attack), weapon selection, detection ranges, health, respawning, and multiplayer sync.

### Interactive
- **consumable** — Collectible items granting score, health, ammo, shield, money, speed boosts, scale changes, or jump boosts. Configurable respawn timing and bounding box detection.
- **jumppad** — Physics-based launcher with configurable strength modes (fixed, random, velocity-based) and angle control for directional launching.
- **objectInteractions** — Enable pick up, drop, push, pull, and inventory placement actions on objects.
- **teleport** — Instantly transport the player to a target object's position and rotation on collision.
- **volume** — Collision trigger zones: Kill Volume, Win Volume, Lose Volume, Damage Zone, Blocking Volume, and Custom events.

### Game Mechanics
- **trigger** — Conditional if/then/else system linking player interactions, collisions, or key presses to behavior activation/deactivation chains.
- **spawn** — Clone or move objects to the spawner location on collision or trigger events.
- **spawnpoint** — Mark player spawn locations with slot numbers and spawn type configuration.
- **randomizedSpawner** — Spawn prefabs from a weighted probability list, triggered by collision or events.
- **shop** — Interactive HTML-based shop with configurable items, prices, images, and dialog.
- **enableDisable** — Runtime toggling of objects and their behaviors with activate, deactivate, and toggle actions.

### Animation & VFX
- **animation** — Play model animation clips with loop, speed (0-100x), and trigger-based start control. Supports frustum culling and distance throttling.
- **tween** — Programmatic position/rotation/scale interpolation with 20+ easing functions, configurable speed, and loop modes (once, loop, ping-pong).
- **visualEffect** — GPU-accelerated particle effects (three.quarks) triggered by game events, with parent-relative positioning and custom event support.

### Display / Media
- **billboard** — Display images, YouTube videos, or embedded webpages on mesh surfaces. Camera-facing with occlusion detection and smart visibility.
- **image_billboard** — Static image display from URL or project library with rotation, aspect ratio, and fit options.
- **video_billboard** — Video playback on mesh with autoplay, loop, proximity-based activation, volume, and mute controls.

### Physics
- **jointFixed** — Fixed constraint rigidly connecting two physics objects with no relative motion allowed.
- **jointHinge** — Hinge joint (door, axle) with optional angular limits and motorized rotation.
- **jointPoint2Point** — Ball-and-socket joint connecting two objects at configurable pivot points.

### Environment
- **csm** — Cascaded shadow mapping with configurable cascade count, light margin, and fade options.
- **dayNightCycle** — Animated sun rotation and atmospheric scattering cycle with configurable time, speed, and pause.
- **skybox** — Configure mesh as skybox background by disabling physics, shadows, and enabling transparency.
- **terrain** — Procedural endless terrain with Perlin noise height maps, multi-layer texturing, GPU acceleration, and physics integration.

### Audio
- **genericSound** — Spatial audio playback with positional rolloff, looping, autoplay, volume control, and event-triggered activation.

### Input
- **touchControls** — Mobile/tablet/desktop on-screen touch controls with joysticks, buttons, and device-adaptive layouts.

### Navigation
- **navmesh** — Generate navigation meshes from scene geometry using Recast. Configurable cell size, agent dimensions, and auto-generation.
- **navmesh-connection** — Off-mesh links between NavMesh areas for AI traversal of gaps, ledges, and teleporters. Supports bidirectional connections.

## Common Combinations

| Use Case | Behaviors |
|----------|-----------|
| Playable character | `character` + `animation` + `spawnpoint` |
| Third-person game | `character` + `animation` + camera follow (built into character) |
| Enemy AI | `enemy` + `animation` + `navmesh` |
| AI companion/quest NPC | `aiNpc` + `animation` + `navmesh` |
| Collectibles | `consumable` + optional `visualEffect` |
| Moving platform | `platform` + physics enabled on platform |
| Trigger zone | `volume` (Kill/Win/Lose) or `trigger` + target behavior |
| NPC dialog | `npc` or `aiNpc` + `animation` |
| Projectile launcher | `spawn` + physics + `trigger` |
| In-game shop | `shop` + `trigger` or proximity detection |
| Day/night world | `dayNightCycle` + `skybox` + `csm` |
| Video screen | `video_billboard` or `billboard` (YouTube mode) |
| Physics door | `jointHinge` + `trigger` |
