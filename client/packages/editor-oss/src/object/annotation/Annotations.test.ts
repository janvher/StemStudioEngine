import * as THREE from "three";
import {describe, it, expect, vi} from "vitest";

vi.mock("../../global", () => ({
    default: {
        app: {
            call: vi.fn(),
            on: vi.fn(),
            editor: {
                renderer: {domElement: {width: 800, height: 600}},
            },
        },
    },
}));

import {
    AngleAnnotation,
    AreaAnnotation,
    PolylineAnnotation,
    PointNoteAnnotation,
    createAnnotation,
    rehydrateAnnotations,
} from "./index";
import {DistanceAnnotation} from "./DistanceAnnotation";

describe("AngleAnnotation", () => {
    it("computes a 90° angle for an L-shape", () => {
        const a = new THREE.Vector3(1, 0, 0);
        const b = new THREE.Vector3(0, 0, 0);
        const c = new THREE.Vector3(0, 1, 0);
        const ann = new AngleAnnotation(a, b, c);
        expect(ann.computeLabelText()).toBe("90.0°");
    });

    it("computes a 180° angle for a straight line", () => {
        const ann = new AngleAnnotation(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-1, 0, 0),
        );
        expect(ann.computeLabelText()).toBe("180.0°");
    });

    it("serializes 3 points into userData", () => {
        const ann = new AngleAnnotation(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 1, 0),
        );
        expect(ann.userData.annotationType).toBe("angle");
        expect(ann.userData.points.length).toBe(3);
    });

    it("builds two line segments plus a label", () => {
        const ann = new AngleAnnotation(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 1, 0),
        );
        const lines = ann.children.filter(c => c.type === "Line");
        const sprites = ann.children.filter(c => c.type === "Sprite");
        expect(lines.length).toBe(2);
        expect(sprites.length).toBe(1);
    });
});

describe("PolylineAnnotation", () => {
    it("sums segment lengths for the label", () => {
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(3, 0, 0),
            new THREE.Vector3(3, 4, 0),
        ];
        const ann = new PolylineAnnotation(pts);
        expect(ann.computeLabelText()).toBe("7.000 m"); // 3 + 4
    });

    it("builds N-1 line segments for N points", () => {
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(2, 0, 0),
            new THREE.Vector3(3, 0, 0),
        ];
        const ann = new PolylineAnnotation(pts);
        const lines = ann.children.filter(c => c.type === "Line");
        expect(lines.length).toBe(3);
    });
});

describe("AreaAnnotation", () => {
    it("computes area of a unit square", () => {
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(1, 1, 0),
            new THREE.Vector3(0, 1, 0),
        ];
        const ann = new AreaAnnotation(pts);
        expect(ann.computeLabelText()).toBe("1.000 m²");
    });

    it("computes area of a 3-4-5 right triangle (6 m²)", () => {
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(3, 0, 0),
            new THREE.Vector3(0, 4, 0),
        ];
        const ann = new AreaAnnotation(pts);
        expect(ann.computeLabelText()).toBe("6.000 m²");
    });

    it("closes the polygon visually", () => {
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(1, 1, 0),
            new THREE.Vector3(0, 1, 0),
        ];
        const ann = new AreaAnnotation(pts);
        const lines = ann.children.filter(c => c.type === "Line");
        // N open segments + 1 closing segment = N total for a 4-point polygon.
        expect(lines.length).toBe(4);
    });
});

describe("PointNoteAnnotation", () => {
    it("uses the stored text as its label", () => {
        const ann = new PointNoteAnnotation(new THREE.Vector3(1, 2, 3), "Hello");
        expect(ann.computeLabelText()).toBe("Hello");
    });

    it("setText regenerates visuals with new text", () => {
        const ann = new PointNoteAnnotation(new THREE.Vector3(0, 0, 0), "Before");
        ann.setText("After");
        expect(ann.computeLabelText()).toBe("After");
        expect(ann.userData.text).toBe("After");
    });

    it("draws a cross plus a label", () => {
        const ann = new PointNoteAnnotation(new THREE.Vector3(0, 0, 0), "x");
        const lines = ann.children.filter(c => c.type === "Line");
        const sprites = ann.children.filter(c => c.type === "Sprite");
        // 2 cross segments (horizontal + vertical) + the label sprite.
        expect(lines.length).toBe(2);
        expect(sprites.length).toBe(1);
    });
});

describe("createAnnotation factory", () => {
    it("returns null for under-specified inputs", () => {
        expect(createAnnotation("distance", [new THREE.Vector3()])).toBeNull();
        expect(createAnnotation("angle", [new THREE.Vector3(), new THREE.Vector3()])).toBeNull();
        expect(createAnnotation("polyline", [new THREE.Vector3()])).toBeNull();
        expect(createAnnotation("area", [new THREE.Vector3(), new THREE.Vector3()])).toBeNull();
        expect(createAnnotation("pointNote", [])).toBeNull();
    });

    it("dispatches to the right subclass by type", () => {
        expect(createAnnotation("distance", [new THREE.Vector3(), new THREE.Vector3(1, 0, 0)])).toBeInstanceOf(DistanceAnnotation);
        expect(
            createAnnotation("angle", [new THREE.Vector3(1, 0, 0), new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]),
        ).toBeInstanceOf(AngleAnnotation);
    });
});

describe("rehydrateAnnotations", () => {
    it("replaces plain Groups with the right subclass when userData identifies them", () => {
        const root = new THREE.Group();
        // Simulate an annotation that went through ObjectLoader (plain Group with userData).
        const sim = new THREE.Group();
        sim.userData = {
            type: "annotation",
            annotationType: "distance",
            points: [[0, 0, 0], [1, 0, 0]],
            text: "",
        };
        root.add(sim);

        const count = rehydrateAnnotations(root);
        expect(count).toBe(1);
        const rehydrated = root.children[0];
        expect(rehydrated).toBeInstanceOf(DistanceAnnotation);
    });

    it("is idempotent on already-rehydrated annotations", () => {
        const root = new THREE.Group();
        const ann = new DistanceAnnotation(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
        root.add(ann);
        const count = rehydrateAnnotations(root);
        expect(count).toBe(0);
    });

    it("preserves uuid so collab/selection references survive", () => {
        const root = new THREE.Group();
        const sim = new THREE.Group();
        const originalUuid = sim.uuid;
        sim.userData = {
            annotationType: "pointNote",
            points: [[5, 5, 5]],
            text: "TODO",
        };
        root.add(sim);
        rehydrateAnnotations(root);
        expect(root.children[0]!.uuid).toBe(originalUuid);
    });
});
