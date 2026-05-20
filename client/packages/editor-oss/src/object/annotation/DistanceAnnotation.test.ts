import * as THREE from "three";
import {describe, it, expect, vi, beforeEach} from "vitest";

vi.mock("../../global", () => ({
    default: {
        app: {
            call: vi.fn(),
            on: vi.fn(),
            editor: {
                addObject: vi.fn(),
                removeObject: vi.fn(),
                select: vi.fn(),
                deselect: vi.fn(),
                objectByUuid: vi.fn(() => null),
                renderer: {domElement: {width: 800, height: 600}},
            },
        },
    },
}));

import {DistanceAnnotation} from "./DistanceAnnotation";
import {userDataToPoints} from "./AnnotationBase";

describe("DistanceAnnotation", () => {
    let a: THREE.Vector3;
    let b: THREE.Vector3;

    beforeEach(() => {
        a = new THREE.Vector3(0, 0, 0);
        b = new THREE.Vector3(3, 4, 0);
    });

    it("computes the scalar distance label", () => {
        const ann = new DistanceAnnotation(a, b);
        expect(ann.computeLabelText()).toBe("5.000 m");
    });

    it("stores annotationType and points on userData for serialization", () => {
        const ann = new DistanceAnnotation(a, b);
        expect(ann.userData.annotationType).toBe("distance");
        const stored = userDataToPoints(ann.userData.points);
        expect(stored.length).toBe(2);
        expect(stored[0]!.toArray()).toEqual([0, 0, 0]);
        expect(stored[1]!.toArray()).toEqual([3, 4, 0]);
    });

    it("setPoints regenerates visuals and updates the label text", () => {
        const ann = new DistanceAnnotation(a, b);
        ann.setPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)]);
        expect(ann.computeLabelText()).toBe("10.000 m");
        // After rebuild, children include at least the line + label sprite.
        expect(ann.children.length).toBeGreaterThanOrEqual(2);
    });

    it("builds a line segment + a label sprite", () => {
        const ann = new DistanceAnnotation(a, b);
        const hasLine = ann.children.some(c => c.type === "Line");
        const hasSprite = ann.children.some(c => c.type === "Sprite");
        expect(hasLine).toBe(true);
        expect(hasSprite).toBe(true);
    });

    it("sets a tree-friendly default name", () => {
        const ann = new DistanceAnnotation(a, b);
        expect(ann.name).toBe("Distance");
    });
});
