import {describe, expect, it} from "vitest";

import CustomShape from "./CustomShape";

describe("CustomShape.createGeometryFromSVG", () => {
    it("imports shapes from all SVG paths (including grouped content)", () => {
        const svgWithMultipleGroups = `
            <svg xmlns="http://www.w3.org/2000/svg">
                <g>
                    <path d="M 0 0 L 10 0 L 10 10 L 0 10 Z" />
                </g>
                <g>
                    <path d="M 20 0 L 30 0 L 30 10 L 20 10 Z" />
                </g>
            </svg>
        `;

        const multiGeometry = CustomShape.createGeometryFromSVG(svgWithMultipleGroups);
        const singleGeometry = CustomShape.createGeometryFromSVG("M 0 0 L 10 0 L 10 10 L 0 10 Z");

        expect(multiGeometry.attributes.position!.count).toBeGreaterThan(singleGeometry.attributes.position!.count);
    });

    it("flips imported SVG geometry on Y so screen-space SVG is not upside down", () => {
        const geometry = CustomShape.createGeometryFromSVG("M 0 0 L 10 0 L 10 10 L 0 10 Z");

        geometry.computeBoundingBox();

        expect(geometry.boundingBox).not.toBeNull();
        expect(geometry.boundingBox!.max.y).toBeLessThanOrEqual(1e-6);
        expect(geometry.boundingBox!.min.y).toBeLessThan(0);
    });
});
