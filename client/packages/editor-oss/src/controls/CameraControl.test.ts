import * as THREE from "three";
import {ParticleEmitter, ParticleSystem} from "three.quarks";
import {beforeEach, describe, expect, it} from "vitest";

import {CameraControl} from "./CameraControl";
import {createFreshParticleConfig} from "@stem/editor-oss/services";

function makeEmitter(): ParticleEmitter {
    const system = new ParticleSystem(createFreshParticleConfig());
    return new ParticleEmitter(system);
}

function createControl(character: THREE.Object3D | null) {
    const ctrl = Object.create(CameraControl.prototype) as unknown as Record<string, unknown>;
    ctrl.character = character;
    return ctrl;
}

function callIsValidIntersect(ctrl: any, object: THREE.Object3D | null) {
    return ctrl.isValidIntersect(object);
}

function callIsValidOcclusionObject(ctrl: any, object: THREE.Object3D) {
    return ctrl.isValidOcclusionObject(object);
}

function setPhysics(object: THREE.Object3D, enabled: boolean) {
    object.userData.physics = {enabled};
}

describe("CameraControl.isValidIntersect (VFX exclusion)", () => {
    let character: THREE.Object3D;

    beforeEach(() => {
        character = new THREE.Object3D();
        character.name = "Player";
    });

    it("rejects a ParticleEmitter directly", () => {
        const ctrl = createControl(character);
        const emitter = makeEmitter();
        setPhysics(emitter, true); // even with physics enabled, VFX must be ignored

        expect(callIsValidIntersect(ctrl, emitter)).toBe(false);
    });

    it("rejects descendants of a ParticleEmitter via the parent walk", () => {
        const ctrl = createControl(character);
        const emitter = makeEmitter();
        const particleChild = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial(),
        );
        emitter.add(particleChild);
        setPhysics(emitter, true);

        expect(callIsValidIntersect(ctrl, particleChild)).toBe(false);
    });

    it("returns false when no character has been assigned", () => {
        const ctrl = createControl(null);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        setPhysics(mesh, true);

        expect(callIsValidIntersect(ctrl, mesh)).toBe(false);
    });

    it("rejects a mesh whose ancestor chain has no physics enabled", () => {
        const ctrl = createControl(character);
        const parent = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        parent.add(mesh);

        expect(callIsValidIntersect(ctrl, mesh)).toBe(false);
    });

    it("accepts a mesh whose ancestor chain has physics enabled", () => {
        const ctrl = createControl(character);
        const parent = new THREE.Group();
        setPhysics(parent, true);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        parent.add(mesh);

        expect(callIsValidIntersect(ctrl, mesh)).toBe(true);
    });

    it("rejects the character itself", () => {
        const ctrl = createControl(character);
        setPhysics(character, true);

        expect(callIsValidIntersect(ctrl, character)).toBe(false);
    });

    it("rejects skinned meshes (player visual rig)", () => {
        const ctrl = createControl(character);
        const skinned = new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        setPhysics(skinned, true);

        expect(callIsValidIntersect(ctrl, skinned)).toBe(false);
    });

    it("rejects objects flagged with disableCameraCollision", () => {
        const ctrl = createControl(character);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        setPhysics(mesh, true);
        mesh.userData.disableCameraCollision = true;

        expect(callIsValidIntersect(ctrl, mesh)).toBe(false);
    });

    it("ignores Light objects (lights are not pushable obstacles, no physics)", () => {
        const ctrl = createControl(character);
        const light = new THREE.PointLight();

        expect(callIsValidIntersect(ctrl, light)).toBe(false);
    });
});

describe("CameraControl.isValidOcclusionObject (VFX exclusion)", () => {
    let character: THREE.Object3D;

    beforeEach(() => {
        character = new THREE.Object3D();
        character.name = "Player";
    });

    it("rejects a ParticleEmitter so VFX materials are not cloned to transparency", () => {
        const ctrl = createControl(character);
        const emitter = makeEmitter();

        expect(callIsValidOcclusionObject(ctrl, emitter)).toBe(false);
    });

    it("rejects mesh descendants of a ParticleEmitter", () => {
        const ctrl = createControl(character);
        const emitter = makeEmitter();
        const child = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
        emitter.add(child);

        expect(callIsValidOcclusionObject(ctrl, child)).toBe(false);
    });

    it("rejects the character and its descendants", () => {
        const ctrl = createControl(character);
        const child = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        character.add(child);

        expect(callIsValidOcclusionObject(ctrl, child)).toBe(false);
    });

    it("rejects Light objects (not meshes, must never be made transparent)", () => {
        const ctrl = createControl(character);
        const light = new THREE.DirectionalLight();

        expect(callIsValidOcclusionObject(ctrl, light)).toBe(false);
    });

    it("accepts a regular standalone mesh between camera and player", () => {
        const ctrl = createControl(character);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

        expect(callIsValidOcclusionObject(ctrl, mesh)).toBe(true);
    });
});
