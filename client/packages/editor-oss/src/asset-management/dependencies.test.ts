vi.mock('three', async (importOriginal) => ({
    ...await importOriginal<typeof import('three')>(),
    Audio: vi.fn(),
    AudioListener: vi.fn(),
}));

import { Object3D } from "three";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AssetRef, isAssetRef } from "./AssetRef";
import { AssetResolutionContext, setAssetResolutionContext } from './AssetResolutionContext';
import { findDirectDependencies, mapAssetIds, remapBehaviorAttributeUuids, removeAssetRefs, resolveBehaviorAttributeAssetRefs, resolveLambdaComponentDataAssetRefs } from "./dependencies";
import { AssetType } from '@stem/network/api/asset';
import { getModelId } from '../model/util';
import { isPrefab, getPrefabId } from "../prefab/util";
import { clearScriptDependencyEntries, seedScriptDependencyEntry } from "../script-runtime/scriptDependencyCache";
import * as SceneUtil from "../utils/SceneUtil";
import {getVfxId} from "../vfx/util";

vi.mock("../utils/SceneUtil", () => ({
    traverseSceneDepthFirst: vi.fn(),
}));

beforeEach(() => {
    clearScriptDependencyEntries();
});

describe("findDirectDependencies", () => {
    const mockTraverse = vi.mocked(SceneUtil.traverseSceneDepthFirst);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const makeObject = (userData: any = {}) => {
        const obj = new Object3D();
        obj.userData = userData;
        return obj;
    };

    const makePrefabObject = (assetId: string) => {
        const obj = new Object3D();
        obj.userData.prefabId = assetId;
        return obj;
    };

    it("should return an empty array when there are no dependencies", () => {
        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject();
        const result = findDirectDependencies(obj);
        expect(result).toEqual([]);
    });

    it("should add asset references found in behavior attribute values", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };

        mockTraverse.mockImplementation((_, callback) => {
            const child = makeObject({
                behaviors: [
                    { attributesData: { something: ref } },
                ],
            });
            callback(child);
        });

        const obj = makeObject();
        const result = findDirectDependencies(obj);

        expect(result).toEqual([ref]);
        expect(isAssetRef(result[0])).toBe(true);
    });

    it("should add asset references found in nested behavior attribute values", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };

        mockTraverse.mockImplementation((_, callback) => {
            const child = makeObject({
                behaviors: [
                    { attributesData: { group: { nested: ref } } },
                ],
            });
            callback(child);
        });

        const obj = makeObject();
        const result = findDirectDependencies(obj);

        expect(result).toEqual([ref]);
    });

    it("should add asset references found in arrays within behavior attributes", () => {
        const ref1: AssetRef = { assetId: "a1", revisionId: "r1" };
        const ref2: AssetRef = { assetId: "a2", revisionId: "r2" };

        mockTraverse.mockImplementation((_, callback) => {
            const child = makeObject({
                behaviors: [
                    { attributesData: { refs: [ref1, ref2] } },
                ],
            });
            callback(child);
        });

        const obj = makeObject();
        const result = findDirectDependencies(obj);

        expect(result).toHaveLength(2);
        expect(result).toContainEqual(ref1);
        expect(result).toContainEqual(ref2);
    });

    it("should not include asset references on the root object's behaviors", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };

        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({
            behaviors: [{ attributesData: { someAttr: ref } }],
        });

        const result = findDirectDependencies(obj);
        expect(result).toEqual([]);
    });

    it("should add prefab references for child prefab objects", () => {
        const childPrefab = makePrefabObject("p1");

        // Confirm real prefab utils work with our mocks
        expect(isPrefab(childPrefab)).toBe(true);
        expect(getPrefabId(childPrefab)).toBe("p1");

        mockTraverse.mockImplementation((_, callback) => {
            callback(childPrefab);
        });

        const obj = makeObject();
        setAssetResolutionContext(obj, { assetIdToRevisionId: { p1: "r1" } });
        const result = findDirectDependencies(obj);

        expect(result).toEqual([{ assetId: "p1", revisionId: "r1" }]);
    });

    it("should add model asset instance references", () => {
        const modelObj = makeObject();
        modelObj.userData.modelId = "model1";   // what isModelAssetInstance() checks
        mockTraverse.mockImplementation((_, callback) => {
            callback(modelObj);
        });

        const root = makeObject();
        setAssetResolutionContext(root, {
            assetIdToRevisionId: { model1: "rev-model1" },
        });

        const result = findDirectDependencies(root);

        expect(result).toEqual([
            { assetId: "model1", revisionId: "rev-model1" },
        ]);
    });

    it("should NOT add model dependency when object is also a child prefab", () => {
        const prefabModelObj = makePrefabObject("prefab1");
        prefabModelObj.userData.modelId = "model1";

        // isPrefab must return true
        expect(isPrefab(prefabModelObj)).toBe(true);

        mockTraverse.mockImplementation((_, callback) => {
            callback(prefabModelObj);
        });

        const root = makeObject();
        setAssetResolutionContext(root, {
            assetIdToRevisionId: {
                prefab1: "rev-p1",
                model1: "rev-model1",
            },
        });

        const result = findDirectDependencies(root);

        // Should include only the prefab, not the model
        expect(result).toEqual([
            { assetId: "prefab1", revisionId: "rev-p1" },
        ]);
    });

    it("should not traverse children of model asset instances", () => {
        const modelObj = makeObject();
        modelObj.userData.modelId = "model1";

        const calls: boolean[] = [];

        mockTraverse.mockImplementation((_, callback) => {
            calls.push(callback(modelObj));
        });

        const root = makeObject();
        setAssetResolutionContext(root, {
            assetIdToRevisionId: { model1: "rev-model1" },
        });

        findDirectDependencies(root);

        // `shouldTraverseChildren` must be false
        expect(calls).toEqual([false]);
    });

    it("should not traverse children of child prefabs or server objects", () => {
        const calls: any[] = [];

        mockTraverse.mockImplementation((_, callback) => {
            const childPrefab = makePrefabObject("p1");
            const serverObj = makeObject({ Server: true });
            calls.push(callback(childPrefab));
            calls.push(callback(serverObj));
        });

        const obj = makeObject();
        setAssetResolutionContext(obj, { assetIdToRevisionId: { p1: "r1" } });
        findDirectDependencies(obj);

        // The callback returns `shouldTraverseChildren`, which should be false for both
        expect(calls).toEqual([false, false]);
    });

    it("should deduplicate identical asset references", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };

        mockTraverse.mockImplementation((_, callback) => {
            const child = makeObject({
                behaviors: [
                    { attributesData: { a: ref } },
                    { attributesData: { b: ref } },
                ],
            });
            callback(child);
        });

        const obj = makeObject();
        const result = findDirectDependencies(obj);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(ref);
    });

    it("should include transitive import dependencies for behavior assets", () => {
        const behaviorId = "0123456789abcdef01234567";
        const importId = "1123456789abcdef01234567";
        const nestedImportId = "2123456789abcdef01234567";

        seedScriptDependencyEntry({
            assetId: behaviorId,
            revisionId: "behavior-rev",
            ownerType: "behavior",
            dependencies: {
                [importId]: "import-rev",
            },
        });
        seedScriptDependencyEntry({
            assetId: importId,
            revisionId: "import-rev",
            ownerType: "import",
            dependencies: {
                [nestedImportId]: "nested-import-rev",
            },
        });

        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({
            behaviors: [{id: behaviorId, attributesData: {}}],
        });
        setAssetResolutionContext(obj, {
            assetIdToRevisionId: {[behaviorId]: "behavior-rev"},
        });

        const result = findDirectDependencies(obj);

        expect(result).toEqual([
            {assetId: behaviorId, revisionId: "behavior-rev"},
            {assetId: importId, revisionId: "import-rev"},
            {assetId: nestedImportId, revisionId: "nested-import-rev"},
        ]);
    });

    it("should add material settings string texture dependencies from single settings objects", () => {
        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({
            materialSettings: {
                textures: {
                    base: "aabbccddeeff001122334455",
                },
            },
        });
        setAssetResolutionContext(obj, {
            assetIdToRevisionId: { aabbccddeeff001122334455: "rev-base" },
        });

        const result = findDirectDependencies(obj);
        expect(result).toEqual([{ assetId: "aabbccddeeff001122334455", revisionId: "rev-base" }]);
    });

    it("should add AssetRef texture dependencies from material settings", () => {
        const textureRef: AssetRef = { assetId: "img1", revisionId: "rev-img1" };

        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({
            materialSettings: {
                textures: {
                    base: textureRef,
                },
            },
        });

        const result = findDirectDependencies(obj);
        expect(result).toEqual([textureRef]);
    });
});

