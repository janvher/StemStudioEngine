/**
 * Extracts and caches a compact engine API reference from stem-types.d.ts.
 * Injected into the system prompt to prevent API hallucination.
 *
 * Rather than parsing the full 5600-line file dynamically, we provide a
 * curated summary of the critical interfaces the agent needs when writing
 * behavior code. This keeps the token cost predictable (~1500 tokens).
 */

import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('type-context');

let cachedTypeContext: string | undefined;

/** Well-known search paths for stem-types.d.ts (Docker + local dev) */
const STEM_TYPES_PATHS = [
    path.resolve('stem-types.d.ts'),                          // project root
    path.resolve(import.meta.dirname, '../../../stem-types.d.ts'), // from dist/
    path.join(process.env.HOME || '~', '.standalone/stem-types.d.ts'),  // Docker install
];

/**
 * Build a compact engine API reference string for system prompt injection.
 * Returns undefined if stem-types.d.ts is not available.
 */
export function getTypeContextSection(): string | undefined {
    if (cachedTypeContext !== undefined) return cachedTypeContext || undefined;

    // Try to read stem-types.d.ts for dynamic extraction
    let raw: string | undefined;
    for (const p of STEM_TYPES_PATHS) {
        try {
            raw = fs.readFileSync(p, 'utf-8');
            log.info(`Loaded stem-types.d.ts from ${p}`);
            break;
        } catch { /* try next */ }
    }

    // Build the curated reference — augmented with dynamic extraction when available
    cachedTypeContext = buildCuratedReference(raw);
    return cachedTypeContext || undefined;
}

/**
 * Build the curated reference. If raw file is available, extract method
 * signatures dynamically; otherwise fall back to the static summary.
 */
function buildCuratedReference(raw?: string): string {
    // Extract IPhysics methods dynamically if file is available
    let physicsMethods = STATIC_PHYSICS_METHODS;
    let gameManagerProps = STATIC_GAMEMANAGER_PROPS;
    if (raw) {
        const extracted = extractInterfaceMethods(raw, 'IPhysics');
        if (extracted.length > 0) physicsMethods = extracted;
        const gmExtracted = extractClassMembers(raw, 'GameManager');
        if (gmExtracted.length > 0) gameManagerProps = gmExtracted;
    }

    return `## Engine API Reference (do NOT invent methods not listed here)

### IPhysics (access via \`game.physics\`)
${physicsMethods.map(m => `- ${m}`).join('\n')}

### GameManager (capture in \`init(_game)\` as closure variable \`game\`)
${gameManagerProps.map(m => `- ${m}`).join('\n')}

### Behavior Lifecycle (your code extends this)
- init(_game: GameManager): called first, target NOT set yet. Use closure capture: \`let game;\` at behavior scope, then \`game = _game;\` in init.
- onStart(): target is set, safe to access \`this.target\`. Good place to cache \`let target = this.target;\`. Can be async.
- update(deltaTime: number): every frame, variable timestep. Use for visual logic.
- fixedUpdate(fixedDeltaTime: number): fixed timestep (~60Hz). Use for physics logic.
- onEvent(msg: string, data: any): EventBus messages.
- onReset(): game restart.
- onPaused() / onResumed(): pause state changes.
- onAttributesUpdated(): when config changes at runtime.
- getAttribute(key): read a single attribute.
- requestAttributeChange(key, value): change an attribute.
- onStop(): cleanup work before detach/reset if needed.
- Prefer \`this.erth.behaviors.find(target, id)\` and \`this.erth.behaviors.findAll(id)\` for cross-behavior queries.
- dispose(): MUST clean up listeners, timers, subscriptions, temporary objects, and GPU resources.

### Globals Available in Behaviors
- THREE (Three.js namespace)
- EventBus (pub/sub messaging, but prefer \`game.behaviorManager.sendEventToObjectBehaviors(...)\` over \`EventBus.send(...)\`)
- Ammo (Ammo.js physics — but prefer this.game.physics API)
- CSS3DObject (for 3D CSS elements)
- UIKit (for in-game UI panels)
- Do NOT use ES module imports. Do NOT use document.addEventListener.

### Lambda Lifecycle (ECS data components)
- init(game): setup
- update(deltaTime): per-frame logic for all registered objects
- onObjectAdded(target, componentData): object registration
- onObjectRemoved(target): deregistration
- getComponentData(target): per-object data
- setComponentData(target, key, value): update per-object data
- dispose(): cleanup

### Common Mistakes to Avoid
- ❌ game.physics.applyForce() → ✅ game.physics.applyCentralImpulse(uuid, impulse)
- ❌ game.animation.play() → ✅ game.animationController.playBlendedAnimations()
- ❌ document.addEventListener('keydown') → ✅ documented \`game.inputManager\` methods such as \`getAction()\`, \`getMotion()\`, \`getMouseTouchPosition()\`
- ❌ game.inputManager.isKeyDown('w') → ✅ configured input bindings + \`getAction()\` / \`getMotion()\`
- ❌ this.game = game → ✅ \`let game;\` at scope + \`game = _game;\` in \`init(_game)\`
- ❌ import { Thing } from 'module' → ✅ Use globals (THREE, EventBus, etc.)
- ❌ this.object → ✅ this.target (the 3D object this behavior is attached to)
- ❌ this.physics → ✅ game.physics
- ❌ this.findBehavior(id, target) → ✅ this.erth.behaviors.find(target, id)
- ❌ this.findBehaviors(id) → ✅ this.erth.behaviors.findAll(id)
- ❌ EventBus.send(target, 'msg') → ✅ game.behaviorManager.sendEventToObjectBehaviors(target, 'msg', data)

### Vehicle Physics (VehicleSpec, VehicleWheelSpec, VehicleInput, VehicleOptions)
- Use game.physics.addVehicleObject(uuid, spec, options) to create a vehicle.
- VehicleSpec defines chassis + wheels array. VehicleWheelSpec defines per-wheel config.
- VehicleInput: { throttle: number, steer: number, brake: number }
- VehicleOptions: mass, suspension, friction, engine/brake forces, steer angle, deadzones.
- moveVehicleObject(uuid, input) drives the vehicle each frame.
- removeVehicleObject(uuid) cleans up.`;
}

