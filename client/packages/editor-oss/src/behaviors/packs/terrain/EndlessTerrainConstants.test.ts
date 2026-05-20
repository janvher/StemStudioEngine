import { describe, expect, it } from "vitest";

import {
    DEFAULT_TERRAIN_TEXTURES,
    convertModelToConfig,
    defaultTerrainModels,
    getLocalDefaultModelUrl,
    getLocalDefaultTextureUrl,
} from "./EndlessTerrainConstants";

describe("EndlessTerrainConstants", () => {
    it("maps hashed imported bundled model URLs back to the local default model", () => {
        const localModelUrl = defaultTerrainModels.find(model => model.url.includes("TER_TreePineTall"))?.url;
        expect(localModelUrl).toBeDefined();

        expect(
            getLocalDefaultModelUrl("https://example.com/assets/TER_TreePineTall-BdllVS2X.glb"),
        ).toBe(localModelUrl);
    });

    it("maps hashed imported bundled texture URLs back to the local default texture", () => {
        expect(
            getLocalDefaultTextureUrl("https://example.com/assets/TER_Grassy-AbCd1234.png"),
        ).toBe(DEFAULT_TERRAIN_TEXTURES.grass);
    });

    it("keeps bundled model display names stable when the emitted asset URL is hashed", () => {
        const localModel = defaultTerrainModels.find(model => model.url.includes("TER_TreePineTall"));
        expect(localModel).toBeDefined();

        expect(convertModelToConfig(localModel!).modelName).toBe("TER TreePineTall");
    });

    it("preserves bundled terrain offsets when converting defaults to editable config", () => {
        const localModel = defaultTerrainModels.find(model => model.url.includes("TER_TreePineTall"));
        expect(localModel).toBeDefined();

        expect(convertModelToConfig(localModel!).terrainOffset).toBe(localModel!.terrainOffset);
    });
});