describe("resolveBehaviorAttributeAssetRefs", () => {
    let object: Object3D;
    let context: AssetResolutionContext;

    beforeEach(() => {
        object = new Object3D();
        object.userData = {};
        context = {
            assetIdToRevisionId: { a1: "r1", a2: "r2", prefab1: "rev-prefab" },
            logicalIdToAssetId: {},
        };
        vi.resetAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => {}); // silence expected errors
    });

    it("should update behavior assetRefs based on the provided context", () => {
        const ref1: AssetRef = { assetId: "a1", revisionId: "old" };
        const ref2: AssetRef = { assetId: "a2", revisionId: "old" };

        object.userData.behaviors = [
            { attributesData: { ref1, ref2 } },
        ];

        // Give the object a context as well - it should be IGNORED in favor of
        // the one provided to resolveBehaviorAttributeAssetRefs().
        setAssetResolutionContext(object, {
            assetIdToRevisionId: { a1: "ignoredR1", a2: "ignoredR2" },
        });

        resolveBehaviorAttributeAssetRefs(object, context);

        expect(ref1.revisionId).toBe("r1");
        expect(ref2.revisionId).toBe("r2");
    });

    it("should log an error if a behavior assetRef cannot be resolved", () => {
        const ref: AssetRef = { assetId: "missing", revisionId: "old" };
        object.userData.behaviors = [{ attributesData: { ref } }];

        resolveBehaviorAttributeAssetRefs(object, context);

        expect(console.error).toHaveBeenCalledWith(
            "Failed to resolve asset ref",
            expect.anything(),
        );
        expect(ref.revisionId).toBe("old");
    });

    it("should recurse into child objects using inherited context", () => {
        const child = new Object3D();
        const ref: AssetRef = { assetId: "a1", revisionId: "old" };
        child.userData.behaviors = [{ attributesData: { ref } }];

        object.add(child);

        resolveBehaviorAttributeAssetRefs(object, context, true);

        expect(ref.revisionId).toBe("r1");
    });

    it("should use the object's own revision context for its children", () => {
        const child = new Object3D();
        const ref: AssetRef = { assetId: "a2", revisionId: "old" };
        child.userData.behaviors = [{ attributesData: { ref } }];

        object.add(child);

        // Give parent its own revision context
        setAssetResolutionContext(object, {
            assetIdToRevisionId: { a2: "r2-local" },
            logicalIdToAssetId: {},
        });

        resolveBehaviorAttributeAssetRefs(object, context, true);

        expect(ref.revisionId).toBe("r2-local");
    });

    it("should do nothing if there are no behaviors", () => {
        resolveBehaviorAttributeAssetRefs(object, context);
        expect(console.error).not.toHaveBeenCalled();
    });

    it("should resolve nested behavior attribute asset refs", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "old" };

        object.userData.behaviors = [
            { attributesData: { group: { nested: ref } } },
        ];

        resolveBehaviorAttributeAssetRefs(object, context);

        expect(ref.revisionId).toBe("r1");
    });

    it("should resolve behavior attribute asset refs in arrays", () => {
        const ref1: AssetRef = { assetId: "a1", revisionId: "old" };
        const ref2: AssetRef = { assetId: "a2", revisionId: "old" };

        object.userData.behaviors = [
            { attributesData: { refs: [ref1, ref2] } },
        ];

        resolveBehaviorAttributeAssetRefs(object, context);

        expect(ref1.revisionId).toBe("r1");
        expect(ref2.revisionId).toBe("r2");
    });

    it("should resolve deeply nested behavior attribute asset refs", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "old" };

        object.userData.behaviors = [
            { attributesData: { level1: { level2: { level3: ref } } } },
        ];

        resolveBehaviorAttributeAssetRefs(object, context);

        expect(ref.revisionId).toBe("r1");
    });
});

