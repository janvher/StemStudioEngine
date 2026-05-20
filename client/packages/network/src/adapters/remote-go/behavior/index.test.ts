import {describe, expect, it} from "vitest";

import {
    getBehaviorsFromScriptBundle,
    getImportResolutionContextFromScriptBundle,
    getImportRevisionMapFromScriptBundle,
    getLambdasFromScriptBundle,
    type ScriptBundle,
} from "./index";

describe("api/behavior script bundle helpers", () => {
    it("converts bundled behaviors into backend behavior data", () => {
        const bundle: ScriptBundle = {
            version: 1,
            behaviors: {
                behaviorAsset: {
                    revisionId: "behaviorRev",
                    config: JSON.stringify({name: "Test Behavior"}),
                    code: "function update() {}",
                },
            },
            lambdas: {},
            imports: {},
        };

        expect(getBehaviorsFromScriptBundle(bundle)).toEqual([
            {
                ID: "behaviorAsset",
                RevisionID: "behaviorRev",
                Config: {name: "Test Behavior"},
                Code: "function update() {}",
                CreatedAt: "",
                UpdatedAt: "",
            },
        ]);
    });

    it("converts bundled lambdas into lambda backend data and fills missing config ids", () => {
        const bundle: ScriptBundle = {
            version: 1,
            behaviors: {},
            lambdas: {
                lambdaAsset: {
                    revisionId: "lambdaRev",
                    config: JSON.stringify({name: "Test Lambda"}),
                    code: "function update() {}",
                },
            },
            imports: {},
        };

        expect(getLambdasFromScriptBundle(bundle)).toEqual([
            {
                ID: "lambdaAsset",
                RevisionID: "lambdaRev",
                Config: {id: "lambdaAsset", name: "Test Lambda"},
                Code: "function update() {}",
            },
        ]);
    });

    it("builds a seeded import revision map from bundled imports", () => {
        const bundle: ScriptBundle = {
            version: 1,
            behaviors: {},
            lambdas: {},
            imports: {
                importAsset: {
                    revisionId: "importRev",
                    code: "function clamp() {}",
                },
            },
        };

        expect(getImportRevisionMapFromScriptBundle(bundle)).toEqual({
            "importAsset:importRev": {
                assetId: "importAsset",
                revisionId: "importRev",
                code: "function clamp() {}",
            },
        });
    });

    it("returns an empty seeded import revision map when bundled imports are absent", () => {
        const bundle: ScriptBundle = {
            version: 1,
            behaviors: {},
            lambdas: {},
        };

        expect(getImportRevisionMapFromScriptBundle(bundle)).toEqual({});
    });

    it("builds a seeded import revision map from backend script bundles", () => {
        const bundle: ScriptBundle = {
            version: 1,
            behaviors: {},
            lambdas: {},
            imports: {},
            scripts: {
                importAsset: {
                    revisionId: "importRev",
                    code: "function clamp() {}",
                    name: "Terrain",
                },
            },
        };

        expect(getImportRevisionMapFromScriptBundle(bundle)).toEqual({
            "importAsset:importRev": {
                assetId: "importAsset",
                revisionId: "importRev",
                code: "function clamp() {}",
            },
        });
    });

    it("builds an import resolution context from bundled script names", () => {
        const bundle: ScriptBundle = {
            version: 1,
            behaviors: {},
            lambdas: {},
            imports: {},
            scripts: {
                importAsset: {
                    revisionId: "importRev",
                    code: "function clamp() {}",
                    name: "Terrain",
                },
            },
        };

        expect(getImportResolutionContextFromScriptBundle(bundle)).toEqual({
            assetIdToRevisionId: {
                importAsset: "importRev",
            },
            nameToAssetId: {
                terrain: "importAsset",
            },
        });
    });
});
