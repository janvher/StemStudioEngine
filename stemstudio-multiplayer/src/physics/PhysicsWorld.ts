import type Ammo from "../assets/js/libs/ammojs3/builds/ammo.js";
import type {
    BoxData,
    CapsuleData,
    CollisionRegistration,
    CommonData,
    ConcaveHullData,
    ConvexHullData,
    IDispatcher,
    IPhysics,
    IPlayerOptions,
    ModelData,
    Object3D,
    ObjectMotionState,
    Quaternion,
    SphereData,
    TerrainData} from "./common/types.js";
import {
    COLLISION_TYPE,
    CollisionFlag
} from "./common/types.js";
import MathUtils from "./common/math.js";
import { Clock } from "./common/utils.js";
//import {AmmoDebugConstants, AmmoDebugDrawer, DefaultBufferSize} from "../assets/js/ammo-debug-drawer/AmmoDebugDrawer";
import PhysicsBase from "./PhysicsBase.js";
import { Vector3 } from "../rooms/schema/GameRoomState.js";

// Ammo constants
const COLLISION_FLAGS = {
    CF_DYNAMIC_OBJECT: 0,
    CF_STATIC_OBJECT: 1,
    CF_KINEMATIC_OBJECT: 2,
    CF_CHARACTER_OBJECT: 16
};
const ACTIVATION_STATE = { DISABLE_DEACTIVATION: 4 };

const DEFAULT_PLAYER_GRAVITY = -10.0;
const JUMP_STRENGTH = 4.0;

class PhysicsWorld extends PhysicsBase {
    private ammo: any;
    margin: number = 0.05;
    rigidBodies: Map<string, Ammo.btRigidBody> = new Map<string, Ammo.btRigidBody>();
    dynamicBodies: Map<string, Ammo.btRigidBody> = new Map<string, Ammo.btRigidBody>();
    clock: Clock = new Clock();
    dispatcher: IDispatcher;
    started = false;

    speedAdjustment = new Vector3();

    otsShiftVector: Vector3 = new Vector3(0, 0, 0);

    //to be destroyed
    world?: Ammo.btSoftRigidDynamicsWorld;
    ammoTransAux: Ammo.btTransform;
    collisionConfiguration?: Ammo.btDefaultCollisionConfiguration;
    collisionDispatcher?: Ammo.btCollisionDispatcher;
    broadphase?: Ammo.btDbvtBroadphase;
    solver?: Ammo.btSequentialImpulseConstraintSolver;

    //debugger
    // debugGeometry?: BufferGeometry;
    // debugDrawer?: AmmoDebugDrawer;

    //collisions
    collidableObjects: string[] = [];
    collisionListeners = new Map<string, CollisionRegistration[]>();

    //controller
    playerUuids: string[] = [];
    controllers = new Map<string, Ammo.btKinematicCharacterController>();

    bodyShapeDataMap = new WeakMap<Ammo.btRigidBody, { shapeType: string }>();

    gravity: number;

    constructor(ammo: any, dispatcher: IDispatcher, gravity: number) {
        super(false, false, true);
        this.ammo = ammo;
        this.dispatcher = dispatcher;
        this.gravity = gravity;
        this.ammoTransAux = new ammo.btTransform();
    }

    //IPhysics impl

    start(): Promise<IPhysics> {
        this.initPhysicsWorld();
        this.dispatcher.onReady();
        this.started = true;
        this.simulate();
        return Promise.resolve(this);
    }

    terminate() {
        console.log("PhysicsWorld.terminate");
        this.started = false;
        this.ammo.destroy(this.ammoTransAux);
        this.ammo.destroy(this.collisionConfiguration);
        this.ammo.destroy(this.collisionDispatcher);
        this.ammo.destroy(this.broadphase);
        this.ammo.destroy(this.solver);
    }

    remove(uuid: string): void {
        const body = this.rigidBodies.get(uuid);
        if (!body) {
            console.warn("PhysicsWorld.remove: object not found", uuid);
            return;
        }
        this.world?.removeRigidBody(body);
        this.rigidBodies.delete(uuid);
        this.dynamicBodies.delete(uuid);
        this.removeCollidableObject(uuid);
        super.removeObject(uuid);
    }

