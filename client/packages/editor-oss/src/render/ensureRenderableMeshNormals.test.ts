import * as THREE from "three";
import {describe, expect, it} from "vitest";

import {ensureRenderableMeshNormals} from "./ensureRenderableMeshNormals";

function makeTriangleGeometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([
            0, 0, 0,
            1, 0, 0,
            0, 1, 0,
        ], 3),
    );
    return geometry;
}

describe("ensureRenderableMeshNormals", () => {
    it("computes missing normals on mesh BufferGeometry", () => {
        const geometry = makeTriangleGeometry();
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
        const scene = new THREE.Scene();
        scene.add(mesh);

        const stats = ensureRenderableMeshNormals(scene);

        expect(geometry.getAttribute("normal")).toBeDefined();
        expect(geometry.getAttribute("normal").count).toBe(geometry.getAttribute("position").count);
        expect(stats.normalsComputed).toBe(1);
    });

    it("does not recompute valid normals", () => {
        const geometry = makeTriangleGeometry();
        geometry.computeVertexNormals();
        const originalNormal = geometry.getAttribute("normal");
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());

        const stats = ensureRenderableMeshNormals(mesh);

        expect(geometry.getAttribute("normal")).toBe(originalNormal);
        expect(stats.normalsComputed).toBe(0);
    });

    it("skips line and point primitives", () => {
        const scene = new THREE.Scene();
        const lineGeometry = makeTriangleGeometry();
        const pointsGeometry = makeTriangleGeometry();
        scene.add(new THREE.Line(lineGeometry, new THREE.LineBasicMaterial()));
        scene.add(new THREE.Points(pointsGeometry, new THREE.PointsMaterial()));

        const stats = ensureRenderableMeshNormals(scene);

        expect(lineGeometry.getAttribute("normal")).toBeUndefined();
        expect(pointsGeometry.getAttribute("normal")).toBeUndefined();
        expect(stats.meshesVisited).toBe(0);
        expect(stats.normalsComputed).toBe(0);
    });
});
