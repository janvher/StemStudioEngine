import * as THREE from "three";
import {describe, it, expect} from "vitest";

import {captureView, getDefaultPresets} from "./NamedViews";

describe("NamedViews", () => {
    it("returns 7 presets for a null bounding sphere (falls back to unit scene)", () => {
        const presets = getDefaultPresets(null);
        expect(presets.length).toBe(7);
        const kinds = presets.map(p => p.kind);
        expect(kinds).toEqual(["top", "bottom", "front", "back", "left", "right", "iso"]);
    });

    it("top preset looks down the -Y axis at the scene center", () => {
        const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 5);
        const presets = getDefaultPresets(sphere);
        const top = presets.find(p => p.kind === "top")!;
        expect(top.position[1]).toBeGreaterThan(0); // camera above scene
        expect(top.position[0]).toBeCloseTo(0);
        expect(top.position[2]).toBeCloseTo(0);
        expect(top.target).toEqual([0, 0, 0]);
    });

    it("scales camera distance with scene radius", () => {
        const small = getDefaultPresets(new THREE.Sphere(new THREE.Vector3(), 1));
        const large = getDefaultPresets(new THREE.Sphere(new THREE.Vector3(), 100));
        const smallTopY = small.find(p => p.kind === "top")!.position[1];
        const largeTopY = large.find(p => p.kind === "top")!.position[1];
        expect(largeTopY).toBeGreaterThan(smallTopY);
        expect(largeTopY / smallTopY).toBeGreaterThan(5);
    });

    it("centers presets on scene center when offset", () => {
        const sphere = new THREE.Sphere(new THREE.Vector3(10, 20, 30), 5);
        const presets = getDefaultPresets(sphere);
        const front = presets.find(p => p.kind === "front")!;
        expect(front.target).toEqual([10, 20, 30]);
        expect(front.position[0]).toBeCloseTo(10);
        expect(front.position[1]).toBeCloseTo(20);
        expect(front.position[2]).toBeGreaterThan(30); // front is +Z from center
    });

    it("captureView records current camera pose", () => {
        const camera = new THREE.PerspectiveCamera();
        camera.position.set(1, 2, 3);
        camera.up.set(0, 1, 0);
        const center = new THREE.Vector3(10, 10, 10);
        const view = captureView(camera, center, {name: "Saved"});
        expect(view.position).toEqual([1, 2, 3]);
        expect(view.target).toEqual([10, 10, 10]);
        expect(view.kind).toBe("custom");
        expect(view.name).toBe("Saved");
    });
});