    setLinearVelocity(uuid: string, velocity: Vector3) {
        const body = this.rigidBodies.get(uuid);
        if (!body) {
            console.warn("PhysicsWorld.setLinearVelocity: object not found", uuid);
            return;
        }

        const shapeData = this.bodyShapeDataMap.get(body);
        if (!shapeData) {
            body.setLinearVelocity(new this.ammo.btVector3(velocity.x, velocity.y, velocity.z));
        } else if (shapeData.shapeType === "capsule") {
            const linearVelocity = new this.ammo.btVector3(velocity.x, velocity.y, velocity.z);
            body.setLinearVelocity(linearVelocity);
            const angularFactor = new this.ammo.btVector3(0, 0, 0);
            body.setAngularFactor(angularFactor);
        }
    }

    applyCentralImpulse(uuid: string, impulse: Vector3) {
        const body = this.rigidBodies.get(uuid);
        if (!body) {
            console.warn("PhysicsWorld.applyCentralImpulse: object not found", uuid);
            return;
        }
        body.applyCentralImpulse(new this.ammo.btVector3(impulse.x, impulse.y, impulse.z));
    }

    applyForce(uuid: string, force: Vector3, rel_pos: Vector3) {
        const body = this.rigidBodies.get(uuid);
        if (!body) {
            console.warn("PhysicsWorld.applyForce: object not found", uuid);
            return;
        }
        //FIXME: destroy vectors ?
        body.applyForce(
            new this.ammo.btVector3(force.x, force.y, force.z),
            new this.ammo.btVector3(rel_pos.x, rel_pos.y, rel_pos.z)
        );
    }

    setOrigin(uuid: string, position: Vector3) {
        const body = this.rigidBodies.get(uuid);
        if (!body) {
            console.warn("PhysicsWorld.setOrigin: object not found", uuid);
            return;
        }
        body.getWorldTransform().setOrigin(new this.ammo.btVector3(position.x, position.y, position.z));
    }

    setRotation(uuid: string, quaternion: Quaternion) {
        const body = this.rigidBodies.get(uuid);
        if (!body) {
            console.warn("PhysicsWorld.setRotation: object not found", uuid);
            return;
        }
        body.getWorldTransform().setRotation(
            new this.ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
        );
    }

    private setCollisionFlagAndAddObject(
        uuid: string,
        mass: number,
        collisionFlag: CollisionFlag,
        body: Ammo.btRigidBody,
        object: Object3D
    ) {
        collisionFlag = super.addObject(uuid, mass, collisionFlag, object);
        if (collisionFlag === CollisionFlag.DYNAMIC) {
            this.dynamicBodies.set(uuid, body);
        }
        body.setCollisionFlags(collisionFlag);
        this.rigidBodies.set(uuid, body);
    }

    addBox(object: Object3D, data: BoxData) {
        const {
            uuid,
            width,
            length,
            height,
            mass,
            collision_flag = CollisionFlag.DYNAMIC
        } = data;
        const geometry = new this.ammo.btBoxShape(new this.ammo.btVector3(width * 0.5, height * 0.5, length * 0.5));
        const body = this.createRigidBody(geometry, data as CommonData);
        this.setCollisionFlagAndAddObject(uuid, mass, collision_flag, body, object);
    }

    addSphere(object: Object3D, data: SphereData) {
        const {
            uuid,
            radius,
            mass,
            collision_flag = CollisionFlag.DYNAMIC
        } = data;
        const geometry = new this.ammo.btSphereShape(radius);
        const body = this.createRigidBody(geometry, data as CommonData);
        this.setCollisionFlagAndAddObject(uuid, mass, collision_flag, body, object);
    }

    addTerrain(_object: Object3D, _data: TerrainData) {
        // const {
        //     uuid,
        //     position,
        //     quaternion,
        //     mass = 0,
        //     friction = 2,
        //     restitution = 0,
        //     terrainWidth,
        //     terrainDepth,
        //     terrainMinHeight,
        //     terrainMaxHeight,
        //     terrainWidthExtents = 100,
        //     terrainDepthExtents = 100,
        //     heightData,
        // } = data;
        // let body = TerrainUtil.createRigidBody(
        //     this.ammo,
        //     terrainWidth,
        //     terrainDepth,
        //     terrainMinHeight,
        //     terrainMaxHeight,
        //     terrainWidthExtents,
        //     terrainDepthExtents,
        //     heightData,
        // );
        // this.world?.addRigidBody(body);
        // //FIXME: apply position and rotation transform
        // this.setCollisionFlagAndAddObject(uuid, mass, CollisionFlag.STATIC, body, object);
    }

