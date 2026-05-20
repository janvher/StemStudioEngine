# Test Prompts — StemStudio Copilot Skills

A collection of test prompts for verifying each AI agent skill. Each prompt assumes an empty or minimal project, so where needed it includes instructions to add required objects first.

> **Usage:** Paste the prompt directly into the Copilot chat in StemStudio.

---

## 1. stemstudio-scene — Scene Inspection

```
Tell me what is currently in the scene. List all objects with their positions and properties.
```

```
First add three cubes at different positions (e.g. (-3,0,0), (0,0,0), (3,0,0)), then find the object named "Cube" and give me its exact properties.
```

```
What object is currently selected in the editor?
```

---

## 2. stemstudio-objects — Object Creation and Modification

```
Create a red box of size 2x2x2 at position (0, 1, 0) and name it "RedCube".
```

```
Create 5 objects at once: a floor (plane 20x20 at y=0) and 4 walls (box 1x4x20) around it forming a closed room.
```

```
Create a sphere at position (0, 5, 0), then clone it 3 times and place the clones every 3 units along the X axis.
```

```
Create a group named "Furniture", then add two objects to it: a table (box 2x0.1x1 at y=1) and a chair (box 0.5x1x0.5 at y=0.5 offset by (1.5, 0, 0)).
```

```
Create a torusKnot in the center of the scene as decoration, set it at position (0, 2, 0) with scale (1.5, 1.5, 1.5).
```

---

## 3. stemstudio-materials — Materials and Textures

```
Create a sphere at position (0, 1, 0), then set its material to metallic gold (color #FFD700, metalness 0.9, roughness 0.1).
```

```
Create a floor (plane 10x10), then apply a wood texture from Polyhaven (wood or floor).
```

```
Create a wall (box 5x3x0.2), apply a brick texture with a normal map — search Polyhaven for a "brick wall" texture.
```

```
Create a sphere and set its material to semi-transparent blue (color #0000FF, opacity 0.4).
```

---

## 4. stemstudio-assets — Model Import and Assets

```
Find a tree model and add it to the scene at position (0, 0, 0). Search local assets first, then external.
```

```
Find a car model from external sources (Sketchfab or Polyhaven) and add it to the scene at position (5, 0, 5).
```

```
Generate a 3D model of a treasure chest and place it in the scene.
```

```
Find a sword model and add it to the scene. Set it at position (2, 1, 0) and rotate it 45 degrees along the Y axis.
```

---

## 5. stemstudio-atmosphere — Lighting and Atmosphere

```
Set up an atmosphere suitable for a horror game: dark background, dense grey fog, cold lighting.
```

```
Create a sunset scene: change the background to an orange-red gradient, add warm ambient lighting, light exponential fog.
```

```
Set lighting and atmosphere for a sci-fi game: dark background with a navy tint, bloom, ambient occlusion.
```

```
Enable post-processing: ambient occlusion and bloom on the scene. Then check the result and adjust the intensity.
```

```
Change tone mapping to ACESFilmic and set the scene background to color #1a1a2e (dark violet).
```

---

## 6. stemstudio-camera — Camera

```
Set the camera to THIRD_PERSON mode with distance 8, minimum 4, maximum 15. Configure it for an RPG game.
```

```
Switch the camera to FIRST_PERSON with head height 1.7 and FOV 80 degrees. Configure it for an FPS shooter.
```

```
Set the camera to TOP_DOWN for a strategy game. Lock rotation and set a fixed height.
```

```
Configure the camera to SIDE_SCROLLER for a 2.5D platformer game with movement constrained to the X axis.
```

---

## 7. stemstudio-project-settings — Project Settings

```
Enable game mode, set 3 lives for the player, enable the scoring system, and add a timer counting down from 120 seconds.
```

```
Enable multiplayer for 2-4 players. Disable the HUD and enable voice chat.
```

```
Set rendering quality to high: enable shadows, set shadow map size to 2048, enable instancing.
```

```
Enable sandbox mode (no win/lose conditions) and disable avatar usage.
```

---

## 8. stemstudio-behaviors — Object Behaviors

```
Create a box at position (0, 2, 0) and add a behavior that makes it continuously rotate along the Y axis at 1 rad/s.
```

```
Create a sphere and list all available behaviors in the "movement" or "player" category.
```

```
Create a box and write a behavior that makes it pulse (change scale) between 0.8 and 1.2 in a sinusoidal rhythm.
```

```
Create an object named "Enemy" and inspect the schema of the playerMovement behavior — I want to know what configuration parameters it has.
```

```
Create two objects: "Collector" and "Collectible". Add a behavior to Collectible that makes it slowly float up and down (hover effect).
```

---

## 9. stemstudio-physics — Physics

```
Create a sphere at position (0, 10, 0), enable physics for it as a Dynamic body with mass 5 and restitution 0.8 — it should bounce after falling.
```

