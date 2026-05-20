import {Group, Object3D} from "three";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import BehaviorPluginManager from "./BehaviorPluginManager";
import type {Behavior} from "../../behaviors/Behavior";
import type BehaviorData from "../../behaviors/BehaviorData";

class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
}

const OriginalWorker = globalThis.Worker;

// Minimal mock editor — only the fields BehaviorPluginManager accesses
const createMockEditor = () => {
    const callFn = vi.fn();
    return {
        engine: {call: callFn},
        call: callFn,
    } as any;
};

const createMockPlugin = (overrides: Partial<Behavior> = {}): Behavior =>
    ({
        uuid: "plugin-uuid",
        id: "test-behavior",
        attributes: {},
        onEditorAttributesUpdated: vi.fn(),
        onEditorAdded: vi.fn(),
        ...overrides,
    }) as unknown as Behavior;

const createBehaviorData = (overrides: Partial<BehaviorData> = {}): BehaviorData => ({
    id: "test-behavior",
    uuid: "behavior-uuid-1",
    enabled: true,
    priority: 0,
    attributesData: {},
    ...overrides,
});

const createObjectWithBehaviors = (behaviors: BehaviorData[]): Object3D => {
    const obj = new Object3D();
    obj.userData.behaviors = behaviors;
    return obj;
};

// Mock Comlink for worker bridge tests
const mockProxy = {
    init: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    sendMessage: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
    setOnPostToMain: vi.fn(),
    [Symbol.for("Comlink.releaseProxy")]: vi.fn(),
};

vi.mock("comlink", () => {
    const releaseProxy = Symbol.for("Comlink.releaseProxy");
    return {
        wrap: vi.fn(() => mockProxy),
        proxy: vi.fn((fn: any) => fn),
        releaseProxy,
    };
});

beforeEach(() => {
    (globalThis as any).Worker = MockWorker;
});

afterEach(() => {
    (globalThis as any).Worker = OriginalWorker;
    vi.restoreAllMocks();
});

