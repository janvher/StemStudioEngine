import * as THREE from "three";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {BehaviorHandlers} from "./BehaviorHandlers";

const hoisted = vi.hoisted(() => ({
    mockCreateBehaviorRevision: vi.fn(),
    mockGetAssetResolutionContext: vi.fn(),
    mockResolveAssetRevisionId: vi.fn(),
    mockSaveScene: vi.fn(),
}));

vi.mock("@stem/network/api/asset", () => ({
    AssetType: {
        Behavior: "Behavior",
        Audio: "Audio",
        Image: "Image",
        Video: "Video",
        Model: "Model",
        Prefab: "Prefab",
        File: "File",
    },
    getSceneAssets: vi.fn(),
}));

vi.mock("@stem/network/api/scene", () => ({
    saveScene: (...args: any[]) => hoisted.mockSaveScene(...args),
}));

vi.mock("../../asset-management/AssetResolutionContext", () => ({
    getAssetResolutionContext: (...args: any[]) => hoisted.mockGetAssetResolutionContext(...args),
    removeAssetRevision: vi.fn(),
    setAssetRevision: vi.fn(),
    resolveAssetRevisionId: (...args: any[]) => hoisted.mockResolveAssetRevisionId(...args),
}));

vi.mock("../../editor/asset-management/hooks/assets", () => ({
    refreshSceneAssets: vi.fn(),
}));

vi.mock("../../editor/asset-management/util/scene", () => ({
    removeAssetInstancesFromScene: vi.fn(),
}));

vi.mock("../../editor/behaviors/util", () => ({
    createBehavior: vi.fn(),
    createBehaviorRevision: (...args: any[]) => hoisted.mockCreateBehaviorRevision(...args),
}));

vi.mock("../../queryClient", () => ({
    queryClient: {},
}));

vi.mock("../validation/BehaviorCodeValidator", () => ({
    BehaviorCodeValidator: class BehaviorCodeValidator {
        validate() {
            return {
                valid: true,
                errorCount: 0,
                warningCount: 0,
                infoCount: 0,
                issues: [],
            };
        }
    },
}));

/**
 *
 * @param sceneID
 */
function createHarness(sceneID = "scene-1") {
    const scene = new THREE.Scene();
    const app = {
        scene,
        editor: {
            isCollaborative: true,
            sceneID,
            behaviorScriptRegistry: {
                getScript: vi.fn(),
            },
            behaviorConfigRegistry: {
                getConfig: vi.fn().mockReturnValue({
                    id: "behavior.1",
                    name: "Behavior One",
                    description: "",
                    version: "1.0.0",
                    author: "tester",
                    isScript: true,
                    main: "index.js",
                    attributes: {},
                }),
            },
            behaviorAttributeConverter: {
                getAttributeConverter: vi.fn().mockReturnValue({}),
            },
        },
        call: vi.fn(),
    };

    return {
        app,
        handlers: new BehaviorHandlers(app as any),
    };
}

