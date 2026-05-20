import {describe, expect, it} from "vitest";

import {isGaussianSplatPlyHeader} from "./gaussianSplats";

describe("isGaussianSplatPlyHeader", () => {
    it("detects gaussian splat PLY headers", () => {
        const header = [
            "ply",
            "format binary_little_endian 1.0",
            "element vertex 10",
            "property float x",
            "property float y",
            "property float z",
            "property float scale_0",
            "property float scale_1",
            "property float scale_2",
            "property float rot_0",
            "property float rot_1",
            "property float rot_2",
            "property float rot_3",
            "property float opacity",
            "property float f_dc_0",
            "end_header",
        ].join("\n");

        expect(isGaussianSplatPlyHeader(header)).toBe(true);
    });

    it("rejects regular mesh PLY headers", () => {
        const header = [
            "ply",
            "format ascii 1.0",
            "element vertex 8",
            "property float x",
            "property float y",
            "property float z",
            "property float nx",
            "property float ny",
            "property float nz",
            "element face 12",
            "property list uchar int vertex_indices",
            "end_header",
        ].join("\n");

        expect(isGaussianSplatPlyHeader(header)).toBe(false);
    });
});