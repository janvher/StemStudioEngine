import { describe, it, expect } from "vitest";

import { AssetRef, isAssetRef, assetRefKey } from "./AssetRef";

describe("AssetRef", () => {
    describe("isAssetRef", () => {
        it("should return true for a valid AssetRef object", () => {
            const ref: AssetRef = { assetId: "abc123", revisionId: "rev456" };
            expect(isAssetRef(ref)).toBe(true);
        });

        it("should return false if assetId is missing", () => {
            const ref = { revisionId: "rev456" };
            expect(isAssetRef(ref)).toBe(false);
        });

        it("should return false if revisionId is missing", () => {
            const ref = { assetId: "abc123" };
            expect(isAssetRef(ref)).toBe(false);
        });

        it("should return false for null or undefined", () => {
            expect(isAssetRef(null)).toBe(false);
            expect(isAssetRef(undefined)).toBe(false);
        });

        it("should return false for non-object types", () => {
            expect(isAssetRef("string")).toBe(false);
            expect(isAssetRef(123)).toBe(false);
            expect(isAssetRef(true)).toBe(false);
        });
    });

    describe("assetRefKey", () => {
        it("should concatenate assetId and revisionId with a colon", () => {
            const ref: AssetRef = { assetId: "asset1", revisionId: "revA" };
            expect(assetRefKey(ref)).toBe("asset1:revA");
        });

        it("should handle empty strings correctly", () => {
            const ref: AssetRef = { assetId: "", revisionId: "" };
            expect(assetRefKey(ref)).toBe(":");
        });

        it("should return a deterministic key for the same input", () => {
            const ref: AssetRef = { assetId: "id1", revisionId: "r1" };
            expect(assetRefKey(ref)).toBe(assetRefKey(ref));
        });
    });
});
