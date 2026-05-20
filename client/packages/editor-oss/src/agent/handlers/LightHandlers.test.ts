import * as THREE from "three";
import {describe, expect, it, vi} from "vitest";

vi.mock("../../command/Commands", () => ({
    SetColorCommand: class {
        execute() {
            return {status: "success"};
        }
    },
    SetValueCommand: class {
        execute() {
            return {status: "success"};
        }
    },
}));

import {LightHandlers} from "./LightHandlers";

function createHarness() {
    const scene = new THREE.Scene();
    const app = {
        scene,
        editor: {scene},
        call: vi.fn(),
    };

    return {
        scene,
        handlers: new LightHandlers(app as any),
    };
}

describe("LightHandlers getters", () => {
    it("returns compact light settings", () => {
        const {scene, handlers} = createHarness();
        const light = new THREE.DirectionalLight(0xff8844, 2.5);
        light.name = "Sun";
        light.position.set(1, 2, 3);
        light.rotation.set(0.1, 0.2, 0.3);
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 1024);
        light.shadow.bias = -0.001;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = 4;
        scene.add(light);

        const result = handlers.handleGetLightSettings({target: "Sun"});

        expect(result.status).toBe("success");
        expect(result.data.name).toBe("Sun");
        expect(result.data.type).toBe("DirectionalLight");
        expect(result.data.intensity).toBe(2.5);
        expect(result.data.color).toBe("#ff8844");
        expect(result.data.castShadow).toBe(true);
        expect(result.data.transform.position).toEqual({x: 1, y: 2, z: 3});
        expect(result.data.shadow).toEqual({
            mapSize: {width: 2048, height: 1024},
            bias: -0.001,
            normalBias: 0.02,
            radius: 4,
        });
    });

    it("fails when the target is not a light", () => {
        const {scene, handlers} = createHarness();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        mesh.name = "Box";
        scene.add(mesh);

        const result = handlers.handleGetLightSettings({target: "Box"});

        expect(result.status).toBe("failed");
        expect(result.message).toContain("not a light");
    });
});
