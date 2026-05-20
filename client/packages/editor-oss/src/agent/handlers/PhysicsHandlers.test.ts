import * as THREE from "three";
import {describe, expect, it, vi} from "vitest";

vi.mock("../../physics/PhysicsEngineFactory", () => ({
    PhysicsEngineFactory: {
        preload: vi.fn(() => Promise.resolve()),
    },
}));

import {PhysicsHandlers} from "./PhysicsHandlers";

function createHarness() {
    const scene = new THREE.Scene();
    const app = {
        scene,
        editor: {scene},
        call: vi.fn(),
        physics: {
            addObject: vi.fn(),
            removeObject: vi.fn(),
        },
    };

    return {
        scene,
        handlers: new PhysicsHandlers(app as any),
    };
}

describe("PhysicsHandlers getters", () => {
    it("returns object physics settings", () => {
        const {scene, handlers} = createHarness();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        mesh.name = "Crate";
        mesh.userData.physics = {
            enabled: true,
            shape: "btBoxShape",
            mass: 12,
            friction: 0.6,
            restitution: 0.2,
        };
        scene.add(mesh);

        const result = handlers.handleGetPhysicsSettings({target: "Crate"});

        expect(result.status).toBe("success");
        expect(result.data.name).toBe("Crate");
        expect(result.data.physics).toEqual({
            enabled: true,
            shape: "btBoxShape",
            mass: 12,
            friction: 0.6,
            restitution: 0.2,
        });
    });

    it("returns null physics settings when no physics data exists", () => {
        const {scene, handlers} = createHarness();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        mesh.name = "StaticMesh";
        scene.add(mesh);

        const result = handlers.handleGetPhysicsSettings({target: "StaticMesh"});

        expect(result.status).toBe("success");
        expect(result.data.physics).toBeNull();
    });
});