describe("mapAssetIds", () => {
    const makeObj = (userData: any = {}) => {
        const o = new Object3D();
        o.userData = userData;
        return o;
    };

    const mockMap = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockMap.mockReset();
    });

    it("should map prefabId using supplied context", () => {
        const obj = makeObj({ prefabId: "p1" });

        // Give the object its own resolution context - it should be IGNORED in
        // favor of the one provided to mapAssetIds().
        setAssetResolutionContext(obj, {
            assetIdToRevisionId: { p1: "rev-p1" },
        });

        mockMap.mockImplementation((id) => id + "_mapped");

        const suppliedContext = {};
        mapAssetIds(obj, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("p1", suppliedContext, {
            type: AssetType.Prefab,
            object: obj,
        });
        expect(getPrefabId(obj)).toBe("p1_mapped");
    });

    it("should map modelId using supplied context", () => {
        const obj = makeObj({ modelId: "m1" });

        // Give the object its own resolution context - it should be IGNORED in
        // favor of the one provided to mapAssetIds().
        setAssetResolutionContext(obj, {
            assetIdToRevisionId: { m1: "rev-m1" },
        });

        mockMap.mockImplementation((id) => id + "_mapped");

        const suppliedContext = {};
        mapAssetIds(obj, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("m1", suppliedContext, {
            type: AssetType.Model,
            object: obj,
        });
        expect(getModelId(obj)).toBe("m1_mapped");
    });

    it("should map VFX asset ids using supplied context", () => {
        const obj = makeObj({vfxAssetId: "vfx1"});

        // Give the object its own resolution context - it should be IGNORED in
        // favor of the one provided to mapAssetIds().
        setAssetResolutionContext(obj, {
            assetIdToRevisionId: {vfx1: "rev-vfx1"},
        });

        mockMap.mockImplementation((id) => `${id}_mapped`);

        const suppliedContext = {};
        mapAssetIds(obj, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("vfx1", suppliedContext, {
            type: AssetType.Quarks,
            object: obj,
        });
        expect(getVfxId(obj)).toBe("vfx1_mapped");
    });

    it("should map behavior attributes using supplied context", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };
        const behavior = { attributesData: { myRef: ref } };

        const obj = makeObj({
            behaviors: [behavior],
        });

        // Give the object its own resolution context - it should be IGNORED in
        // favor of the one provided to mapAssetIds().
        setAssetResolutionContext(obj, {
            assetIdToRevisionId: { a1: "r1" },
        });

        mockMap.mockImplementation((id) => id + "_mapped");

        const suppliedContext = {};
        mapAssetIds(obj, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("a1", suppliedContext, {
            type: "behaviorAttribute",
            object: obj,
            behavior,
            attribute: "myRef",
            assetRef: ref,
            parent: behavior.attributesData,
            parentKey: "myRef",
        });
        expect(ref.assetId).toBe("a1_mapped");
    });

    it("should map nested behavior attribute asset refs", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };
        const group = { nested: ref };
        const behavior = { attributesData: { group } };

        const obj = makeObj({
            behaviors: [behavior],
        });

        mockMap.mockImplementation((id) => id + "_mapped");

        const suppliedContext = {};
        mapAssetIds(obj, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("a1", suppliedContext, {
            type: "behaviorAttribute",
            object: obj,
            behavior,
            attribute: "group",
            assetRef: ref,
            parent: group,
            parentKey: "nested",
        });
        expect(ref.assetId).toBe("a1_mapped");
    });

    it("should map behavior attribute asset refs in arrays", () => {
        const ref1: AssetRef = { assetId: "a1", revisionId: "r1" };
        const ref2: AssetRef = { assetId: "a2", revisionId: "r2" };
        const refs = [ref1, ref2];
        const behavior = { attributesData: { refs } };

        const obj = makeObj({
            behaviors: [behavior],
        });

        mockMap.mockImplementation((id) => id + "_mapped");

        const suppliedContext = {};
        mapAssetIds(obj, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("a1", suppliedContext, {
            type: "behaviorAttribute",
            object: obj,
            behavior,
            attribute: "refs",
            assetRef: ref1,
            parent: refs,
            parentKey: 0,
        });
        expect(mockMap).toHaveBeenCalledWith("a2", suppliedContext, {
            type: "behaviorAttribute",
            object: obj,
            behavior,
            attribute: "refs",
            assetRef: ref2,
            parent: refs,
            parentKey: 1,
        });
        expect(ref1.assetId).toBe("a1_mapped");
        expect(ref2.assetId).toBe("a2_mapped");
    });

    it("should map behavior IDs using object's own context", () => {
        const nonLegacyBehaviorId = "0123456789abcdef01234567";
        const behavior = { id: "some-logical-id", attributesData: {} };
        const legacyBehavior = { id: "some-legacy-id", attributesData: {} };
        const obj = makeObj({
            behaviors: [
                behavior,
                legacyBehavior, // skipped
            ],
        });

        // Give the object its own resolution context that maps the logical ID
        // to a non-legacy asset ID. It is important that this is a non-legacy
        // asset ID, because legacy IDs are not mapped.
        const objContext = {
            logicalIdToAssetId: { "some-logical-id": nonLegacyBehaviorId },
        };
        setAssetResolutionContext(obj, objContext);

        mockMap.mockImplementation((id) => id + "_mapped");

        const suppliedContext = {};
        mapAssetIds(obj, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("some-logical-id", objContext, {
            type: AssetType.Behavior,
            object: obj,
            behavior,
        });

        // The resulting behavior ID should be the original ID (the logical ID),
        // mapped via the mapping function.
        expect(obj.userData.behaviors[0].id).toBe(`some-logical-id_mapped`);

        // Legacy IDs should not be mapped
        expect(obj.userData.behaviors[1].id).toBe("some-legacy-id");
    });

    it("should use supplied context for children if parent has no context", () => {
        const child = new Object3D();
        child.userData = { modelId: "m1" };

        const parent = new Object3D();
        parent.add(child);

        mockMap.mockImplementation((id) => id + "_mapped");
        const suppliedContext = {};

        mapAssetIds(parent, suppliedContext, mockMap);

        expect(mockMap).toHaveBeenCalledWith("m1", suppliedContext, {
            type: AssetType.Model,
            object: child,
        });
        expect(getModelId(child)).toBe("m1_mapped");
    });

    it("should use parent's context for children", () => {
        const child = new Object3D();
        child.userData = { modelId: "m1" };

        const parent = new Object3D();
        parent.userData = {};
        parent.add(child);

        const parentContext = {
            logicalIdToAssetId: {},
            assetIdToRevisionId: {},
        };
        setAssetResolutionContext(parent, parentContext);

        mockMap.mockImplementation((id) => id + "_mapped");

        mapAssetIds(parent, {}, mockMap);

        expect(mockMap).toHaveBeenCalledWith("m1", parentContext, {
            type: AssetType.Model,
            object: child,
        });
        expect(getModelId(child)).toBe("m1_mapped");
    });

    it("should map lambda IDs using object's own context", () => {
        const nonBuiltInLambdaId = "0123456789abcdef01234567";
        const lc = { lambdaId: "some-logical-id", instanceId: "i1", uuid: "u1", enabled: true, componentData: {} };
        const obj = makeObj({
            lambdaComponents: [lc],
        });

        const objContext = {
            logicalIdToAssetId: { "some-logical-id": nonBuiltInLambdaId },
        };
        setAssetResolutionContext(obj, objContext);

        mockMap.mockImplementation((id) => id + "_mapped");

        mapAssetIds(obj, {}, mockMap);

        expect(mockMap).toHaveBeenCalledWith("some-logical-id", objContext, {
            type: AssetType.Lambda,
            object: obj,
            lambdaComponent: lc,
        });
        expect(obj.userData.lambdaComponents[0].lambdaId).toBe("some-logical-id_mapped");
    });

    it("should not map built-in lambda IDs", () => {
        const lc = { lambdaId: "velocity", instanceId: "i1", uuid: "u1", enabled: true, componentData: {} };
        const obj = makeObj({
            lambdaComponents: [lc],
        });

        mockMap.mockImplementation((id) => id + "_mapped");

        mapAssetIds(obj, {}, mockMap);

        // Built-in "velocity" should remain unmapped
        expect(obj.userData.lambdaComponents[0].lambdaId).toBe("velocity");
    });

    it("should map lambda componentData AssetRefs", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };
        const lc = { lambdaId: "velocity", instanceId: "i1", uuid: "u1", enabled: true, componentData: { myRef: ref } };
        const obj = makeObj({
            lambdaComponents: [lc],
        });

        mockMap.mockImplementation((id) => id + "_mapped");

        mapAssetIds(obj, {}, mockMap);

        expect(mockMap).toHaveBeenCalledWith("a1", expect.anything(), {
            type: "lambdaComponentData",
            object: obj,
            lambdaComponent: lc,
            key: "myRef",
        });
        expect(ref.assetId).toBe("a1_mapped");
    });

    it("should expose behavior import dependencies to the mapper callback", () => {
        const behaviorId = "0123456789abcdef01234567";
        const importId = "1123456789abcdef01234567";
        const behavior = {id: behaviorId, attributesData: {}};
        const obj = makeObj({behaviors: [behavior]});

        setAssetResolutionContext(obj, {
            assetIdToRevisionId: {[behaviorId]: "behavior-rev"},
        });
        seedScriptDependencyEntry({
            assetId: behaviorId,
            revisionId: "behavior-rev",
            ownerType: "behavior",
            dependencies: {[importId]: "import-rev"},
        });

        mockMap.mockImplementation(id => (id === behaviorId ? id : `${id}_mapped`));

        mapAssetIds(obj, {}, mockMap);

        expect(mockMap).toHaveBeenCalledWith(importId, expect.anything(), {
            type: "behaviorImport",
            object: obj,
            behavior,
            ownerRevisionId: "behavior-rev",
            viaAssetId: behaviorId,
            viaRevisionId: "import-rev",
        });
        expect(obj.userData.behaviors[0].id).toBe(behaviorId);
    });

    it("should map AssetRef texture values in material settings", () => {
        const ref: AssetRef = { assetId: "img1", revisionId: "rev1" };
        const obj = makeObj({
            materialSettings: {
                textures: {
                    base: ref,
                },
            },
        });

        mockMap.mockImplementation(id => `${id}_mapped`);

        mapAssetIds(obj, {}, mockMap);

        expect(mockMap).toHaveBeenCalledWith("img1", {}, {
            type: "materialSetting",
            object: obj,
            textures: obj.userData.materialSettings.textures,
            key: "base",
            assetRef: ref,
        });
        expect(ref.assetId).toBe("img1_mapped");
    });

    it("should map legacy string texture values in material settings", () => {
        const obj = makeObj({
            materialSettings: {
                textures: {
                    base: "aabbccddeeff001122334455",
                },
            },
        });

        mockMap.mockImplementation(id => `${id}_mapped`);

        mapAssetIds(obj, {}, mockMap);

        expect(obj.userData.materialSettings.textures.base).toBe("aabbccddeeff001122334455_mapped");
    });
});

