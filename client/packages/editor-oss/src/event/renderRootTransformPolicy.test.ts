import { describe, expect, it } from "vitest";

import {
    hasNonIdentityTransform,
    resetRootTransform,
    resolveRootTransformPolicy,
} from "./renderRootTransformPolicy";

/**
 *
 */
function makeRoot() {
    return {
        position: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } },
        rotation: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } },
        scale: { x: 1, y: 1, z: 1, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } },
    };
}

describe("renderRootTransformPolicy", () => {
    it("defaults to auto-reset", () => {
        expect(resolveRootTransformPolicy(undefined, "")).toBe("auto-reset");
    });

    it("uses scene rendering setting when valid", () => {
        expect(resolveRootTransformPolicy({ rootTransformPolicy: "warn-only" }, "")).toBe("warn-only");
    });

    it("lets URL override scene policy", () => {
        const policy = resolveRootTransformPolicy(
            { rootTransformPolicy: "auto-reset" },
            "?rootTransformPolicy=ignore",
        );
        expect(policy).toBe("ignore");
    });

    it("detects and resets non-identity transforms", () => {
        const root = makeRoot();
        root.position.x = 3;
        root.rotation.z = 1;
        root.scale.y = 2;

        expect(hasNonIdentityTransform(root)).toBe(true);
        resetRootTransform(root);
        expect(hasNonIdentityTransform(root)).toBe(false);
    });
});
