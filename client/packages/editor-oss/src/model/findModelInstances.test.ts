import {Group, Object3D} from "three";
import {describe, expect, it} from "vitest";

import {findModelInstances} from "./findModelInstances";

const createObject = (userData: Record<string, unknown> = {}): Object3D => {
    const obj = new Object3D();
    Object.assign(obj.userData, userData);
    return obj;
};

describe("findModelInstances", () => {
    it("finds objects by userData.modelId", () => {
        const scene = new Group();
        const model = createObject({modelId: "model-123"});
        scene.add(model);

        const uuids = findModelInstances(scene, "model-123");

        expect(uuids).toEqual([model.uuid]);
    });

    it("finds objects by legacy userData.ID", () => {
        const scene = new Group();
        const model = createObject({ID: "model-123"});
        scene.add(model);

        const uuids = findModelInstances(scene, "model-123");

        expect(uuids).toEqual([model.uuid]);
    });

    it("finds multiple instances", () => {
        const scene = new Group();
        const model1 = createObject({modelId: "model-123"});
        const model2 = createObject({modelId: "model-123"});
        const other = createObject({modelId: "model-other"});
        scene.add(model1, model2, other);

        const uuids = findModelInstances(scene, "model-123");

        expect(uuids).toHaveLength(2);
        expect(uuids).toContain(model1.uuid);
        expect(uuids).toContain(model2.uuid);
    });

    it("stops at prefab boundaries", () => {
        const scene = new Group();
        const prefab = createObject({prefabId: "prefab-abc"});
        const nestedModel = createObject({modelId: "model-123"});
        prefab.add(nestedModel);
        scene.add(prefab);

        const uuids = findModelInstances(scene, "model-123");

        expect(uuids).toEqual([]);
    });

    it("finds nested objects outside prefabs", () => {
        const scene = new Group();
        const group = new Group();
        const model = createObject({modelId: "model-123"});
        group.add(model);
        scene.add(group);

        const uuids = findModelInstances(scene, "model-123");

        expect(uuids).toEqual([model.uuid]);
    });

    it("returns empty array when no matches", () => {
        const scene = new Group();
        scene.add(createObject({modelId: "model-other"}));

        const uuids = findModelInstances(scene, "model-123");

        expect(uuids).toEqual([]);
    });
});
