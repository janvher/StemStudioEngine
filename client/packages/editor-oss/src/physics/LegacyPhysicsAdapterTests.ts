import { Object3D, Vector3 } from 'three';

import { COLLISION_TYPE } from '@stem/editor-oss/types/editor';
import { BodyShapeType, CollisionFlag } from './common/types';
import { LegacyPhysicsAdapter } from './LegacyPhysicsAdapter';
import { PhysicsEngine, RigidBodyType } from './PhysicsEngine';

/**
 * Tests `LegacyPhysicsAdapter`-specific responsibilities. The
 * underlying physics behavior (gravity, onGround, slopes, kinematic
 * platforms, shape scaling, etc.) is covered by the engine-facing
 * factories (`makePhysicsTests`, `makeCharacterControllerTests`,
 * `makeVehicleTests`). These tests focus on the adapter's translation
 * from the legacy `IPhysics` data shapes to the `PhysicsEngine`
 * primitive calls, dispatcher plumbing, collision-listener routing,
 * and vehicle visual binding.
 *
 * @example
 * describe('MyPhysicsImplementation', () => {
 *     makeLegacyPhysicsAdapterTests(makeMyPhysicsImplementation);
 * });
 *
 * @param makePhysics - A function that returns a promise for the physics engine
 */
export const makeLegacyPhysicsAdapterTests = (makePhysics: (gravity: number) => Promise<PhysicsEngine>) => {
    describe('LegacyPhysicsAdapter', () => {
        const commonData = {
            uuid: 'body1',
            template: '',
            name: 'Body1',
            position: { x: 0, y: 0, z: 0 },
            quaternion: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
            mass: 1,
            friction: 0.5,
            rollingFriction: 0.5,
            spinningFriction: 0.5,
            contactStiffness: 0.5,
            contactDamping: 0.5,
        };

        const dispatcher = {
            onBodyUpdate: vi.fn(),
            onCollision: vi.fn(),
            onReady: vi.fn(),
        };

        let physics: LegacyPhysicsAdapter;
        let engine: PhysicsEngine;

        beforeEach(async () => {
            vi.resetAllMocks();
            engine = await makePhysics(-9.81);
            physics = new LegacyPhysicsAdapter(engine, dispatcher);
        });

        afterEach(() => {
            physics.terminate();
        });

        const characterCalls = () =>
            dispatcher.onBodyUpdate.mock.calls.filter((c: any[]) => c[0] === 'character1');

        const onGroundSequence = (startIndex: number) =>
            characterCalls().slice(startIndex).map((c: any[]) => c[5]?.onGround === true);

        const countTransitions = (sequence: boolean[]) => {
            let count = 0;
            for (let i = 1; i < sequence.length; i++) {
                if (sequence[i] !== sequence[i - 1]) count++;
            }
            return count;
        };

        describe('shape helpers', () => {
            it('addBox registers the rigid body in the engine', () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'box1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                expect(engine.hasRigidBody('box1')).toBe(true);
            });

            it('addSphere registers the rigid body in the engine', () => {
                physics.addSphere(new Object3D(), { ...commonData, uuid: 'sphere1', type: BodyShapeType.SPHERE, radius: 1 });
                expect(engine.hasRigidBody('sphere1')).toBe(true);
            });

            it('addCapsuleShape registers the rigid body in the engine', () => {
                physics.addCapsuleShape(new Object3D(), { ...commonData, uuid: 'caps1', type: BodyShapeType.CAPSULE, radius: 0.3, height: 1 });
                expect(engine.hasRigidBody('caps1')).toBe(true);
            });

            it('collision_flag maps to the correct RigidBodyType', () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'dyn', type: BodyShapeType.BOX, width: 1, height: 1, length: 1, collision_flag: CollisionFlag.DYNAMIC, mass: 1 });
                physics.addBox(new Object3D(), { ...commonData, uuid: 'stat', type: BodyShapeType.BOX, width: 1, height: 1, length: 1, collision_flag: CollisionFlag.STATIC, mass: 0 });
                physics.addBox(new Object3D(), { ...commonData, uuid: 'kine', type: BodyShapeType.BOX, width: 1, height: 1, length: 1, collision_flag: CollisionFlag.KINEMATIC, mass: 0 });

                expect(engine.getRigidBodyType('dyn')).toBe(RigidBodyType.Dynamic);
                expect(engine.getRigidBodyType('stat')).toBe(RigidBodyType.Static);
                expect(engine.getRigidBodyType('kine')).toBe(RigidBodyType.Kinematic);
            });
        });

        describe('dispatcher onBodyUpdate', () => {
            it('fires onBodyUpdate for each tracked rigid body after simulate', () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'box1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                physics.simulate(1 / 60);

                const calls = dispatcher.onBodyUpdate.mock.calls.filter((c: any[]) => c[0] === 'box1');
                expect(calls.length).toBeGreaterThan(0);
            });

            it('setOrigin on a kinematic body reaches the engine', () => {
                // The adapter does not dispatch onBodyUpdate for
                // kinematic bodies (only dynamic and character
                // controllers), so we verify translation via the
                // engine state directly.
                physics.addBox(new Object3D(), {
                    ...commonData,
                    uuid: 'platform',
                    mass: 0,
                    collision_flag: CollisionFlag.KINEMATIC,
                    type: BodyShapeType.BOX,
                    width: 2, height: 0.2, length: 2,
                    position: { x: 0, y: 0, z: 0 },
                });
                physics.setOrigin('platform', { x: 0, y: 5, z: 0 });
                physics.simulate(1 / 60);

                const pos = engine.getRigidBodyPosition('platform');
                expect(pos?.y).toBeCloseTo(5, 2);
            });

            it('populates motionState (linearVelocity, onGround) for players', async () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);
                physics.simulate(1 / 60);

                const motionState = characterCalls().at(-1)?.[5];
                expect(motionState).toBeDefined();
                expect(motionState?.linearVelocity).toBeDefined();
                expect(typeof motionState?.onGround).toBe('boolean');
            });
        });

        describe('addPlayerObject options', () => {
            it('respects playerGravity passed during creation', async () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true, {playerGravity: -60, jumpHeight: 1, stepHeight: 0.5, maxSlope: 60});
                physics.simulate(1 / 60);

                expect(dispatcher.onBodyUpdate).toHaveBeenCalledOnce();
                expect(dispatcher.onBodyUpdate.mock.calls[0]![0]).toBe('character1');
                const positionY = dispatcher.onBodyUpdate.mock.calls[0]![1].y;
                expectCloseTo(positionY, -1 / 60);
            });
        });

        describe('applyImpulseToPlayer', () => {
            it('moves the player upward with a vertical impulse (zero gravity)', async () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);
                physics.setPlayerGravity('character1', { x: 0, y: 0, z: 0 });
                physics.applyImpulseToPlayer('character1', { x: 0, y: 1, z: 0 } as Vector3);
                physics.simulate(1 / 60);

                const positionY = dispatcher.onBodyUpdate.mock.calls[0]![1].y;
                expectCloseTo(positionY, 1 / 60);
            });

            it('combines with gravity for a net-zero first frame', async () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);
                physics.setPlayerGravity('character1', { x: 0, y: -60, z: 0 });
                physics.applyImpulseToPlayer('character1', { x: 0, y: 1, z: 0 } as Vector3);
                physics.simulate(1 / 60);

                const positionY = dispatcher.onBodyUpdate.mock.calls[0]![1].y;
                expect(positionY).toBeCloseTo(0, 5);
            });

            it('never over-reports onGround across a full airborne arc', async () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);
                physics.setPlayerGravity('character1', { x: 0, y: -20, z: 0 });

                physics.applyImpulseToPlayer('character1', { x: 0, y: 6, z: 0 } as Vector3);

                const overReports: number[] = [];
                for (let i = 0; i < 120; i++) {
                    physics.simulate(1 / 60);
                    const motionState = characterCalls().at(-1)?.[5];
                    if (motionState?.onGround === true) overReports.push(i);
                }
                expect(
                    overReports,
                    `onGround reported true on ${overReports.length} airborne frames: ${overReports.join(',')}`,
                ).toEqual([]);
            });
        });

        describe('movePlayerObject', () => {
            const addFloor = () => {
                physics.addBox(new Object3D(), {
                    ...commonData,
                    uuid: 'floor',
                    mass: 0,
                    type: BodyShapeType.BOX,
                    width: 20, height: 1, length: 20,
                    position: { x: 0, y: -1, z: 0 },
                });
            };

            it('drives the character in the walk direction', async () => {
                addFloor();
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);
                physics.setPlayerGravity('character1', { x: 0, y: 0, z: 0 });

                const walkPerFrame = new Vector3(2 / 60, 0, 0);
                for (let i = 0; i < 60; i++) {
                    physics.movePlayerObject('character1', walkPerFrame, false);
                    physics.simulate(1 / 60);
                }

                const endX = characterCalls().at(-1)?.[1].x ?? 0;
                expect(endX).toBeGreaterThan(1);
            });

            it('flips onGround exactly twice during a jump (takeoff + landing)', async () => {
                addFloor();
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true, {
                    playerGravity: -20,
                    jumpHeight: 1,
                    stepHeight: 0.5,
                    maxSlope: 60,
                });

                for (let i = 0; i < 10; i++) physics.simulate(1 / 60);
                const preJumpIndex = Math.max(0, characterCalls().length - 1);

                physics.movePlayerObject('character1', new Vector3(0, 0, 0), true);
                physics.simulate(1 / 60);

                for (let i = 0; i < 180; i++) {
                    physics.movePlayerObject('character1', new Vector3(0, 0, 0), false);
                    physics.simulate(1 / 60);
                }

                const sequence = onGroundSequence(preJumpIndex);
                const transitions = countTransitions(sequence);
                expect(
                    transitions,
                    `onGround flipped ${transitions} times during a single jump; expected 2 (takeoff, landing). Sequence: ${sequence.map((g) => g ? 'G' : '.').join('')}`,
                ).toBe(2);
                expect(sequence[0]).toBe(true);
                expect(sequence.at(-1)).toBe(true);
            });

            it('reports onGround stable after landing with no late flicker', async () => {
                addFloor();
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true, {
                    playerGravity: -20,
                    jumpHeight: 1,
                    stepHeight: 0.5,
                    maxSlope: 60,
                });

                for (let i = 0; i < 10; i++) physics.simulate(1 / 60);

                physics.movePlayerObject('character1', new Vector3(0, 0, 0), true);
                physics.simulate(1 / 60);

                let landedAt = -1;
                for (let i = 0; i < 180; i++) {
                    physics.movePlayerObject('character1', new Vector3(0, 0, 0), false);
                    physics.simulate(1 / 60);
                    const motionState = characterCalls().at(-1)?.[5];
                    if (motionState?.onGround === true) {
                        landedAt = characterCalls().length - 1;
                        break;
                    }
                }
                expect(landedAt, 'character never landed within 3s').toBeGreaterThanOrEqual(0);

                for (let i = 0; i < 120; i++) {
                    physics.movePlayerObject('character1', new Vector3(0, 0, 0), false);
                    physics.simulate(1 / 60);
                }

                const postLanding = onGroundSequence(landedAt);
                const airborne = postLanding.filter((g) => !g).length;
                expect(
                    airborne,
                    `onGround flipped back to false on ${airborne}/${postLanding.length} post-landing frames`,
                ).toBe(0);
            });
        });

        describe('setPlayerSpeedAdjustment', () => {
            it('combined with an ascending kinematic platform keeps the character grounded (reproduces PlatformBehavior stutter)', async () => {
                // PlatformBehavior reports per-frame platform motion via
                // setPlayerSpeedAdjustment so riders are carried along. On
                // an ascending platform the adjustment drives walkVelocity.y
                // positive, which a naïve takeoff detector would mistake
                // for a jump. This is the regression that motivated the
                // adapter's speed-adjustment folding logic.
                const platformHeight = 0.2;
                let platformY = -0.5 - platformHeight / 2;
                physics.addBox(new Object3D(), {
                    ...commonData,
                    uuid: 'platform',
                    mass: 0,
                    collision_flag: CollisionFlag.KINEMATIC,
                    type: BodyShapeType.BOX,
                    width: 4,
                    height: platformHeight,
                    length: 4,
                    position: { x: 0, y: platformY, z: 0 },
                });
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);
                physics.setPlayerGravity('character1', { x: 0, y: -10, z: 0 });

                for (let i = 0; i < 10; i++) physics.simulate(1 / 60);
                const motionState = characterCalls().at(-1)?.[5];
                expect(motionState?.onGround).toBe(true);
                const settledIndex = characterCalls().length;

                const ascentPerFrame = 0.84 / 60;
                for (let i = 0; i < 60; i++) {
                    platformY += ascentPerFrame;
                    physics.setOrigin('platform', { x: 0, y: platformY, z: 0 });
                    physics.setPlayerSpeedAdjustment('character1', new Vector3(0, ascentPerFrame, 0));
                    physics.movePlayerObject('character1', new Vector3(0, 0, 0), false);
                    physics.simulate(1 / 60);
                }

                const sequence = onGroundSequence(settledIndex);
                const airborne = sequence.filter((g) => !g).length;
                expect(
                    airborne,
                    `character reported airborne on ${airborne}/${sequence.length} ascending-platform-with-adjustment frames. Sequence: ${sequence.map((g) => g ? 'G' : '.').join('')}`,
                ).toBe(0);
            });
        });

        describe('collisions', () => {
            it('should report a collision with a collidable object', () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'body1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                physics.addCollidableObject('body1');

                physics.addBox(new Object3D(), { ...commonData, uuid: 'body2', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                physics.detectCollisionsForObject('body2', { id: 'listener1', type: COLLISION_TYPE.WITH_COLLIDABLE_OBJECTS }, true);

                physics.simulate(1 / 60);

                expect(dispatcher.onCollision).toHaveBeenCalledWith('body2', 'listener1');
            });

            it('should report a collision with a player', async () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);

                physics.addBox(new Object3D(), { ...commonData, uuid: 'body1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                physics.detectCollisionsForObject('body1', { id: 'listener1', type: COLLISION_TYPE.WITH_PLAYER }, true);

                physics.simulate(1 / 60);

                expect(dispatcher.onCollision).toHaveBeenCalledWith('body1', 'listener1');
            });

            it('should not report a collision with a collidable object when collisions are disabled', () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'body1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                physics.addCollidableObject('body1');

                physics.addBox(new Object3D(), { ...commonData, uuid: 'body2', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                physics.detectCollisionsForObject('body2', { id: 'listener1', type: COLLISION_TYPE.WITH_COLLIDABLE_OBJECTS }, true);
                physics.detectCollisionsForObject('body2', { id: 'listener1', type: COLLISION_TYPE.WITH_COLLIDABLE_OBJECTS }, false);

                physics.simulate(1 / 60);

                expect(dispatcher.onCollision).not.toHaveBeenCalled();
            });

            it('should not report a collision with a player when collisions are disabled', async () => {
                physics.addBox(new Object3D(), { ...commonData, uuid: 'character1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                await physics.addPlayerObject('character1', true);

                physics.addBox(new Object3D(), { ...commonData, uuid: 'body1', type: BodyShapeType.BOX, width: 1, height: 1, length: 1 });
                physics.detectCollisionsForObject('body1', { id: 'listener1', type: COLLISION_TYPE.WITH_PLAYER }, true);
                physics.detectCollisionsForObject('body1', { id: 'listener1', type: COLLISION_TYPE.WITH_PLAYER }, false);

                physics.simulate(1 / 60);

                expect(dispatcher.onCollision).not.toHaveBeenCalled();
            });
        });

        describe('scale', () => {
            it('forwards data.scale to the engine (giant-box regression)', async () => {
                // Adapter previously dropped `data.scale` in addBody, so
                // shapes extracted at a parent-scale-compensated size
                // (a 10m geometry with scale=0.1) would collide at raw
                // geometry size instead of the intended world size.
                physics.addBox(new Object3D(), {
                    ...commonData,
                    uuid: 'floor',
                    type: BodyShapeType.BOX,
                    collision_flag: CollisionFlag.STATIC,
                    mass: 0,
                    position: { x: 0, y: 0, z: 0 },
                    scale: { x: 0.1, y: 0.1, z: 0.1 },
                    width: 10, height: 1, length: 10,
                });
                physics.addBox(new Object3D(), {
                    ...commonData,
                    uuid: 'probe',
                    type: BodyShapeType.BOX,
                    collision_flag: CollisionFlag.DYNAMIC,
                    mass: 1,
                    position: { x: 0, y: 3, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    width: 0.2, height: 0.2, length: 0.2,
                });

                for (let i = 0; i < 240; i++) physics.simulate(1 / 60);

                const probeY = dispatcher.onBodyUpdate.mock.calls
                    .filter((c: any[]) => c[0] === 'probe')
                    .at(-1)?.[1]?.y;
                expect(
                    probeY,
                    `probe rested at y=${probeY}; expected ≈0.15 (scale applied). ` +
                    'A value near 0.6 means data.scale is being dropped and the ' +
                    '10m floor is colliding at full size.',
                ).toBeGreaterThan(0);
                expect(probeY).toBeLessThan(0.3);
            });
        });
    });
};

const relativeError = (expected: number, actual: number) =>
    Math.abs((expected - actual) / expected);

const expectCloseTo = (actual: number, expected: number, maxRelativeError: number = 0.02) => {
    expect(relativeError(expected, actual), `${actual} should be close to ${expected}`).toBeLessThanOrEqual(maxRelativeError);
};
