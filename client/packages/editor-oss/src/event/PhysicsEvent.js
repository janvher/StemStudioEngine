
/**
 * Module: PhysicsEvent.js
 * Purpose: Contains logic for physics event.
 */


import {Box3, Clock, Vector3} from "three";

import BaseEvent from "./BaseEvent";
import {GAME_GRAVITY_DEFAULT} from "../constants/game";
import global from "../global";

class PhysicsEngine extends BaseEvent {
    constructor() {
        super();
        this.enabled = false;
        this.init = false;

        this.rigidBodies = [];
        this.softBodies = [];

        this.onOptionChange = this.onOptionChange.bind(this);
        this.updatePhysicsWorld = this.updatePhysicsWorld.bind(this);
    }

    start() {
        global.app.on(`optionChange.${this.id}`, this.onOptionChange);
        global.app.on(`afterRender.${this.id}`, this.updatePhysicsWorld);
    }

    stop() {
        global.app.on(`optionChange.${this.id}`, null);
        global.app.on(`afterRender.${this.id}`, null);
    }

    reset() {}

    onOptionChange(name, value) {
        if (name !== "enablePhysics") {
            return;
        }
        if (value) {
            this.enablePhysics();
        } else {
            this.disablePhysics();
        }
    }

    enablePhysics() {
        this.enabled = false; //disable physics simulation

        if (!this.init) {
            this.init = true;
            this.initPhysicsWorld();

            this.clock = new Clock(false);
        }

        this.createScene();
        this.clock.start();
    }

    disablePhysics() {
        this.enabled = false;

        if (!this.world) {
            return;
        }

        this.clock.stop();

        this.rigidBodies.forEach(n => {
            this.world.removeRigidBody(n._physicsBody);
        });

        this.rigidBodies.length = 0;

        global.app.editor.scene.traverse(n => {
            if (n._physicsBody) {
                n._physicsBody = null;
            }
        });

        this.scene = null;
    }

    initPhysicsWorld() {

        let gravityConstant = GAME_GRAVITY_DEFAULT;
        this.margin = 0.05;

        let collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
        let dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        let broadphase = new Ammo.btDbvtBroadphase();
        let solver = new Ammo.btSequentialImpulseConstraintSolver();
        let softBodySolver = new Ammo.btDefaultSoftBodySolver();

        this.world = new Ammo.btSoftRigidDynamicsWorld(
            dispatcher,
            broadphase,
            solver,
            collisionConfiguration,
            softBodySolver,
        );

        let gravity = new Ammo.btVector3(0, gravityConstant, 0);

        this.world.setGravity(gravity);
        this.world.getWorldInfo().set_m_gravity(gravity);
        
        Ammo.destroy(gravity); // Clean up temporary vector

        this.transformAux1 = new Ammo.btTransform();
    }

    createScene() {
        global.app.editor.scene.traverse(n => {
            if (!n.userData.physics || !n.userData.physics.enabled) {
                return;
            }

            if (n.userData.physics.type !== "rigidBody") {

                console.warn(`PhysicsEngine: unknown physics type ${n.userData.physics.type}.`);
                return;
            }

            let body = this.createRigidBody(n);
            n._physicsBody = body;

            this.world.addRigidBody(body);

            if (n.userData.physics.mass > 0) {
                this.rigidBodies.push(n);
                body.setActivationState(4);
            }
        });
    }

    updatePhysicsWorld() {
        if (!this.enabled) {
            return;
        }

        let deltaTime = this.clock.getDelta();

        this.world.stepSimulation(deltaTime, 10);

        for (let i = 0, l = this.rigidBodies.length; i < l; i++) {
            let obj = this.rigidBodies[i];
            if (!obj._physicsBody) {
                continue;
            }
            let state = obj._physicsBody.getMotionState();
            if (state) {
                state.getWorldTransform(this.transformAux1);

                let p = this.transformAux1.getOrigin();
                let q = this.transformAux1.getRotation();

                obj.position.set(p.x(), p.y(), p.z());
                obj.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }
    }

    createRigidBody(obj) {
        let position = obj.position;
        let quaternion = obj.quaternion;
        // let scale = obj.scale;

        let physics = obj.userData.physics;
        let shape = physics.shape;
        let mass = physics.mass;
        let inertia = physics.inertia;

        let geometry = null;
        let physicsShape = null;
        if (shape === "btBoxShape") {
            //MISHA - get bounding box for any object type (Group, Object3D, Mesh, etc)
            let box = new Box3().setFromObject(obj, true);

            let x = box.max.x - box.min.x;
            let y = box.max.y - box.min.y;
            let z = box.max.z - box.min.z;

            let center = new Vector3();
            box.getCenter(center);

            position = position.clone();
            position.add(center);

            const halfExtents = new Ammo.btVector3(x * 0.5, y * 0.5, z * 0.5);
            physicsShape = new Ammo.btBoxShape(halfExtents);
            Ammo.destroy(halfExtents); // Clean up temporary vector
        } else if (shape === "btSphereShape") {
            geometry = obj.geometry;
            geometry.computeBoundingSphere();

            let sphere = geometry.boundingSphere;
            physicsShape = new Ammo.btSphereShape(sphere.radius);
        } else {
            console.warn(`PlayerPhysics: cannot create shape ${shape}.`);
            return null;
        }

        physicsShape.setMargin(0.05);

        let transform = new Ammo.btTransform();
        transform.setIdentity();
        
        const originVector = new Ammo.btVector3(position.x, position.y, position.z);
        const rotationQuat = new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        
        transform.setOrigin(originVector);
        transform.setRotation(rotationQuat);

        let defaultState = new Ammo.btDefaultMotionState(transform);

        let localInertia = new Ammo.btVector3(inertia.x, inertia.y, inertia.z);
        physicsShape.calculateLocalInertia(mass, localInertia);

        let info = new Ammo.btRigidBodyConstructionInfo(mass, defaultState, physicsShape, localInertia);
        const body = new Ammo.btRigidBody(info);
        
        // Clean up temporary objects
        Ammo.destroy(originVector);
        Ammo.destroy(rotationQuat);
        Ammo.destroy(transform);
        Ammo.destroy(localInertia);
        Ammo.destroy(info);
        
        return body;
    }
}

export default PhysicsEngine;
