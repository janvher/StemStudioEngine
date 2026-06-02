import {describe, expect, it, vi} from "vitest";

import {AssetHandlers} from "./AssetHandlers";

const createHandlers = () => {
    const assetSource = {
        kind: "scene",
        id: "scene-1",
        getAssets: vi.fn(async ({types}: {types?: string[]} = {}) => {
            const assets = [
                {
                    id: "model-1",
                    name: "Kart",
                    type: "model",
                    description: "A drivable kart model",
                    tags: ["vehicle"],
                    contentType: "model/gltf-binary",
                    format: "glb",
                    headRevisionId: "model-rev",
                    thumbnailUrl: "data:image/png;base64,large",
                },
                {
                    id: "script-1",
                    name: "math-helpers",
                    type: "script",
                    description: "Reusable movement helpers",
                    tags: ["import"],
                    headRevisionId: "script-rev",
                },
                {
                    id: "file-1",
                    name: "level-data.json",
                    type: "file",
                    description: "Level data",
                    headRevisionId: "file-rev",
                },
                {
                    id: "lambda-1",
                    name: "Patrol Brain",
                    type: "lambda",
                    description: "Patrol lambda pack",
                    headRevisionId: "lambda-rev",
                },
            ];
            return {
                assets: types?.length ? assets.filter(asset => types.includes(asset.type)) : assets,
            };
        }),
    };
    const engine = {
        editor: {assetSource},
    } as any;

    return {assetSource, handlers: new AssetHandlers(engine)};
};

describe("AssetHandlers", () => {
    it("lists compact scene asset metadata by semantic type", async () => {
        const {assetSource, handlers} = createHandlers();

        const result = await handlers.handleListSceneAssets({type: "models"});

        expect(assetSource.getAssets).toHaveBeenCalledWith({
            types: ["model"],
            includeLatestRelease: true,
            includeThumbnails: true,
        });
        expect(result.status).toBe("success");
        expect(result.data).toEqual(expect.objectContaining({
            assetSource: {kind: "scene", id: "scene-1"},
            total: 1,
            assets: [
                expect.objectContaining({
                    id: "model-1",
                    name: "Kart",
                    type: "model",
                    hasThumbnail: true,
                }),
            ],
        }));
        expect(JSON.stringify(result.data)).not.toContain("data:image/png");
    });

    it("gets imports, files, and lambda packs by name or id", async () => {
        const {handlers} = createHandlers();

        const importResult = await handlers.handleGetSceneAsset({name: "math-helpers", type: "imports"});
        const fileResult = await handlers.handleGetSceneAsset({assetId: "file-1", type: "files"});
        const lambdaResult = await handlers.handleGetSceneAsset({name: "Patrol Brain", type: "lambdas"});

        expect(importResult.status).toBe("success");
        expect(importResult.data).toEqual(expect.objectContaining({
            asset: expect.objectContaining({id: "script-1", type: "script"}),
        }));
        expect(fileResult.status).toBe("success");
        expect(fileResult.data).toEqual(expect.objectContaining({
            asset: expect.objectContaining({id: "file-1", type: "file"}),
        }));
        expect(lambdaResult.status).toBe("success");
        expect(lambdaResult.data).toEqual(expect.objectContaining({
            asset: expect.objectContaining({id: "lambda-1", type: "lambda"}),
        }));
    });
});
