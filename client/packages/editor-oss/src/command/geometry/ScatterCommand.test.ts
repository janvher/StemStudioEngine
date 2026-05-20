import * as THREE from "three";
import {describe, it, expect, beforeEach, vi} from "vitest";

vi.mock("../../global", () => {
    const app: any = {
        call: vi.fn(),
        on: vi.fn(),
        scene: new THREE.Scene(),
        editor: null as any,
    };
    app.editor = {
        get scene() { return app.scene; },
        addObject: vi.fn((obj: any) => {
            app.scene.add(obj);
            app.call("objectAdded", null, obj);
        }),
        removeObject: vi.fn((obj: any) => {
            app.scene.remove(obj);
            app.call("objectRemoved", null, obj);
        }),
        select: vi.fn(),
        deselect: vi.fn(),
        objectByUuid: vi.fn((uuid: string) => app.scene.getObjectByProperty("uuid", uuid) ?? null),
    };
    return {default: {app}};
});

vi.mock("i18next", () => ({
    t: (s: string) => s,
}));

import global from "../../global";
import {ScatterCommand} from "./ScatterCommand";

function makeSource(): THREE.Mesh {
    return new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial());
}

function makeTarget(): THREE.Mesh {
    return new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial());
}

describe("ScatterCommand", () => {
    beforeEach(() => {
        const app = (global as any).app;
        app.scene = new THREE.Scene();
        (app.call as ReturnType<typeof vi.fn>).mockClear();
    });

    it("validates source must be a mesh", () => {
        const fake = new THREE.Object3D();
        const target = makeTarget();
        expect(() => new ScatterCommand(fake as any, target, {count: 10})).toThrow();
    });

    it("validates target must be a mesh", () => {
        const source = makeSource();
        const fake = new THREE.Object3D();
        expect(() => new ScatterCommand(source, fake as any, {count: 10})).toThrow();
    });

    it("validates count >= 1", () => {
        const source = makeSource();
        const target = makeTarget();
        expect(() => new ScatterCommand(source, target, {count: 0})).toThrow();
    });

    it("adds an InstancedMesh to the scene on execute", async () => {
        const source = makeSource();
        const target = makeTarget();
        const cmd = new ScatterCommand(source, target, {count: 20, seed: 5});
        const result = await cmd.execute();
        expect(result.status).toBe("success");
        const scene = (global as any).app.scene as THREE.Scene;
        const instanced = scene.children.find(c => (c as any).isInstancedMesh);
        expect(instanced).toBeDefined();
        expect((instanced as THREE.InstancedMesh).count).toBe(20);
    });

    it("fires objectAdded so collaboration sync replicates the scatter", async () => {
        const source = makeSource();
        const target = makeTarget();
        const cmd = new ScatterCommand(source, target, {count: 5, seed: 1});
        await cmd.execute();
        const callSpy = (global as any).app.call as ReturnType<typeof vi.fn>;
        const added = callSpy.mock.calls.filter(c => c[0] === "objectAdded");
        expect(added.length).toBeGreaterThanOrEqual(1);
    });

    it("undo removes the scatter mesh", async () => {
        const source = makeSource();
        const target = makeTarget();
        const cmd = new ScatterCommand(source, target, {count: 5, seed: 1});
        await cmd.execute();
        const scene = (global as any).app.scene as THREE.Scene;
        const countAfter = scene.children.filter(c => (c as any).isInstancedMesh).length;
        expect(countAfter).toBe(1);
        cmd.undo();
        const countUndone = scene.children.filter(c => (c as any).isInstancedMesh).length;
        expect(countUndone).toBe(0);
    });
});
