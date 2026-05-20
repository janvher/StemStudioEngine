
/**
 * Module: ThrowBallEvent.js
 * Purpose: Contains logic for throw ball event.
 */


import * as THREE from "three";

import PlayerComponent from "../PlayerComponent";

class ThrowBallEvent extends PlayerComponent {
    constructor(app, world, rigidBodies) {
        super(app);
        this.world = world;
        this.rigidBodies = rigidBodies;
    }

    create(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.renderer.domElement.addEventListener("click", this.throwBall.bind(this));
    }

    dispose() {
        // TODO
        if (this.renderer) {
            this.renderer.domElement.removeEventListener("click", this.throwBall);
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }

    throwBall(event) {
        if (!this.app.options.enableThrowBall) {
            return;
        }

        var mouse = new THREE.Vector2();
        var raycaster = new THREE.Raycaster();

        var camera = this.camera;

        var width = this.renderer.domElement.width;
        var height = this.renderer.domElement.height;

        mouse.set(event.offsetX / width * 2 - 1, -(event.offsetY / height) * 2 + 1);
        raycaster.setFromCamera(mouse, camera);

        // Creates a ball and throws it
        var ballMass = 3;
        var ballRadius = 0.4;
        var ballMaterial = new THREE.MeshPhongMaterial({
            color: 0x202020,
        });

        var ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 14, 10), ballMaterial);
        ball.castShadow = true;
        ball.receiveShadow = true;
        this.scene.add(ball);

        var ballShape = new Ammo.btSphereShape(ballRadius);

        var pos = new THREE.Vector3();
        pos.copy(raycaster.ray.direction);
        pos.add(raycaster.ray.origin);

        var quat = new THREE.Quaternion();
        quat.set(0, 0, 0, 1);

        var body = this.createRigidBody(ball, ballShape, ballMass, pos, quat);

        pos.copy(raycaster.ray.direction);
        pos.multiplyScalar(20);

        const velocityVector = new Ammo.btVector3(pos.x, pos.y, pos.z);
        body.setLinearVelocity(velocityVector);
        Ammo.destroy(velocityVector); // Clean up temporary vector
        body.setFriction(0.5);

        ball.userData.physics = {
            body: body,
        };

        this.world.addRigidBody(body);
        this.rigidBodies.push(ball);
    }

    createRigidBody(threeObject, physicsShape, mass, pos, quat) {
        threeObject.position.copy(pos);
        threeObject.quaternion.copy(quat);

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        
        // Create temporary vectors for transform setup
        const originVector = new Ammo.btVector3(pos.x, pos.y, pos.z);
        const rotationQuat = new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w);
        
        transform.setOrigin(originVector);
        transform.setRotation(rotationQuat);
        var motionState = new Ammo.btDefaultMotionState(transform);

        var localInertia = new Ammo.btVector3(0, 0, 0);
        physicsShape.calculateLocalInertia(mass, localInertia);

        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
        var body = new Ammo.btRigidBody(rbInfo);
        
        // Clean up temporary objects
        Ammo.destroy(originVector);
        Ammo.destroy(rotationQuat);
        Ammo.destroy(transform);
        Ammo.destroy(localInertia);
        Ammo.destroy(rbInfo);

        if (mass > 0) {
            body.setActivationState(4);
        }

        return body;
    }
}

export default ThrowBallEvent;
