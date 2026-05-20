import { Object3D } from "three";
import { describe, it, expect, beforeEach } from "vitest";

import {
    setAssetResolutionContext,
    setAssetRevision,
    removeAssetRevision,
    getAssetResolutionContext,
    AssetResolutionContext,
} from "./AssetResolutionContext";

describe("AssetResolutionContext", () => {
    let object: Object3D;

    beforeEach(() => {
        object = new Object3D();
        object.userData = {};
    });

    describe("setAssetResolutionContext", () => {
        it("should set the assetResolutionContext on an object", () => {
            const context: AssetResolutionContext = {
                assetIdToRevisionId: { asset1: "rev1", asset2: "rev2" },
            };
            setAssetResolutionContext(object, context);
            expect(object.userData.assetResolutionContext).toEqual(context);
        });

        it("should remove the assetResolutionContext when given null", () => {
            object.userData.assetResolutionContext = {
                assetIdToRevisionId: { a: "1" },
            };
            setAssetResolutionContext(object, null);
            expect(object.userData.assetResolutionContext).toBeUndefined();
        });
    });

    describe("setAssetRevision", () => {
        it("should create a new revision context if none exists", () => {
            setAssetRevision(object, "asset1", "rev1");
            expect(object.userData.assetResolutionContext).toEqual({
                assetIdToRevisionId: { asset1: "rev1" },
            });
        });

        it("should update an existing asset revision in the context", () => {
            object.userData.assetResolutionContext = {
                assetIdToRevisionId: { asset1: "rev1" },
            };
            setAssetRevision(object, "asset1", "rev2");
            expect(object.userData.assetResolutionContext).toEqual({
                assetIdToRevisionId: { asset1: "rev2" },
            });
        });

        it("should add a new asset revision without affecting existing ones", () => {
            object.userData.assetResolutionContext = {
                assetIdToRevisionId: { asset1: "rev1" },
            };
            setAssetRevision(object, "asset2", "rev2");
            expect(object.userData.assetResolutionContext).toEqual({
                assetIdToRevisionId: {
                    asset1: "rev1",
                    asset2: "rev2",
                },
            });
        });
    });

    describe("removeAssetRevision", () => {
        it("should remove the given assetId from the context", () => {
            object.userData.assetResolutionContext = {
                assetIdToRevisionId: { asset1: "rev1", asset2: "rev2" },
            };
            removeAssetRevision(object, "asset1");
            expect(object.userData.assetResolutionContext).toEqual({
                assetIdToRevisionId: { asset2: "rev2" },
            });
        });

        it("should handle removing an assetId that does not exist", () => {
            object.userData.assetResolutionContext = {
                assetIdToRevisionId: { asset1: "rev1" },
            };
            removeAssetRevision(object, "nonexistent");
            expect(object.userData.assetResolutionContext).toEqual({
                assetIdToRevisionId: { asset1: "rev1" },
            });
        });

        it("should handle being called when no context exists", () => {
            removeAssetRevision(object, "asset1");
            expect(object.userData.assetResolutionContext).toBeUndefined();
        });
    });

    describe("getAssetResolutionContext", () => {
        it("should return null if the object has no context and inherit is false", () => {
            expect(getAssetResolutionContext(object)).toBeNull();
        });

        it("should return the object's own context when it exists", () => {
            const context: AssetResolutionContext = {
                assetIdToRevisionId: { asset1: "rev1" },
            };
            object.userData.assetResolutionContext = context;
            expect(getAssetResolutionContext(object)).toBe(context);
        });

        it("should inherit the context from the parent when inherit is true", () => {
            const parent = new Object3D();
            const parentContext: AssetResolutionContext = {
                assetIdToRevisionId: {
                    asset1: "rev1", // Overridden by child
                    asset2: "rev2",
                },
            };
            parent.userData.assetResolutionContext = parentContext;

            const childContext: AssetResolutionContext = {
                assetIdToRevisionId: { asset1: "rev2" },
            };
            object.userData.assetResolutionContext = childContext;
            object.parent = parent;

            expect(getAssetResolutionContext(object, true)).toEqual({
                assetIdToRevisionId: {
                    asset1: "rev2",
                    asset2: "rev2",
                },
                logicalIdToAssetId: {},
                nameToAssetId: {},
            });
        });

        it("should return null if inherit is true but no ancestor has a context", () => {
            const parent = new Object3D();
            object.parent = parent;
            expect(getAssetResolutionContext(object, true)).toBeNull();
        });
    });
});
