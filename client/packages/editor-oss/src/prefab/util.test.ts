vi.mock("three", async (importOriginal) => ({
    ...await importOriginal<typeof import("three")>(),
    Audio: vi.fn(),
    AudioListener: vi.fn(),
}));

import { Object3D } from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { canConvertToPrefab, PrefabConversionError } from "./util";
import { AssetRef } from "@stem/editor-oss/asset-management/AssetRef";
import { findDirectDependencies } from "@stem/editor-oss/asset-management/dependencies";

vi.mock("../asset-management/dependencies", () => ({
    findDirectDependencies: vi.fn(),
}));

describe("canConvertToPrefab", () => {
    let object: Object3D;

    beforeEach(() => {
        object = new Object3D();
        vi.clearAllMocks();
    });

    it("should return HasUnlockedPrefab when an unlocked prefab exists in children", () => {
        // Create a child prefab object that will trigger the unlocked check
        const child = new Object3D();
        child.userData.prefabId = "a1";
        child.userData.prefabEditRevisionId = "r1";
        object.add(child);

        // We rely on the real isPrefab and isPrefabUnlocked logic
        const result = canConvertToPrefab(object);

        expect(result).toBe(PrefabConversionError.HasUnlockedPrefab);
    });

    it("should return HasMultipleAssetRevisions when the same asset has multiple revisions", () => {
        (findDirectDependencies as any).mockReturnValue([
            { assetId: "a1", revisionId: "r1" },
            { assetId: "a1", revisionId: "r2" },
        ] satisfies AssetRef[]);

        const result = canConvertToPrefab(object);
        expect(result).toBe(PrefabConversionError.HasMultipleAssetRevisions);
    });

    it("should return None when all dependencies have unique asset/revision pairs", () => {
        (findDirectDependencies as any).mockReturnValue([
            { assetId: "a1", revisionId: "r1" },
            { assetId: "a2", revisionId: "r2" },
        ] satisfies AssetRef[]);

        const result = canConvertToPrefab(object);
        expect(result).toBe(PrefabConversionError.None);
    });

    it("should return None when object has no dependencies and no unlocked prefabs", () => {
        (findDirectDependencies as any).mockReturnValue([]);

        const result = canConvertToPrefab(object);
        expect(result).toBe(PrefabConversionError.None);
    });
});