describe("BehaviorHandlers", () => {
    beforeEach(() => {
        hoisted.mockCreateBehaviorRevision.mockReset();
        hoisted.mockGetAssetResolutionContext.mockReset();
        hoisted.mockResolveAssetRevisionId.mockReset();
        hoisted.mockSaveScene.mockReset();

        hoisted.mockCreateBehaviorRevision.mockResolvedValue({id: "rev-new"});
        hoisted.mockGetAssetResolutionContext.mockReturnValue({
            assetIdToRevisionId: {
                "behavior.1": "rev-current",
            },
        });
        hoisted.mockResolveAssetRevisionId.mockReturnValue("rev-current");
        hoisted.mockSaveScene.mockResolvedValue(undefined);
    });

    it("persists the scene after a successful scene-bound behavior revision update", async () => {
        const {handlers} = createHarness("scene-1");

        const result = await handlers.handleUpdateBehavior({
            behaviorId: "behavior.1",
            code: "export default class BehaviorOne {}",
            name: "Behavior One",
        });

        expect(result.status).toBe("success");
        expect(hoisted.mockCreateBehaviorRevision).toHaveBeenCalledWith(expect.objectContaining({
            assetId: "behavior.1",
            parentRevisionId: "rev-current",
            code: "export default class BehaviorOne {}",
            assetSource: undefined,
            config: expect.objectContaining({
                id: "behavior.1",
                name: "Behavior One",
            }),
            retryOnConflict: true,
        }));
        expect(hoisted.mockSaveScene).toHaveBeenCalledTimes(1);
        expect(hoisted.mockSaveScene).toHaveBeenCalledWith(false, false);
    });

    it("skips scene persistence when collaborative mode is disabled", async () => {
        const {handlers, app} = createHarness("scene-1");
        app.editor.isCollaborative = false;

        const result = await handlers.handleUpdateBehavior({
            behaviorId: "behavior.1",
            code: "export default class BehaviorOne {}",
            name: "Behavior One",
        });

        expect(result.status).toBe("success");
        expect(hoisted.mockCreateBehaviorRevision).toHaveBeenCalledTimes(1);
        expect(hoisted.mockSaveScene).not.toHaveBeenCalled();
    });

    describe("resolveAssetAttributes", () => {
        // Verifies that every supported asset-attribute type — including the
        // historically-missed `fileAsset` — is resolved from a name string to
        // an `{assetId, revisionId}` AssetRef before reaching the runtime.
        // Regression coverage for the cdda runtime crash:
        //   "[AssetLoader] getAssetRevision called with missing ref fields:
        //   \"MapData24\""
        // — caused by `fileAsset` being absent from the assetTypeMap.
        function harnessWithAssets(assetsByType: Record<string, Array<{id: string; name: string; headRevisionId: string}>>) {
            const {handlers, app} = createHarness("scene-1");
            (app.editor as any).assetSource = {
                getAssets: vi.fn(({types}: {types: string[]}) => {
                    const t = types[0] ?? "";
                    return Promise.resolve({assets: assetsByType[t] || []});
                }),
            };
            (app.editor as any).behaviorConfigRegistry.getConfig = vi.fn().mockReturnValue({
                id: "behavior.1",
                attributes: {
                    mapDataAsset:    {type: "fileAsset"},
                    cover:           {type: "imageAsset"},
                    music:           {type: "audioAsset"},
                    avatar:          {type: "modelAsset"},
                    intro:           {type: "videoAsset"},
                    template:        {type: "prefab"},
                    plain:           {type: "string"},
                },
            });
            return {handlers, app};
        }

        const baseAssets = {
            File:   [{id: "file-id-24",   name: "MapData24",  headRevisionId: "rev-file-1"}],
            Image:  [{id: "image-id-1",   name: "Cover",       headRevisionId: "rev-image-1"}],
            Audio:  [{id: "audio-id-1",   name: "Music",       headRevisionId: "rev-audio-1"}],
            Model:  [{id: "model-id-1",   name: "Avatar",      headRevisionId: "rev-model-1"}],
            Video:  [{id: "video-id-1",   name: "Intro",       headRevisionId: "rev-video-1"}],
            Prefab: [{id: "prefab-id-1",  name: "Template",    headRevisionId: "rev-prefab-1"}],
        };

        it("resolves fileAsset name strings to {assetId, revisionId} (regression: cdda mapDataAsset)", async () => {
            const {handlers} = harnessWithAssets(baseAssets);
            hoisted.mockGetAssetResolutionContext.mockReturnValue(null); // exercises headRevisionId fallback
            const resolved = await (handlers as any).resolveAssetAttributes("behavior.1", {
                mapDataAsset: "MapData24",
            });
            expect(resolved.mapDataAsset).toEqual({
                assetId: "file-id-24",
                revisionId: "rev-file-1",
            });
        });

        it("resolves all six asset-attribute types in a single config", async () => {
            const {handlers} = harnessWithAssets(baseAssets);
            hoisted.mockGetAssetResolutionContext.mockReturnValue(null);
            const resolved = await (handlers as any).resolveAssetAttributes("behavior.1", {
                mapDataAsset: "MapData24",
                cover:        "Cover",
                music:        "Music",
                avatar:       "Avatar",
                intro:        "Intro",
                template:     "Template",
                plain:        "leave-me-alone",
            });
            expect(resolved.mapDataAsset).toEqual({assetId: "file-id-24",   revisionId: "rev-file-1"});
            expect(resolved.cover).toEqual(       {assetId: "image-id-1",   revisionId: "rev-image-1"});
            expect(resolved.music).toEqual(       {assetId: "audio-id-1",   revisionId: "rev-audio-1"});
            expect(resolved.avatar).toEqual(      {assetId: "model-id-1",   revisionId: "rev-model-1"});
            expect(resolved.intro).toEqual(       {assetId: "video-id-1",   revisionId: "rev-video-1"});
            expect(resolved.template).toEqual(    {assetId: "prefab-id-1",  revisionId: "rev-prefab-1"});
            // Non-asset types untouched.
            expect(resolved.plain).toBe("leave-me-alone");
        });

        it("prefers the scene-resolved revisionId over headRevisionId when context is present", async () => {
            const {handlers} = harnessWithAssets(baseAssets);
            hoisted.mockGetAssetResolutionContext.mockReturnValue({
                assetIdToRevisionId: {"file-id-24": "rev-pinned"},
            });
            hoisted.mockResolveAssetRevisionId.mockImplementation((id: string) =>
                id === "file-id-24" ? "rev-pinned" : undefined,
            );
            const resolved = await (handlers as any).resolveAssetAttributes("behavior.1", {
                mapDataAsset: "MapData24",
            });
            expect(resolved.mapDataAsset).toEqual({
                assetId: "file-id-24",
                revisionId: "rev-pinned",
            });
        });

        it("leaves the value unchanged when no asset matches the name", async () => {
            const {handlers} = harnessWithAssets({File: []});
            const resolved = await (handlers as any).resolveAssetAttributes("behavior.1", {
                mapDataAsset: "MissingMap",
            });
            expect(resolved.mapDataAsset).toBe("MissingMap");
        });
    });

});