    addConcaveHull(object: Object3D, data: ConcaveHullData) {
        const {
            uuid,
            vertices,
            indexes,
            mass,
            collision_flag = CollisionFlag.DYNAMIC
        } = data;

        const objectsVertices = vertices;
        const objectsIndexes = indexes;

        const removeDuplicateVertices = true;

        const compoundShape = new this.ammo.btCompoundShape();

        const v0 = new this.ammo.btVector3(0, 0, 0);
        const v1 = new this.ammo.btVector3(0, 0, 0);
        const v2 = new this.ammo.btVector3(0, 0, 0);

        objectsVertices.forEach((verts, i) => {
            const index = objectsIndexes[i];
            const triangleMesh = new this.ammo.btTriangleMesh();

            for (let j = 0; j < index.length; j += 3) {
                const ai = index[j] * 3;
                const bi = index[j + 1] * 3;
                const ci = index[j + 2] * 3;

                v0.setValue(verts[ai], verts[ai + 1], verts[ai + 2]);
                v1.setValue(verts[bi], verts[bi + 1], verts[bi + 2]);
                v2.setValue(verts[ci], verts[ci + 1], verts[ci + 2]);

                try {
                    triangleMesh.addTriangle(v0, v1, v2, removeDuplicateVertices);
                } catch (error) {
                    console.error("Error adding triangle:", error, { v0, v1, v2 });
                }
            }

            const shape = new this.ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
            const transform = new this.ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.ammo.btVector3(0, 0, 0));
            compoundShape.addChildShape(transform, shape);
        });

        const body = this.createRigidBody(compoundShape, data as CommonData);