```
Create a floor (plane 20x20) as a Static body with physics, then create 10 spheres above it and enable Dynamic physics so they fall.
```

```
Create a capsule, enable physics for it as a Dynamic body, lock rotation on the X and Z axes (for a player character).
```

```
Create a wall (box 0.2x3x5) as a Static body. Set friction to 0.9 and restitution to 0.0 (no bounce).
```

---

## 10. stemstudio-vfx — Visual Effects

```
Create a fire effect at position (0, 0, 0) — search the VFX library for a "fire" or "flame" effect, if none exists create a simple particle emitter.
```

```
Create a sphere and attach an explosion VFX effect to it.
```

```
Create a smoke effect rising from position (2, 0, 2). Use the VFX library or create a new effect.
```

```
Create a floor and add a ground fog or dust effect to it. Then modify the particle color to blue.
```

---

## 11. stemstudio-prefabs — Prefabs

```
Create a red box, then convert it into a prefab named "RedBlock". Then spawn 5 instances of this prefab at different positions.
```

```
List all available prefabs in the project. Then spawn one instance of the first prefab found.
```

```
Create a prefab "Enemy" from a sphere with a red material, then spawn 3 instances at positions (-4,0,0), (0,0,-4), (4,0,0). Each instance should have a different scale.
```

---

## 12. stemstudio-eventbus — EventBus (Behavior-to-Behavior Communication)

```
Create two objects: "Player" and "ScoreDisplay". Write a behavior for Player that publishes the event "player:jumped" via EventBus when Space is pressed. Write a behavior for ScoreDisplay that subscribes to that event and logs "Player jumped!" to the console.
```

```
Create a "GameManager" object with a behavior that publishes the event "game:tick" with the current timestamp every 5 seconds. Create a second object "Logger" that subscribes to that event and logs the time.
```

```
Create a "Collectible" object with a behavior that publishes the event "item:collected" with payload {score: 10} when clicked. Create a "HUDManager" that subscribes to that event and logs the new score.
```

---

## 13. stemstudio-uikit — UI / HUD

```
Create a fullscreen HUD with a health bar in the top-left corner: a red bar whose width is proportional to the HP value (start at 100/100).
```

```
Create a world-space UI panel above a box object. The panel should show the text "Health: 100" with white text on a dark background.
```

```
Create a pause menu as a fullscreen overlay: dark semi-transparent background, title "PAUSE", and two buttons "Resume" and "Quit". Buttons should respond to hover (color change).
```

```
Create a HUD with a score counter in the top-right corner. Display text "Score: 0" in yellow. Then increment the score by 10 every second.
```

---

## 14. stemstudio-audio — Audio

```
Create an object "AmbientSound", find an ambient sound asset (forest, wind, ocean) and attach it as a looping ambient sound. Set volume to 0.5.
```

```
Create a sphere and add a positional (3D) sound "explosion" or similar to it. The sound should be louder when the camera is closer to the sphere.
```

```
Create a "MusicPlayer" object and write a behavior that plays background music when the game starts. Search for a music asset and apply it.
```

---

## 15. stemstudio-game-design — Game Design

```
I want to make a 2D platformer game with running and jumping. Plan the project structure for me: what objects, behaviors, camera, and physics are needed.
```

```
I want to make a simple FPS game where the player shoots at targets. Give me the step-by-step order to build this game and which Copilot skills I should use.
```

```
I already have a scene with several objects — how can I improve the "game feel"? Give me an improvement checklist for an action game.
```

---

## 16. stemstudio-game-engine — Engine API

```
Write a behavior for the "Player" object that uses GameManager.physics to apply an upward impulse when the player presses Space. Inspect the available API before writing.
```

```
Write a behavior that retrieves the camera service from GameManager and logs the current camera position every second.
```

```
Write a behavior that uses GameManager.audio to load and play the sound "click.mp3" when the object is clicked.
```

---

## 17. stemstudio-input-manager — Input

```
Write a behavior for the "Player" object that uses InputManager to handle WASD movement and Space to jump. Left/right should rotate the object.
```

```
Write a behavior that handles a mouse click (primary action) and logs the cursor position to the console.
```

```
Add a custom key binding: key "KeyE" as the action "interact". Then write a behavior that responds to that action.
```

---

## 18. stemstudio-lambdas — Lambda Data (ECS)

```
Design a Lambda data structure for a health system: HP, maxHP, armor, isInvincible. Explain how to connect it to a behavior.
```

```
Design a Lambda for player inventory: a list of items (max 10), currently selected item, currency. Show how to read and modify this data in a behavior.
```

```
Design a Lambda for an enemy NPC: patrolPoints (array of positions), currentPatrolIndex, alertLevel (0-3), lastKnownPlayerPosition.
```

---

## 19. stemstudio-threejs-geometry — Procedural Geometry

```
Write a behavior for an empty object that creates a custom 5-pointed star as a THREE.Shape with ExtrudeGeometry in onStart() and adds it to the scene.
```

