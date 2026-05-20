import {describe, expect, it} from "vitest";

import {getPhysics} from "./getPhysics";

describe("getPhysics", () => {
    it("normalizes modern shape ids to editor shape ids", () => {
        expect(getPhysics({shape: "box"}).shape).toBe("btBoxShape");
        expect(getPhysics({shape: "sphere"}).shape).toBe("btSphereShape");
        expect(getPhysics({shape: "capsule"}).shape).toBe("btCapsuleShape");
        expect(getPhysics({shape: "convexHull"}).shape).toBe("btConvexHullShape");
        expect(getPhysics({shape: "concaveHull"}).shape).toBe("btConcaveHullShape");
    });

    it("keeps existing editor shape ids unchanged", () => {
        expect(getPhysics({shape: "btCapsuleShape"}).shape).toBe("btCapsuleShape");
    });
});
