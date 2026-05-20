import * as THREE from "three";
import {describe, expect, it} from "vitest";

import {computeOrientedBox} from "./orientedBox";

class BoundsOnlyObject extends THREE.Object3D {
    getBoundingBox(_centersOnly = false) {
        return new THREE.Box3(
            new THREE.Vector3(-1, -2, -3),
            new THREE.Vector3(1, 2, 3),
        );
    }
}

describe("computeOrientedBox", () => {
    it("uses getBoundingBox for geometry-less children", () => {
        const root = new THREE.Group();
        root.rotation.y = Math.PI / 3;
        root.scale.set(2, 3, 4);

        const splatLike = new BoundsOnlyObject();
        root.add(splatLike);

        const result = computeOrientedBox(root);
        const size = result.box.getSize(new THREE.Vector3());

        expect(result.hasGeometry).toBe(true);
        expect(size.x).toBeCloseTo(4);
        expect(size.y).toBeCloseTo(12);
        expect(size.z).toBeCloseTo(24);
    });
});