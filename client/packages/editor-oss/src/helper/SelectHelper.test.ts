import {Box3, Object3D, Vector3} from "three";
import {beforeEach, describe, expect, it, vi} from "vitest";

const hoisted = vi.hoisted(() => ({
    globalMock: {app: null},
}));

vi.mock("../global", () => ({
    default: hoisted.globalMock,
}));

import SelectHelper from "./SelectHelper";

class BoundsOnlyObject extends Object3D {
    getBoundingBox(_centersOnly = false) {
        return new Box3(
            new Vector3(-1, -2, -3),
            new Vector3(1, 2, 3),
        );
    }
}

class ThrowingBoundsObject extends Object3D {
    getBoundingBox(_centersOnly = false) {
        throw new Error("getBoundingBox should not be called for GS selection bounds");
    }
}

describe("SelectHelper billboard selection bounds", () => {
    beforeEach(() => {
        hoisted.globalMock.app = {
            userId: "local-user",
            editor: {isSandbox: false},
            isPlaying: false,
        } as never;
    });

    it("uses stable billboard bounds when the billboard wrapper has no geometry", () => {
        const helper = new SelectHelper();
        const billboard = new Object3D();

        billboard.userData = {
            isBillboard: true,
            billboardSelectionBounds: {
                width: 12.7,
                height: 7.2,
                depth: 0.001,
            },
        };
        billboard.position.set(5, 2, -3);
        billboard.rotation.y = Math.PI / 2;
        billboard.scale.set(2, 3, 1);
        billboard.updateMatrixWorld(true);

        const box = helper.getSelectionBox(billboard, true);

        expect(box).not.toBeNull();

        const center = box!.getCenter(new Vector3());
        const size = box!.getSize(new Vector3());

        expect(center.x).toBeCloseTo(5);
        expect(center.y).toBeCloseTo(2);
        expect(center.z).toBeCloseTo(-3);
        expect(size.y).toBeCloseTo(21.6);
        expect(size.x).toBeCloseTo(0.001, 5);
        expect(size.z).toBeCloseTo(25.4);
    });

    it("uses getBoundingBox bounds when the selected object has no geometry", () => {
        const helper = new SelectHelper();
        const root = new Object3D();
        const splatLike = new BoundsOnlyObject();

        root.rotation.y = Math.PI / 2;
        root.scale.set(2, 1, 3);
        splatLike.position.set(4, 0, 0);
        root.add(splatLike);
        root.updateMatrixWorld(true);

        const box = helper.getSelectionBox(root, true);

        expect(box).not.toBeNull();

        const center = box!.getCenter(new Vector3());
        const size = box!.getSize(new Vector3());

        expect(center.x).toBeCloseTo(0);
        expect(center.y).toBeCloseTo(0);
        expect(center.z).toBeCloseTo(-8);
        expect(size.x).toBeCloseTo(18);
        expect(size.y).toBeCloseTo(4);
        expect(size.z).toBeCloseTo(4);
    });

    it("skips bbox computation for gaussian splat objects", () => {
        const helper = new SelectHelper();
        const gsRoot = new Object3D();
        const gsChild = new ThrowingBoundsObject();

        gsRoot.userData.__isGaussianSplat = true;
        gsRoot.position.set(2, 3, 4);
        gsRoot.add(gsChild);
        gsRoot.updateMatrixWorld(true);

        const withoutFallback = helper.getSelectionBox(gsRoot, false);
        const withFallback = helper.getSelectionBox(gsRoot, true);

        expect(withoutFallback).toBeNull();
        expect(withFallback).not.toBeNull();

        const center = withFallback!.getCenter(new Vector3());
        expect(center.x).toBeCloseTo(2);
        expect(center.y).toBeCloseTo(3);
        expect(center.z).toBeCloseTo(4);
    });
});