describe("findDirectDependencies - lambda support", () => {
    const mockTraverse = vi.mocked(SceneUtil.traverseSceneDepthFirst);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const makeObject = (userData: any = {}) => {
        const obj = new Object3D();
        obj.userData = userData;
        return obj;
    };

    it("should add non-built-in lambda components as dependencies", () => {
        const lambdaId = "aabbccddeeff00112233aabb";

        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({
            lambdaComponents: [
                { lambdaId, instanceId: "i1", uuid: "u1", enabled: true, componentData: {} },
            ],
        });
        setAssetResolutionContext(obj, { assetIdToRevisionId: { [lambdaId]: "rev1" } });

        const result = findDirectDependencies(obj);
        expect(result).toEqual([{ assetId: lambdaId, revisionId: "rev1" }]);
    });

    it("should add VFX asset instances as direct dependencies", () => {
        const vfxId = "aabbccddeeff001122334499";

        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({vfxAssetId: vfxId});
        setAssetResolutionContext(obj, {assetIdToRevisionId: {[vfxId]: "vfx-rev"}});

        const result = findDirectDependencies(obj);

        expect(result).toEqual([{assetId: vfxId, revisionId: "vfx-rev"}]);
    });

    it("should NOT add built-in lambda IDs as dependencies", () => {
        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({
            lambdaComponents: [
                { lambdaId: "velocity", instanceId: "i1", uuid: "u1", enabled: true, componentData: {} },
            ],
        });

        const result = findDirectDependencies(obj);
        expect(result).toEqual([]);
    });

    it("should add AssetRef values from lambda componentData", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };

        mockTraverse.mockImplementation((_, callback) => {
            const child = makeObject({
                lambdaComponents: [
                    { lambdaId: "velocity", instanceId: "i1", uuid: "u1", enabled: true, componentData: { target: ref } },
                ],
            });
            callback(child);
        });

        const obj = makeObject();
        const result = findDirectDependencies(obj);

        expect(result).toEqual([ref]);
        expect(isAssetRef(result[0])).toBe(true);
    });

    it("should not include AssetRefs on root object's lambda componentData", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };

        mockTraverse.mockImplementation((object, callback) => {
            callback(object);
        });

        const obj = makeObject({
            lambdaComponents: [
                { lambdaId: "velocity", instanceId: "i1", uuid: "u1", enabled: true, componentData: { target: ref } },
            ],
        });

        const result = findDirectDependencies(obj);
        // Only the root object was visited, so lambda componentData refs should be skipped
        expect(result).toEqual([]);
    });
});