describe("BehaviorPluginManager", () => {
    describe("behaviorReferencesAsset (via updateAssetRefs)", () => {
        it("detects a direct AssetRef attribute", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const behavior = createBehaviorData({
                uuid: "b1",
                attributesData: {
                    prefab: {assetId: "stem-123", revisionId: "rev-1"},
                },
            });
            const plugin = createMockPlugin({uuid: "b1"});
            manager.addPlugin(new Object3D(), plugin);

            const scene = new Group();
            scene.add(createObjectWithBehaviors([behavior]));

            manager.updateAssetRefs(scene, "stem-123");

            expect(plugin.onEditorAttributesUpdated).toHaveBeenCalled();
        });

        it("detects an AssetRef nested in an array", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const behavior = createBehaviorData({
                uuid: "b1",
                attributesData: {
                    prefabs: [
                        {assetId: "stem-aaa", revisionId: "rev-1"},
                        {assetId: "stem-bbb", revisionId: "rev-2"},
                    ],
                },
            });
            const plugin = createMockPlugin({uuid: "b1"});
            manager.addPlugin(new Object3D(), plugin);

            const scene = new Group();
            scene.add(createObjectWithBehaviors([behavior]));

            manager.updateAssetRefs(scene, "stem-bbb");

            expect(plugin.onEditorAttributesUpdated).toHaveBeenCalled();
        });

        it("detects an AssetRef nested in an object", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const behavior = createBehaviorData({
                uuid: "b1",
                attributesData: {
                    config: {
                        inner: {assetId: "model-xyz", revisionId: "rev-1"},
                    },
                },
            });
            const plugin = createMockPlugin({uuid: "b1"});
            manager.addPlugin(new Object3D(), plugin);

            const scene = new Group();
            scene.add(createObjectWithBehaviors([behavior]));

            manager.updateAssetRefs(scene, "model-xyz");

            expect(plugin.onEditorAttributesUpdated).toHaveBeenCalled();
        });

        it("returns false when no attributes reference the asset", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const behavior = createBehaviorData({
                uuid: "b1",
                attributesData: {
                    prefab: {assetId: "stem-other", revisionId: "rev-1"},
                    name: "hello",
                    count: 42,
                },
            });
            const plugin = createMockPlugin({uuid: "b1"});
            manager.addPlugin(new Object3D(), plugin);

            const scene = new Group();
            scene.add(createObjectWithBehaviors([behavior]));

            manager.updateAssetRefs(scene, "stem-123");

            expect(plugin.onEditorAttributesUpdated).not.toHaveBeenCalled();
        });

        it("returns false when attributesData is empty", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const behavior = createBehaviorData({uuid: "b1", attributesData: {}});
            const plugin = createMockPlugin({uuid: "b1"});
            manager.addPlugin(new Object3D(), plugin);

            const scene = new Group();
            scene.add(createObjectWithBehaviors([behavior]));

            manager.updateAssetRefs(scene, "stem-123");

            expect(plugin.onEditorAttributesUpdated).not.toHaveBeenCalled();
        });
    });

    describe("updateAssetRefs", () => {
        it("updates plugin attributes before calling onEditorAttributesUpdated", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const attributesData = {
                prefab: {assetId: "stem-123", revisionId: "rev-2"},
            };
            const behavior = createBehaviorData({uuid: "b1", attributesData});
            const plugin = createMockPlugin({uuid: "b1"});

            let capturedAttributes: Record<string, any> | undefined;
            (plugin as any).onEditorAttributesUpdated = vi.fn(() => {
                capturedAttributes = (plugin as any).attributes;
            });

            manager.addPlugin(new Object3D(), plugin);

            const scene = new Group();
            scene.add(createObjectWithBehaviors([behavior]));

            manager.updateAssetRefs(scene, "stem-123");

            expect(capturedAttributes).toBe(attributesData);
        });

        it("only notifies plugins whose behaviors reference the changed asset", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const matchingBehavior = createBehaviorData({
                uuid: "b1",
                attributesData: {prefab: {assetId: "stem-123", revisionId: "rev-1"}},
            });
            const unrelatedBehavior = createBehaviorData({
                uuid: "b2",
                attributesData: {model: {assetId: "model-456", revisionId: "rev-1"}},
            });

            const matchingPlugin = createMockPlugin({uuid: "b1"});
            const unrelatedPlugin = createMockPlugin({uuid: "b2"});
            manager.addPlugin(new Object3D(), matchingPlugin);
            manager.addPlugin(new Object3D(), unrelatedPlugin);

            const scene = new Group();
            scene.add(createObjectWithBehaviors([matchingBehavior]));
            scene.add(createObjectWithBehaviors([unrelatedBehavior]));

            manager.updateAssetRefs(scene, "stem-123");

            expect(matchingPlugin.onEditorAttributesUpdated).toHaveBeenCalled();
            expect(unrelatedPlugin.onEditorAttributesUpdated).not.toHaveBeenCalled();
        });

        it("fires objectChanged only for affected objects", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const matchingBehavior = createBehaviorData({
                uuid: "b1",
                attributesData: {prefab: {assetId: "stem-123", revisionId: "rev-1"}},
            });
            const unrelatedBehavior = createBehaviorData({
                uuid: "b2",
                attributesData: {name: "foo"},
            });

            manager.addPlugin(new Object3D(), createMockPlugin({uuid: "b1"}));

            const scene = new Group();
            const affectedObj = createObjectWithBehaviors([matchingBehavior]);
            const unaffectedObj = createObjectWithBehaviors([unrelatedBehavior]);
            scene.add(affectedObj);
            scene.add(unaffectedObj);

            manager.updateAssetRefs(scene, "stem-123");

            const calls = editor.engine.call.mock.calls.filter(
                (c: any[]) => c[0] === "objectChanged",
            );
            expect(calls).toHaveLength(1);
            expect(calls[0][2]).toBe(affectedObj);
        });

        it("handles behaviors without a registered plugin gracefully", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            // No plugin registered for this behavior
            const behavior = createBehaviorData({
                uuid: "unregistered",
                attributesData: {prefab: {assetId: "stem-123", revisionId: "rev-1"}},
            });

            const scene = new Group();
            scene.add(createObjectWithBehaviors([behavior]));

            // Should not throw
            expect(() => manager.updateAssetRefs(scene, "stem-123")).not.toThrow();

            // objectChanged should still fire since the behavior references the asset
            const calls = editor.engine.call.mock.calls.filter(
                (c: any[]) => c[0] === "objectChanged",
            );
            expect(calls).toHaveLength(1);
        });

        it("traverses nested children", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);

            const behavior = createBehaviorData({
                uuid: "b1",
                attributesData: {prefab: {assetId: "stem-123", revisionId: "rev-1"}},
            });
            const plugin = createMockPlugin({uuid: "b1"});
            manager.addPlugin(new Object3D(), plugin);

            const scene = new Group();
            const parent = new Group();
            const child = createObjectWithBehaviors([behavior]);
            parent.add(child);
            scene.add(parent);

            manager.updateAssetRefs(scene, "stem-123");

            expect(plugin.onEditorAttributesUpdated).toHaveBeenCalled();
        });
    });

    describe("worker lifecycle", () => {
        it("starts plugin workers with editor runtime init data", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);
            const getWorkerInitData = vi.fn(() => ({runtime: "editor", foo: "bar"}));
            const plugin = createMockPlugin({
                workerClass: MockWorker as any,
                getWorkerInitData,
            });

            manager.addPlugin(new Object3D(), plugin);
            expect(plugin._workerBridge?.isActive).toBe(true);
            expect(getWorkerInitData).toHaveBeenCalledWith("editor");

            manager.clear();
            expect(plugin._workerBridge?.isActive ?? false).toBe(false);
        });

        it("skips worker init when no workerClass is provided", () => {
            const editor = createMockEditor();
            const manager = new BehaviorPluginManager(editor);
            const plugin = createMockPlugin();

            manager.addPlugin(new Object3D(), plugin);
            expect(plugin._workerBridge).toBeUndefined();
        });
    });
});
