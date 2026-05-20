import {describe, expect, it} from "vitest";

import {getFolderAssetCounts, toImportableAsset} from "./folderAssetTypes";
import {Asset, AssetType} from "@stem/network/api/asset";
import {FOLDERS} from "@stem/editor-oss/context/LibrariesContext";

const createAsset = (overrides: Partial<Asset>): Asset => ({
    id: overrides.id || "asset-id",
    type: overrides.type || AssetType.Model,
    format: "bin",
    contentType: "application/octet-stream",
    name: "Asset",
    description: "",
    headRevisionId: overrides.headRevisionId || "head-revision",
    sceneIds: [],
    tags: [],
    userId: "user-id",
    createTime: "2026-05-08T00:00:00.000Z",
    updateTime: "2026-05-08T00:00:00.000Z",
    moderationStatus: "",
    ...overrides,
});

describe("folderAssetTypes", () => {
    it("counts selected-project assets by folder, including script and file assets", () => {
        const counts = getFolderAssetCounts([
            createAsset({id: "model", type: AssetType.Model}),
            createAsset({id: "script", type: AssetType.Script}),
            createAsset({id: "file", type: AssetType.File}),
            createAsset({id: "video", type: AssetType.Video}),
            createAsset({id: "lambda", type: AssetType.Lambda}),
        ]);

        expect(counts[FOLDERS.ASSETS_3D]).toBe(1);
        expect(counts[FOLDERS.SCRIPTS]).toBe(1);
        expect(counts[FOLDERS.FILES]).toBe(1);
        expect(counts[FOLDERS.MEDIA]).toBe(1);
        expect(counts[FOLDERS.BEHAVIORS]).toBe(1);
        expect(counts[FOLDERS.STEMS]).toBe(0);
    });

    it("uses the scene-pinned revision when mapping importable scene assets", () => {
        const asset = createAsset({
            headRevisionId: "head-revision",
            revisionId: "scene-pinned-revision",
            latestRelease: {
                assetId: "asset-id",
                revisionId: "released-revision",
                userId: "user-id",
                versionMajor: 1,
                versionMinor: 0,
                versionPatch: 0,
                description: "",
                createTime: "2026-05-08T00:00:00.000Z",
            },
        });

        expect(toImportableAsset(asset).importRevisionId).toBe("scene-pinned-revision");
    });
});