describe("resolveLambdaComponentDataAssetRefs", () => {
    let object: Object3D;
    let context: AssetResolutionContext;

    beforeEach(() => {
        object = new Object3D();
        object.userData = {};
        context = {
            assetIdToRevisionId: { a1: "r1", a2: "r2" },
            logicalIdToAssetId: {},
        };
        vi.resetAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("should update AssetRefs based on provided context", () => {
        const ref1: AssetRef = { assetId: "a1", revisionId: "old" };
        const ref2: AssetRef = { assetId: "a2", revisionId: "old" };

        object.userData.lambdaComponents = [
            { lambdaId: "velocity", instanceId: "i1", uuid: "u1", enabled: true, componentData: { ref1, ref2 } },
        ];

        resolveLambdaComponentDataAssetRefs(object, context);

        expect(ref1.revisionId).toBe("r1");
        expect(ref2.revisionId).toBe("r2");
    });

    it("should do nothing if no lambda components", () => {
        resolveLambdaComponentDataAssetRefs(object, context);
        expect(console.error).not.toHaveBeenCalled();
    });

    it("should recurse into children with inherited context", () => {
        const child = new Object3D();
        const ref: AssetRef = { assetId: "a1", revisionId: "old" };
        child.userData.lambdaComponents = [
            { lambdaId: "velocity", instanceId: "i1", uuid: "u1", enabled: true, componentData: { ref } },
        ];

        object.add(child);

        resolveLambdaComponentDataAssetRefs(object, context, true);

        expect(ref.revisionId).toBe("r1");
    });
});

describe("removeAssetRefs", () => {
    const makeObj = (userData: any = {}) => {
        const o = new Object3D();
        o.userData = userData;
        return o;
    };

    it("should remove top-level behavior attribute asset refs", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };
        const behavior = { attributesData: { myRef: ref } };
        const obj = makeObj({ behaviors: [behavior] });

        removeAssetRefs(obj, {}, () => true);

        expect(behavior.attributesData.myRef).toBeNull();
    });

    it("should remove nested behavior attribute asset refs", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };
        const behavior = { attributesData: { group: { nested: ref } } };
        const obj = makeObj({ behaviors: [behavior] });

        removeAssetRefs(obj, {}, () => true);

        expect(behavior.attributesData.group.nested).toBeNull();
    });

    it("should remove asset refs in arrays", () => {
        const ref1: AssetRef = { assetId: "a1", revisionId: "r1" };
        const ref2: AssetRef = { assetId: "a2", revisionId: "r2" };
        const behavior = { attributesData: { refs: [ref1, ref2] } };
        const obj = makeObj({ behaviors: [behavior] });

        removeAssetRefs(obj, {}, (assetId) => assetId === "a1");

        expect(behavior.attributesData.refs[0]).toBeNull();
        expect(behavior.attributesData.refs[1]).toEqual(ref2);
    });

    it("should not remove asset refs when callback returns false", () => {
        const ref: AssetRef = { assetId: "a1", revisionId: "r1" };
        const behavior = { attributesData: { myRef: ref } };
        const obj = makeObj({ behaviors: [behavior] });

        removeAssetRefs(obj, {}, () => false);

        expect(behavior.attributesData.myRef).toEqual(ref);
    });

    it("should remove AssetRef texture values from material settings", () => {
        const textureRef: AssetRef = { assetId: "img1", revisionId: "rev1" };
        const obj = makeObj({
            materialSettings: {
                textures: {
                    base: textureRef,
                },
            },
        });

        removeAssetRefs(obj, {}, assetId => assetId === "img1");

        expect(obj.userData.materialSettings.textures.base).toBe("");
    });

    it("should remove legacy string texture values from material settings", () => {
        const obj = makeObj({
            materialSettings: {
                textures: {
                    base: "aabbccddeeff001122334455",
                },
            },
        });

        removeAssetRefs(obj, {}, assetId => assetId === "aabbccddeeff001122334455");

        expect(obj.userData.materialSettings.textures.base).toBe("");
    });

    it("should remove VFX asset instances when the VFX asset is removed", () => {
        const parent = makeObj();
        const vfx = makeObj({vfxAssetId: "vfx1"});
        parent.add(vfx);

        removeAssetRefs(parent, {}, assetId => assetId === "vfx1");

        expect(parent.children).not.toContain(vfx);
    });

    it("should remove behaviors whose script imports match the removed asset", () => {
        const behaviorId = "0123456789abcdef01234567";
        const importId = "1123456789abcdef01234567";
        const behavior = {id: behaviorId, attributesData: {}};
        const obj = makeObj({behaviors: [behavior]});

        setAssetResolutionContext(obj, {
            assetIdToRevisionId: {[behaviorId]: "behavior-rev"},
        });
        seedScriptDependencyEntry({
            assetId: behaviorId,
            revisionId: "behavior-rev",
            ownerType: "behavior",
            dependencies: {[importId]: "import-rev"},
        });

        removeAssetRefs(obj, {}, assetId => assetId === importId);

        expect(obj.userData.behaviors).toEqual([]);
    });
});