/** Extract method signatures from an interface block */
function extractInterfaceMethods(source: string, interfaceName: string): string[] {
    const regex = new RegExp(`interface ${interfaceName}\\s*\\{([\\s\\S]*?)^\\}`, 'm');
    const match = source.match(regex);
    if (!match) return [];

    const body = match[1];
    const methods: string[] = [];
    const methodRegex = /^\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+)/gm;
    let m;
    while ((m = methodRegex.exec(body)) !== null) {
        const [, name, params, returnType] = m;
        // Skip deprecated, internal, and multiplayer-specific methods
        if (name.startsWith('_') || name === 'simulate' || name === 'initDebug' || name === 'ping'
            || name === 'setCurrentAnimation' || name === 'addOtsShiftVector') continue;
        methods.push(`${name}(${params.replace(/\s+/g, ' ').trim()}): ${returnType.trim()}`);
    }
    return methods;
}

/** Extract class members (properties + methods) */
function extractClassMembers(source: string, className: string): string[] {
    const regex = new RegExp(`class ${className}\\s*\\{([\\s\\S]*?)^\\}`, 'm');
    const match = source.match(regex);
    if (!match) return [];

    const body = match[1];
    const members: string[] = [];

    // Properties
    const propRegex = /^\s+(\w+)\s*:\s*([^;]+)/gm;
    let m;
    while ((m = propRegex.exec(body)) !== null) {
        const [, name, type] = m;
        // Only include game-relevant properties
        if (['physics', 'inputManager', 'pointerEventManager', 'animationController',
            'animationGraphController', 'audioController', 'objectPicker', 'player',
            'scene', 'camera', 'collisionDetector', 'behaviorManager', 'lambdaManager',
            'prefabManager', 'hud', 'cameraType', 'isMultiplayer'].includes(name)) {
            members.push(`${name}: ${type.trim()}`);
        }
    }

    // Key methods
    const methodRegex = /^\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*:\s*([^;{]+)/gm;
    while ((m = methodRegex.exec(body)) !== null) {
        const [, name, params, returnType] = m;
        if (['setPlayer', 'addBehaviorToObject', 'removeBehaviorByUUID', 'updateBehaviorAttributes',
            'addObject', 'removeObject', 'cloneObject', 'loadSounds', 'playSound', 'stopSound',
            'reset', 'playBlendedAnimations', 'updateBlendedAnimationWeights'].includes(name)) {
            members.push(`${name}(${params.replace(/\s+/g, ' ').trim()}): ${returnType.trim()}`);
        }
    }
    return members;
}

// ─── Static Fallbacks ──────────────────────────────────────────────────────

const STATIC_PHYSICS_METHODS = [
    'applyCentralImpulse(uuid: string, impulse: Vector3): void',
    'applyImpulseToRigidBody(uuid: string, impulse: Vector3, relativePosition: Vector3): void',
    'setLinearVelocity(uuid: string, velocity: Vector3): void',
    'setOrigin(uuid: string, position: Vector3Like): void',
    'setRotation(uuid: string, quaternion: QuaternionLike): void',
    'addPlayerObject(uuid: string, useController: boolean, options?: IPlayerOptions): Promise<Object3D | null>',
    'removePlayerObject(uuid: string): void',
    'movePlayerObject(uuid: string, walkDirection: Vector3, jump: boolean): void',
    'setPlayerGravity(uuid: string, acceleration: Vector3Like): void',
    'setPlayerPosition(uuid: string, position: Vector3): void',
    'applyImpulseToPlayer(uuid: string, impulse: Vector3): void',
    'addCollidableObject(uuid: string): void',
    'removeCollidableObject(uuid: string): void',
    'detectCollisionsForObject(uuid: string, registration: CollisionRegistration, enable: boolean): void',
    'setCollisionBehavior(uuid: string, behavior: CollisionBehavior): void',
    'getGravity(): number',
    'addBody(object: Object3D, shapeUuid: string, data: CommonData): void',
    'addBox(object: Object3D, data: BoxData): void',
    'addSphere(object: Object3D, data: SphereData): void',
    'addCapsuleShape(object: Object3D, data: CapsuleData): void',
    'addConvexHull(object: Object3D, data: ConvexHullData): void',
    'addFixedJoint(...): void',
    'addHingeJoint(...): void',
    'addPoint2PointJoint(...): void',
    'removeJoint(uuidA: string, uuidB: string): void',
    'remove(uuid: string): void',
    'addVehicleObject(vehicleUuid: string, spec: VehicleSpec, options: VehicleOptions): Promise<void>',
    'removeVehicleObject(vehicleUuid: string): void',
    'moveVehicleObject(vehicleUuid: string, input: VehicleInput): void',
];

const STATIC_GAMEMANAGER_PROPS = [
    'physics: IPhysics',
    'inputManager: InputManager<PlayerActions>',
    'pointerEventManager: PointerEventManager',
    'animationController: AnimationController',
    'animationGraphController: AnimationGraphController',
    'audioController: AudioController',
    'objectPicker: IObjectPicker',
    'collisionDetector: CollisionDetector',
    'behaviorManager: BehaviorManager',
    'lambdaManager: LambdaManager',
    'prefabManager: PrefabManager',
    'hud: HUDManager',
    'player: THREE.Object3D | null',
    'scene: THREE.Scene',
    'camera: THREE.Camera',
    'cameraType: CAMERA_TYPES',
    'isMultiplayer: boolean',
    'setPlayer(player: Object3D | undefined): void',
    'addBehaviorToObject(target: Object3D, behaviorId: string, options?): Promise<Behavior>',
    'removeBehaviorByUUID(uuid: string): Behavior | null',
    'updateBehaviorAttributes(uuid: string, updatedProperties: Record<string, any>): Behavior | null',
    'addObject(object: Object3D, parent?: Object3D): Promise<void>',
    'removeObject(object: Object3D): void',
    'cloneObject(sourceObject: Object3D): Object3D | null',
    'loadSounds(sounds: ISoundSettings[]): void',
    'playSound(soundId: string): void',
    'stopSound(soundId: string): void',
    'reset(): void',
    'playBlendedAnimations(object: Object3D, blends: BlendedAnimationParams[], playOnce?: boolean): void',
    'updateBlendedAnimationWeights(object: Object3D, weights: {[name: string]: number}): void',
];
