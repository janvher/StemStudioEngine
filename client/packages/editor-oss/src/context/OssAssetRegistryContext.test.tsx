import {render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {
    AssetType,
    getOssAssetRegistry,
    lookupOssAsset,
    registerOssAsset,
    resetOssAssetRegistryForTests,
    type OssAssetRegistry,
} from "@stem/network/api/asset";
import {OssAssetRegistryProvider, useOssAssetRegistry} from "./OssAssetRegistryContext";

const RegistryProbe = ({onRegistry}: {onRegistry: (registry: OssAssetRegistry) => void}) => {
    const registry = useOssAssetRegistry();
    onRegistry(registry);
    return null;
};

afterEach(() => {
    resetOssAssetRegistryForTests();
});

describe("OssAssetRegistryProvider", () => {
    it("keeps the same registry object across rerenders", () => {
        const observed: OssAssetRegistry[] = [];
        const {rerender} = render(
            <OssAssetRegistryProvider>
                <RegistryProbe onRegistry={registry => observed.push(registry)} />
            </OssAssetRegistryProvider>,
        );

        const first = observed.at(-1);
        expect(first).toBeDefined();

        registerOssAsset({
            assetId: "asset-1",
            revisionId: "revision-1",
            type: AssetType.Model,
            format: "glb",
            name: "Stable model",
            dataUrl: "data:model/gltf-binary;base64,AAAA",
            projectId: "project-1",
        });

        rerender(
            <OssAssetRegistryProvider>
                <RegistryProbe onRegistry={registry => observed.push(registry)} />
            </OssAssetRegistryProvider>,
        );

        expect(observed.at(-1)).toBe(first);
        expect(getOssAssetRegistry()).toBe(first);
        expect(lookupOssAsset("revision-1")?.assetId).toBe("asset-1");
    });
});