describe("remapBehaviorAttributeUuids", () => {
    const makeObj = (userData: any = {}) => {
        const o = new Object3D();
        o.userData = userData;
        return o;
    };

    it("should remap top-level UUID string values", () => {
        const uuidMap = new Map([["old-uuid", "new-uuid"]]);
        const behavior = { attributesData: { target: "old-uuid" } };
        const obj = makeObj({ behaviors: [behavior] });

        remapBehaviorAttributeUuids(obj, uuidMap);

        expect(behavior.attributesData.target).toBe("new-uuid");
    });

    it("should remap UUID strings in arrays", () => {
        const uuidMap = new Map([
            ["old-uuid-1", "new-uuid-1"],
            ["old-uuid-2", "new-uuid-2"],
        ]);
        const behavior = { attributesData: { targets: ["old-uuid-1", "old-uuid-2"] } };
        const obj = makeObj({ behaviors: [behavior] });

        remapBehaviorAttributeUuids(obj, uuidMap);

        expect(behavior.attributesData.targets).toEqual(["new-uuid-1", "new-uuid-2"]);
    });

    it("should remap UUID strings in nested objects", () => {
        const uuidMap = new Map([["old-uuid", "new-uuid"]]);
        const behavior = { attributesData: { group: { obj: "old-uuid" } } };
        const obj = makeObj({ behaviors: [behavior] });

        remapBehaviorAttributeUuids(obj, uuidMap);

        expect(behavior.attributesData.group.obj).toBe("new-uuid");
    });

    it("should remap UUID strings in objects within arrays", () => {
        const uuidMap = new Map([
            ["old-uuid-1", "new-uuid-1"],
            ["old-uuid-2", "new-uuid-2"],
        ]);
        const behavior = {
            attributesData: {
                targets: [
                    { obj: "old-uuid-1", weight: 1.0 },
                    { obj: "old-uuid-2", weight: 0.5 },
                ],
            },
        };
        const obj = makeObj({ behaviors: [behavior] });

        remapBehaviorAttributeUuids(obj, uuidMap);

        expect(behavior.attributesData.targets[0]?.obj).toBe("new-uuid-1");
        expect(behavior.attributesData.targets[1]?.obj).toBe("new-uuid-2");
        expect(behavior.attributesData.targets[0]?.weight).toBe(1.0);
        expect(behavior.attributesData.targets[1]?.weight).toBe(0.5);
    });

    it("should not modify strings that are not in the UUID map", () => {
        const uuidMap = new Map([["old-uuid", "new-uuid"]]);
        const behavior = { attributesData: { name: "some-string", target: "unmapped-uuid" } };
        const obj = makeObj({ behaviors: [behavior] });

        remapBehaviorAttributeUuids(obj, uuidMap);

        expect(behavior.attributesData.name).toBe("some-string");
        expect(behavior.attributesData.target).toBe("unmapped-uuid");
    });

    it("should not modify asset refs", () => {
        const uuidMap = new Map([["a1", "mapped-a1"]]);
        const assetRef = { assetId: "a1", revisionId: "r1" };
        const behavior = { attributesData: { ref: assetRef } };
        const obj = makeObj({ behaviors: [behavior] });

        remapBehaviorAttributeUuids(obj, uuidMap);

        // Asset refs should be untouched
        expect(behavior.attributesData.ref).toEqual({ assetId: "a1", revisionId: "r1" });
    });

    it("should recurse into child objects by default", () => {
        const uuidMap = new Map([["old-uuid", "new-uuid"]]);
        const childBehavior = { attributesData: { target: "old-uuid" } };
        const child = makeObj({ behaviors: [childBehavior] });

        const parent = new Object3D();
        parent.add(child);

        remapBehaviorAttributeUuids(parent, uuidMap);

        expect(childBehavior.attributesData.target).toBe("new-uuid");
    });

    it("should not recurse when recursive is false", () => {
        const uuidMap = new Map([["old-uuid", "new-uuid"]]);
        const childBehavior = { attributesData: { target: "old-uuid" } };
        const child = makeObj({ behaviors: [childBehavior] });

        const parent = new Object3D();
        parent.add(child);

        remapBehaviorAttributeUuids(parent, uuidMap, false);

        expect(childBehavior.attributesData.target).toBe("old-uuid");
    });

    it("should handle objects without behaviors", () => {
        const uuidMap = new Map([["old-uuid", "new-uuid"]]);
        const obj = makeObj({});

        // Should not throw
        expect(() => remapBehaviorAttributeUuids(obj, uuidMap)).not.toThrow();
    });
});