```
Write a behavior that creates an InstancedMesh with 100 randomly placed trees (cylinder as trunk + sphere as crown) for performance optimization.
```

```
Write a behavior that creates a sine-wave mesh: a plane grid whose vertices move up and down like waves.
```

---

## 20. stemstudio-threejs-textures — Dynamic Textures

```
Write a behavior that dynamically loads a texture from a URL onto a box object. Load in onStart() and clean up in dispose().
```

```
Write a behavior that creates a Canvas Texture with dynamic text (e.g. current score "Score: 42") and applies it to a sphere. Update the text every second.
```

```
Write a behavior that implements a scrolling background effect (scrolling texture) — UV offset changes each frame to simulate movement.
```

---

## 21. stemstudio-threejs-loaders — Runtime Model Loading

```
Write a behavior for a "ModelSpawner" object that asynchronously loads a GLTF model from a URL and adds it to the scene in onStart(). Handle errors.
```

```
Write a behavior that loads a model with animations, extracts an AnimationMixer from it, and plays the first available animation in a loop.
```

```
Write a behavior that loads 3 GLB models in parallel and only adds them to the scene once all are ready.
```

---

## 22. stemstudio-threejs-shaders — Shaders

```
Write a behavior that applies a custom ShaderMaterial with a hologram effect to an existing object: blue, semi-transparent, with animated scan lines.
```

```
Write a behavior with a dissolve effect: the object gradually disappears based on a noise threshold. Use uniforms to control the progress.
```

```
Write a behavior that applies a wave displacement effect on a plane: the vertex shader moves vertices up based on sin(position.x + time).
```

```
Write a behavior with a Fresnel glow effect: objects glow at the edges when the camera looks from the side.
```

---

## 23. stemstudio-game-ui-design — UI Design

```
Design a HUD for an FPS game: what should be visible, where on the screen, what information priorities. Then implement it using UIKit.
```

```
Design UI for a tower defense game: a resource bar (gold), tower purchase buttons, a map with enemies. Suggest a layout and placement.
```

```
I have an RPG game. Design and implement an inventory screen as a fullscreen overlay with a 4x4 slot grid.
```

---

## 24. stemstudio-javascript-mastery — JS Patterns

```
Write a behavior that uses a State Machine to manage enemy states: Idle → Patrol → Chase → Attack → Dead. Implement transitions between states.
```

```
Write a behavior that uses WeakRef to reference another object (e.g. Player) without the risk of memory leaks. Handle the case where the object has been removed.
```

```
Write a behavior that uses memoization for an expensive computation (e.g. pathfinding heuristic). Cache the result and invalidate it only when the input changes.
```

---

## 25. stemstudio-web-research — Web Research

```
Search the internet for examples of mechanics for a bullet hell game (hail of bullets). What is key to this genre? What design patterns are used?
```

```
Find game feel inspirations in platformer games — what micro-effects (coyote time, jump buffering, squash & stretch) should be implemented?
```

```
Research how procedural dungeon generation systems work in roguelike games. Give me 3 different approaches with their pros and cons.
```

---

## 26. stemstudio-tools — Special Tools (Terrain, Water, Sky, etc.)

```
Create terrain in the scene with a basic configuration. Then add water to it at level y=0.
```

```
Add a day/night cycle controller to the scene. Set the cycle to 60 seconds and start at noon.
```

```
Create a billboard at position (0, 3, 0) displaying an image from a URL. Make it always rotate to face the camera.
```

```
Configure a navmesh for a scene with a floor and several obstacles (boxes). Then describe how to use the navmesh for pathfinding in a behavior.
```

---

## 27. stemstudio-copilot — Orchestration (Multi-skill Tasks)

```
Build a simple "Collect Coins" game from scratch: a floor, a player that moves, 10 coins to collect, a counter on the HUD, a coin collection sound, and a particle effect on collection.
```

```
Add a forest environment to the scene: terrain, trees (models or primitives), fog, greenish lighting. Optimize using instancing.
```

```
Build an FPS arena: floor, walls, boxes as cover, FPS camera, basic WASD + mouse movement, industrial atmosphere.
```

```
I have an empty scene. Do everything needed to get a working demo: the player can move, there is collision with the floor, the camera follows the player, there is a basic HUD.
```

---

## 28. stemstudio-input-manager + stemstudio-behaviors — Combo Test

```
Create a "Player" object (capsule), enable Dynamic physics, then write a behavior that: (1) reads movement from InputManager (WASD), (2) applies forces via physics, (3) allows jumping with Space only when standing on the ground.
```

---

## Regression Tests (Edge Cases)

```
Try to create an object with a special character name: "Chest". Then find it via scene inspection.
```

```
Create 20 cubes at once in a 4x5 grid, spaced 2 units apart. Use batch creation.
```

```
Create an object, set its material, attach a behavior, enable physics — all in a single instruction. The agent should execute this step by step.
```

```
Delete all objects from the scene at once using batch delete.
```
