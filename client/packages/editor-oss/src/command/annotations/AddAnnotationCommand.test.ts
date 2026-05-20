import * as THREE from "three";
import {describe, it, expect, beforeEach, vi} from "vitest";

// Shared scene + event spy across the test file. vi.mock hoists, so the
// factory builds everything inline and exports via module closure. The
// addObject/removeObject implementations read `app.editor.scene` at call
// time (not via closure) so beforeEach can swap in a fresh scene per test.
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
        renderer: {domElement: {width: 800, height: 600}},
    };
    return {default: {app}};
});

vi.mock("i18next", () => ({
    t: (s: string) => s,
}));

import global from "../../global";
import {DistanceAnnotation} from "../../object/annotation/DistanceAnnotation";
import {AddAnnotationCommand} from "./AddAnnotationCommand";

describe("AddAnnotationCommand", () => {
    beforeEach(() => {
        const app = (global as any).app;
        app.scene = new THREE.Scene();
        (app.call as ReturnType<typeof vi.fn>).mockClear();
    });

    it("adds the annotation to the scene on execute", async () => {
        const ann = new DistanceAnnotation(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
        const cmd = new AddAnnotationCommand(ann);
        const result = await cmd.execute();
        expect(result.status).toBe("success");
        const app = (global as any).app;
        const found = app.scene.getObjectByProperty("uuid", ann.uuid);
        expect(found).toBe(ann);
    });

    it("fires objectAdded so collaboration sync replicates the new annotation", async () => {
        // Collaboration pipeline listens for objectAdded, serializes the
        // object, and ships the snapshot to peers. AddObjectCommand is the
        // canonical source for that event — this test locks in that the
        // annotation goes through that path.
        const ann = new DistanceAnnotation(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
        const cmd = new AddAnnotationCommand(ann);
        await cmd.execute();
        const app = (global as any).app;
        const calls = (app.call as ReturnType<typeof vi.fn>).mock.calls;
        const addedCalls = calls.filter(c => c[0] === "objectAdded");
        expect(addedCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("undo removes the annotation from the scene", async () => {
        const ann = new DistanceAnnotation(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
        const cmd = new AddAnnotationCommand(ann);
        await cmd.execute();
        cmd.undo();
        const app = (global as any).app;
        const found = app.scene.getObjectByProperty("uuid", ann.uuid);
        expect(found ?? null).toBe(null);
    });
});
