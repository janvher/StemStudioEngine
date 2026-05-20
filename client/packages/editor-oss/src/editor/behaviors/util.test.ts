import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import BehaviorObjectSettingsApplier from "./BehaviorObjectSettingsApplier";
import { swapExistingBehaviors } from "./util";
import BehaviorData from "../../behaviors/BehaviorData";

vi.mock("../Editor", () => ({ default: vi.fn() }));
vi.mock("../../prefab/util", () => ({
    isPrefab: () => false,
    isPrefabUnlocked: () => true,
}));

const createMockEditor = (configAttributes: Record<string, any> = {}, objectSettings?: any) => {
    const scene = new THREE.Group();

    const editor = {
        scene,
        behaviorConfigRegistry: {
            getConfig: vi.fn().mockReturnValue({
                attributes: configAttributes,
                objectSettings,
            }),
        },
        removeBehaviorPlugin: vi.fn(),
        addBehaviorPlugin: vi.fn(),
    };

    return { editor: editor as any, scene };
};

const createBehaviorData = (
    id: string,
    attributesData?: Record<string, any>,
    overrides?: Partial<BehaviorData>,
): BehaviorData => {
    return {
        id,
        uuid: overrides?.uuid ?? THREE.MathUtils.generateUUID(),
        enabled: overrides?.enabled ?? true,
        priority: overrides?.priority ?? 0,
        attributesData: attributesData ? { ...attributesData } : undefined,
        throttleConfig: overrides?.throttleConfig,
    };
};

const addBehaviorToObject = (object: THREE.Object3D, behavior: BehaviorData) => {
    if (!object.userData.behaviors) {
        object.userData.behaviors = [];
    }
    object.userData.behaviors.push(behavior);
};

describe("swapExistingBehaviors", () => {
    it("keeps behavior in userData.behaviors throughout the swap", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior", { speed: 5 });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(object.userData.behaviors).toHaveLength(1);
        expect(object.userData.behaviors[0]).toBe(behavior);
    });

    it("resets specified attributes while preserving others", () => {
        const { editor, scene } = createMockEditor({
            speed: { type: "number" },
            health: { type: "number" },
        });
        const object = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior", { speed: 10, health: 100 });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor, ["speed"]);

        expect(behavior.attributesData).not.toHaveProperty("speed");
        expect(behavior.attributesData!.health).toBe(100);
    });

    it("strips attributes removed from the config", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior", { speed: 5, oldAttr: "gone" });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(behavior.attributesData).not.toHaveProperty("oldAttr");
        expect(behavior.attributesData!.speed).toBe(5);
    });

    it("preserves enabled state", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior", { speed: 5 }, { enabled: false });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(behavior.enabled).toBe(false);
    });

    it("preserves uuid", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const originalUuid = "test-uuid-1234";
        const behavior = createBehaviorData("myBehavior", { speed: 5 }, { uuid: originalUuid });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(behavior.uuid).toBe(originalUuid);
    });

    it("reinitializes behavior plugin", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior", { speed: 5 });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(editor.removeBehaviorPlugin).toHaveBeenCalledWith(behavior.uuid);
        expect(editor.addBehaviorPlugin).toHaveBeenCalledWith(object, behavior);
    });

    it("handles multiple objects with the same behavior", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const obj1 = new THREE.Object3D();
        const obj2 = new THREE.Object3D();
        const behavior1 = createBehaviorData("myBehavior", { speed: 1 });
        const behavior2 = createBehaviorData("myBehavior", { speed: 2 });
        addBehaviorToObject(obj1, behavior1);
        addBehaviorToObject(obj2, behavior2);
        scene.add(obj1);
        scene.add(obj2);

        swapExistingBehaviors("myBehavior", editor);

        expect(obj1.userData.behaviors).toHaveLength(1);
        expect(obj2.userData.behaviors).toHaveLength(1);
        expect(editor.removeBehaviorPlugin).toHaveBeenCalledTimes(2);
        expect(editor.addBehaviorPlugin).toHaveBeenCalledTimes(2);
    });

    it("skips objects without behaviors", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(editor.removeBehaviorPlugin).not.toHaveBeenCalled();
    });

    it("skips behaviors with a different id", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const otherBehavior = createBehaviorData("otherBehavior", { speed: 5 });
        addBehaviorToObject(object, otherBehavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(otherBehavior.id).toBe("otherBehavior");
        expect(editor.removeBehaviorPlugin).not.toHaveBeenCalled();
    });

    it("does nothing with null editor", () => {
        swapExistingBehaviors("myBehavior", null);
    });

    it("handles behavior with no attributesData", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior");
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor, ["speed"]);

        expect(object.userData.behaviors).toHaveLength(1);
    });

    it("processes child objects in the scene hierarchy", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const parent = new THREE.Object3D();
        const child = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior", { speed: 5 });
        addBehaviorToObject(child, behavior);
        parent.add(child);
        scene.add(parent);

        swapExistingBehaviors("myBehavior", editor);

        expect(child.userData.behaviors).toHaveLength(1);
        expect(editor.removeBehaviorPlugin).toHaveBeenCalledWith(behavior.uuid);
    });

    it("preserves throttleConfig and priority", () => {
        const { editor, scene } = createMockEditor({ speed: { type: "number" } });
        const object = new THREE.Object3D();
        const throttleConfig = { interval: 100 } as any;
        const behavior = createBehaviorData("myBehavior", { speed: 5 }, {
            priority: 5,
            throttleConfig,
        });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        expect(behavior.priority).toBe(5);
        expect(behavior.throttleConfig).toBe(throttleConfig);
    });

    it("applies object settings from updated config", () => {
        const objectSettings = { physics: { enabled: true } };
        const { editor, scene } = createMockEditor({ speed: { type: "number" } }, objectSettings);
        const object = new THREE.Object3D();
        const behavior = createBehaviorData("myBehavior", { speed: 5 });
        addBehaviorToObject(object, behavior);
        scene.add(object);

        const spy = vi.spyOn(BehaviorObjectSettingsApplier, "applyObjectSettings");
        swapExistingBehaviors("myBehavior", editor);

        expect(spy).toHaveBeenCalledWith(object, objectSettings);
        spy.mockRestore();
    });

    it("handles multiple behaviors on the same object", () => {
        const { editor, scene } = createMockEditor({
            speed: { type: "number" },
        });
        const object = new THREE.Object3D();
        const behavior1 = createBehaviorData("myBehavior", { speed: 1 });
        const behavior2 = createBehaviorData("otherBehavior", { speed: 2 });
        const behavior3 = createBehaviorData("myBehavior", { speed: 3 });
        addBehaviorToObject(object, behavior1);
        addBehaviorToObject(object, behavior2);
        addBehaviorToObject(object, behavior3);
        scene.add(object);

        swapExistingBehaviors("myBehavior", editor);

        // All three behaviors should remain
        expect(object.userData.behaviors).toHaveLength(3);
        // Only the two matching behaviors should have been reinitialized
        expect(editor.removeBehaviorPlugin).toHaveBeenCalledTimes(2);
        expect(editor.addBehaviorPlugin).toHaveBeenCalledTimes(2);
        // The non-matching behavior should be untouched
        expect(behavior2.id).toBe("otherBehavior");
    });
});