        this.setCollisionFlagAndAddObject(uuid, mass, collision_flag, body, object);
    }

    addConvexHull(object: Object3D, data: ConvexHullData) {
        const {
            uuid,
            vertices,
            mass,
            collision_flag = CollisionFlag.DYNAMIC
        } = data;

        const geometry = new this.ammo.btConvexHullShape();
        const vec = new this.ammo.btVector3(0, 0, 0);

        for (let i = 0; i < vertices.length; i += 3) {
            vec.setValue(vertices[i], vertices[i + 1], vertices[i + 2]);
            geometry.addPoint(vec);
        }

        const body = this.createRigidBody(geometry, data as CommonData);

        this.setCollisionFlagAndAddObject(uuid, mass, collision_flag, body, object);
    }

    addCapsuleShape(object: Object3D, data: CapsuleData) {
        const {
            uuid,
            radius,
            height,
            mass,
            collision_flag = CollisionFlag.DYNAMIC
        } = data;

        const capsuleShape = new this.ammo.btCapsuleShape(radius, height);

        const body = this.createRigidBody(capsuleShape, data as CommonData);

        this.bodyShapeDataMap.set(body, { shapeType: "capsule" });
        this.setCollisionFlagAndAddObject(uuid, mass, collision_flag, body, object);
    }

    // TODO: remove model type since concave hull is the same
    addModel(object: Object3D, data: ModelData) {
        const {
            uuid,
            vertices,
            matrices,
            indexes,
            scale,
            mass,
            collision_flag = CollisionFlag.DYNAMIC
        } = data;

        const bta = new this.ammo.btVector3();
        const btb = new this.ammo.btVector3();
        const btc = new this.ammo.btVector3();
        const triMesh: Ammo.btTriangleMesh = new this.ammo.btTriangleMesh(true, false);

        for (let i = 0; i < vertices.length; i++) {
            const components = vertices[i];
            const index = indexes[i] ? indexes[i] : null;
            const matrix = Array.from(matrices[i]);

            if (index) {
                for (let j = 0; j < index.length; j += 3) {
                    const ai = index[j] * 3;
                    const bi = index[j + 1] * 3;
                    const ci = index[j + 2] * 3;

                    const va = MathUtils.applyMatrix4ToVector3(
                        {
                            x: components[ai],
                            y: components[ai + 1],
                            z: components[ai + 2]
                        },
                        matrix
                    );
                    const vb = MathUtils.applyMatrix4ToVector3(
                        {
                            x: components[bi],
                            y: components[bi + 1],
                            z: components[bi + 2]
                        },
                        matrix
                    );
                    const vc = MathUtils.applyMatrix4ToVector3(
                        {
                            x: components[ci],
                            y: components[ci + 1],
                            z: components[ci + 2]
                        },
                        matrix
                    );

                    bta.setValue(va.x, va.y, va.z);
                    btb.setValue(vb.x, vb.y, vb.z);
                    btc.setValue(vc.x, vc.y, vc.z);
                    triMesh.addTriangle(bta, btb, btc, false);
                }
            } else {
                for (let j = 0; j < components.length; j += 9) {
                    const va = MathUtils.applyMatrix4ToVector3(
                        {
                            x: components[j + 0],
                            y: components[j + 1],
                            z: components[j + 2]
                        },
                        matrix
                    );
                    const vb = MathUtils.applyMatrix4ToVector3(
                        {
                            x: components[j + 3],
                            y: components[j + 4],
                            z: components[j + 5]
                        },
                        matrix
                    );
                    const vc = MathUtils.applyMatrix4ToVector3(
                        {
                            x: components[j + 6],
                            y: components[j + 7],
                            z: components[j + 8]
                        },
                        matrix
                    );

                    bta.setValue(va.x, va.y, va.z);
                    btb.setValue(vb.x, vb.y, vb.z);
                    btc.setValue(vc.x, vc.y, vc.z);
                    triMesh.addTriangle(bta, btb, btc, false);
                }
            }
        }

        const localScale = new this.ammo.btVector3(scale.x, scale.y, scale.z);
        triMesh.setScaling(localScale);
        this.ammo.destroy(localScale);

        const collisionShape: Ammo.btTriangleMeshShape = new this.ammo.btBvhTriangleMeshShape(triMesh, true, true);
        //collisionShape.resources = [triMesh];

        this.ammo.destroy(bta);
        this.ammo.destroy(btb);
        this.ammo.destroy(btc);

        const body = this.createRigidBody(collisionShape, data as CommonData);
        this.setCollisionFlagAndAddObject(uuid, mass, collision_flag, body, object);
    }

    addPlayerObject(uuid: string, useController: boolean, options?: IPlayerOptions): Promise<Object3D | null> {
        this.playerUuids.push(uuid);
        if (useController) {
            const playerBody = this.rigidBodies.get(uuid);
            if (!playerBody) {
                console.warn("setPlayerObject: failed to find player rigid body");
                return Promise.reject("failed to find player rigid body");
            }

            const gravity = options?.playerGravity || DEFAULT_PLAYER_GRAVITY;
            const jumpStrength = options?.jumpSpeed || JUMP_STRENGTH;


            const ghostObject = new this.ammo.btPairCachingGhostObject();
            ghostObject.setWorldTransform(playerBody.getWorldTransform());
            ghostObject.setCollisionShape(playerBody.getCollisionShape());
            ghostObject.setCollisionFlags(COLLISION_FLAGS.CF_CHARACTER_OBJECT);
            ghostObject.setActivationState(ACTIVATION_STATE.DISABLE_DEACTIVATION);
            ghostObject.activate(true);
            ghostObject
                .getWorldTransform()
                .getBasis()
                .setEulerZYX(3.14 / 2, 0, 0); //sync ghost obj rotation with the model
            ghostObject.uuid = uuid; //not working - we're not getting it back in collision detection code

            //replace player's rigid body with the controller ghost object
            if (playerBody) {
                this.world?.removeRigidBody(playerBody);
            }
            this.rigidBodies.set(uuid, ghostObject);

            const controller = new this.ammo.btKinematicCharacterController(
                ghostObject,
                ghostObject.getCollisionShape(),
                0.5, //FIXME: step - pass in params
                new this.ammo.btVector3(0, 1, 0) ////FIXME: up - pass in params
            );
            if (!controller) {
                console.warn("setPlayerObject: failed to create player controller");
                return Promise.reject("failed to create player controller");
            }
            controller.setGravity(new this.ammo.btVector3(0, gravity, 0));
            controller.canJump(); //FIXME: pass in params

            // calculate jump force based on jump height and gravity
            const jumpForce = Math.sqrt(2 * Math.abs(gravity) * jumpStrength);
            controller.setJumpSpeed(jumpForce);

            controller.setUseGhostSweepTest(false); //prevents model from falling donw ?
            this.controllers.set(uuid, controller);

            //add controller objects to the world
            this.world?.addCollisionObject(ghostObject, 32, 3);
            this.world?.addAction(controller);
        }
        return Promise.resolve(null);
    }

    addOtsShiftVector(otsShiftVector: Vector3) {
        this.otsShiftVector = otsShiftVector;
    }

    removePlayerObject(uuid: string) {
        this.playerUuids = this.playerUuids.filter(u => u !== uuid);
        this.controllers.delete(uuid);
    }

    movePlayerObject(uuid: string, walkDirection: Vector3, jump: boolean) {
        const controller = this.controllers.get(uuid);
        if (!controller) return;

        controller.setWalkDirection(new this.ammo.btVector3(walkDirection.x + this.speedAdjustment.x, walkDirection.y  + this.speedAdjustment.y, walkDirection.z +  + this.speedAdjustment.z));

        if (jump && controller.onGround()) {
            controller.jump();
        }
    }

    setPlayerSpeedAdjustment(uuid: string, speedAdjustment: Vector3) {
        this.speedAdjustment = speedAdjustment;
    }

    setPlayerPosition(uuid: string, position: Vector3) {
        const controller = this.controllers.get(uuid);
        if (!controller) return;

        const gravity = controller.getGravity();

        const ghostObject = controller.getGhostObject();
        const worldTransform = ghostObject.getWorldTransform();

        controller.setGravity(new this.ammo.btVector3(0, 0, 0));
        controller.setWalkDirection(new this.ammo.btVector3(0, 0, 0));

        worldTransform.setOrigin(new this.ammo.btVector3(position.x, position.y, position.z));
        ghostObject.setWorldTransform(worldTransform);

        controller.warp(new this.ammo.btVector3(position.x, position.y, position.z));

        controller.setGravity(gravity);
    }

    applyImpulseToPlayer(uuid: string, impulse: Vector3) {
        const controller = this.controllers.get(uuid);

        if (!controller) return;

        controller.applyImpulse(new this.ammo.btVector3(impulse.x, impulse.y, impulse.z));
    }

    setCurrentAnimation(_uuid: string, _animation: string): void {
        //noop
    }

    addCollidableObject(uuid: string): void {
        this.collidableObjects.push(uuid);
    }

    removeCollidableObject(uuid: string): void {
        this.collidableObjects = this.collidableObjects.filter(c => c !== uuid);
    }

    detectCollisionsForObject(uuid: string, listener: CollisionRegistration, enable: boolean): void {
        if (enable) {
            let arr = this.collisionListeners.get(uuid);
            if (!arr) {
                arr = [];
                this.collisionListeners.set(uuid, arr);
            }
            arr.push(listener);
        } else {
            let arr = this.collisionListeners.get(uuid);
            if (arr) {
                if (listener.id) {
                    arr = arr.filter(l => l.id !== listener.id);
                    this.collisionListeners.set(uuid, arr);
                } else {
                    this.collisionListeners.delete(uuid);
                }
            }
        }
    }

    //end of IPhysics impl

    private initPhysicsWorld() {
        // physical environment configuration
        this.collisionConfiguration = new this.ammo.btDefaultCollisionConfiguration();
        this.collisionDispatcher = new this.ammo.btCollisionDispatcher(this.collisionConfiguration);
        this.broadphase = new this.ammo.btDbvtBroadphase();
        this.solver = new this.ammo.btSequentialImpulseConstraintSolver();
        this.world = new this.ammo.btDiscreteDynamicsWorld(
            this.collisionDispatcher,
            this.broadphase,
            this.solver,
            this.collisionConfiguration
        );

        const gravity = new this.ammo.btVector3(0, this.gravity, 0);
        this.world!.setGravity(gravity);
    }

    simulate() {
        if (!this.started) return;

        const dt = this.clock.getDelta();
        this.world!.stepSimulation(dt);

        this.dynamicBodies.forEach((body, uuid) => {
            const transform = this.getObjectTransform(uuid, body);
            let motionState = undefined;
            const controller = this.controllers.get(uuid);
            if (controller) {
                motionState = { onGround: controller.onGround(), linearVelocity: { x: controller.getLinearVelocity().x(), y: controller.getLinearVelocity().y(), z: controller.getLinearVelocity().z() } as Vector3 };
            }
            this.handleBodyUpdate(transform, uuid, dt, motionState);
        });

        this.detectCollisions();

        //debug drawer
        // if (this.debugDrawer && this.debugGeometry) {
        //     this.debugDrawer.update();
        //     if (this.debugDrawer.index !== 0) {
        //         this.debugGeometry.attributes.position.needsUpdate = true;
        //         this.debugGeometry.attributes.color.needsUpdate = true;
        //     }
        //     this.debugGeometry.setDrawRange(0, this.debugDrawer.index);
        // }
    }

    /**
     * Retrieves the transformation of an object identified by its UUID.
     *
     * This method first attempts to get the transformation from a controller associated with the UUID.
     * If no controller is found, it retrieves the transformation from the motion state of the provided rigid body.
     *
     * @param uuid - The unique identifier of the object.
     * @param body - The rigid body whose transformation is to be retrieved.
     * @returns The transformation of the object if found, otherwise `null`.
     */
    private getObjectTransform(uuid: string, body: Ammo.btRigidBody): Ammo.btTransform | null {
        const controller = this.controllers.get(uuid);
        if (controller) {
            return controller.getGhostObject().getWorldTransform();
        }

        const motionState = body.getMotionState();
        if (motionState) {
            motionState.getWorldTransform(this.ammoTransAux);
            return this.ammoTransAux;
        }

        return null;
    }

    /**
     * Handles the update of a physics body by extracting its transform data and dispatching an update event.
     *
     * @param transform - The transformation data of the physics body. If null, a warning is logged and the function returns.
     * @param uuid - The unique identifier of the physics body.
     * @param dt - The delta time since the last update.
     * @param motionState
     */
    private handleBodyUpdate(transform: Ammo.btTransform | null, uuid: string, dt: number, motionState?: ObjectMotionState) {
        if (!transform) {
            console.warn("PhysicsWorld.handleBodyUpdate: transform is null", uuid);
            return;
        }

        const origin = transform.getOrigin();
        const rotation = transform.getRotation();

        this.dispatcher.onBodyUpdate(
            uuid,
            { x: origin.x(), y: origin.y(), z: origin.z() } as Vector3,
            {
                x: rotation.x(),
                y: rotation.y(),
                z: rotation.z(),
                w: rotation.w()
            } as Quaternion,
            dt,
            motionState
        );
    }

    private createRigidBody(shape: Ammo.btCollisionShape, options: CommonData, skipTransform: boolean = false) {
        const {
            uuid,
            position,
            quaternion,
            mass,
            scale,
            restitution = 0.5,
            friction = 0.5,
            rollingFriction = 0.5,
            spinningFriction = 0.5,
            contactStiffness = 0.5,
            contactDamping = 0.5
            //damping = { linear: 0.2, angular: 0.2 },
        } = options;
        const transform = this.ammoTransAux;

        if (!skipTransform) {
            transform.setIdentity();
            transform.setOrigin(new this.ammo.btVector3(position.x, position.y, position.z));
            transform.setRotation(new this.ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));

            // Apply scale to the shape
            const localScaling = new this.ammo.btVector3(scale.x, scale.y, scale.z);
            shape.setLocalScaling(localScaling);
            this.ammo.destroy(localScaling);
        }

        const motionState = new this.ammo.btDefaultMotionState(transform);
        const localInertia = new this.ammo.btVector3(0, 0, 0);
        shape.calculateLocalInertia(mass, localInertia);

        const rbInfo: Ammo.btRigidBodyConstructionInfo = new this.ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );
        const body: Ammo.btRigidBody = new this.ammo.btRigidBody(rbInfo);

        if (mass > 0) {
            //body.setDamping(damping.linear, damping.angular);
            body.setActivationState(ACTIVATION_STATE.DISABLE_DEACTIVATION);
        }
        body.setFriction(friction);
        body.setRestitution(restitution);
        body.setRollingFriction(rollingFriction);
        body.setSpinningFriction(spinningFriction);
        body.setContactStiffnessAndDamping(contactStiffness, contactDamping);

        // storing uuid for future reference
        (body as any).uuid = uuid;

        this.world!.addRigidBody(body);

        return body;
    }

    initDebug(): Object3D {
        // console.log("AMMO: initDebug");
        // let debugVertices = new Float32Array(DefaultBufferSize);
        // let debugColors = new Float32Array(DefaultBufferSize);
        //
        // this.debugGeometry = new THREE.BufferGeometry();
        // this.debugGeometry.setAttribute(
        //     "position",
        //     new THREE.BufferAttribute(debugVertices, 3).setUsage(THREE.DynamicDrawUsage),
        // );
        // this.debugGeometry.setAttribute(
        //     "color",
        //     new THREE.BufferAttribute(debugColors, 3).setUsage(THREE.DynamicDrawUsage),
        // );
        //
        // let debugMaterial = new THREE.LineBasicMaterial({
        //     color: 0x3300ff,
        //     linewidth: 1,
        //     vertexColors: true /*THREE.VertexColors*/,
        // });
        //
        // this.debugDrawer = new AmmoDebugDrawer(this.ammo, null, debugVertices, debugColors, this.world, {
        //     debugDrawMode:
        //         AmmoDebugConstants.DrawWireframe | AmmoDebugConstants.DrawAabb | AmmoDebugConstants.DrawContactPoints,
        // });
        // this.debugDrawer.enable();
        //
        // let debugMesh = new THREE.LineSegments(this.debugGeometry, debugMaterial);
        // debugMesh.frustumCulled = false;
        // return debugMesh;
        return null as unknown as Object3D;
    }

    //TODO: implement collision detection with control objects !
    private detectCollisions() {
        const dispatcher = this.world!.getDispatcher();
        const numManifolds = dispatcher.getNumManifolds();

        for (let i = 0; i < numManifolds; i++) {
            const contactManifold = dispatcher.getManifoldByIndexInternal(i);

            this.handleContactManifold(contactManifold);
        }
    }

    private handleContactManifold(contactManifold: any) {
        const rb0 = this.ammo.castObject(contactManifold.getBody0(), this.ammo.btRigidBody);
        const rb1 = this.ammo.castObject(contactManifold.getBody1(), this.ammo.btRigidBody);
        let threeObject0 = rb0.uuid;
        let threeObject1 = rb1.uuid;

        //console.log("PW.WITH_PLAYER: "+threeObject0+" "+threeObject1, this.playerUuids, this.collisionListeners);
        //check controllers as ghost objects don't keep uuid for some reason
        if (!threeObject0 || !threeObject1) {
            this.controllers.forEach((controller, uuid) => {
                if ((controller.getGhostObject() as any).bU === rb0.bU) threeObject0 = uuid;
                else if ((controller.getGhostObject() as any).bU === rb1.bU) threeObject1 = uuid;
            });
        }

        if (!threeObject0 || !threeObject1) return;

        //FIXME: cover case when both objects have listeners
        let target = threeObject0;
        let listenerArr = this.collisionListeners.get(target);
        if (!listenerArr) {
            target = threeObject1;
            listenerArr = this.collisionListeners.get(target);
        }
        //console.log("PW.WITH_PLAYER: ", listenerArr);
        if (!listenerArr || listenerArr.length === 0) {
            return;
        }

        listenerArr.forEach(listener => {
            switch (listener.type) {
                case COLLISION_TYPE.WITH_PLAYER:
                    if (!this.playerUuids.includes(threeObject0) && !this.playerUuids.includes(threeObject1)) {
                        return;
                    }
                    //console.log("PW.WITH_PLAYER: detected");
                    break;
                case COLLISION_TYPE.WITH_COLLIDABLE_OBJECTS: {
                    if (this.collidableObjects.length === 0) return;
                    const targets = this.collidableObjects.filter(
                        target => threeObject0 === target || threeObject1 === target
                    );
                    if (targets.length === 0) return;
                    break;
                }
                default:
                    console.warn("Unsupported collision listener type: " + listener.type, listener);
                    return;
            }

            const numContacts = contactManifold.getNumContacts();

            for (let j = 0; j < numContacts; j++) {
                const contactPoint = contactManifold.getContactPoint(j);
                const distance = contactPoint.getDistance();

                if (distance > 0.0) continue;

                this.dispatcher.onCollision(target, listener.id);

                break;
            }
        });
    }

    pause(): void { }

    resume(): void { }
}

export default PhysicsWorld;
