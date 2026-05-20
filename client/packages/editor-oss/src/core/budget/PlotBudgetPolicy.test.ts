import {describe, expect, it} from "vitest";
import * as THREE from "three";

import {
    getPlotBudgetMetadata,
    getPlotBudgetOptionsFromQuality,
    PlotBudgetManager,
    PlotBudgetPolicy,
} from "./PlotBudgetPolicy";
import type {IQualitySettings} from "../quality/interfaces/IQualityManager";

function createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    return camera;
}

function createStaticPlot(name: string, z: number): THREE.Object3D {
    const root = new THREE.Group();
    root.name = name;
    root.userData.isStemObject = true;
    root.position.set(0, 0, z);
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    root.updateMatrixWorld(true);
    return root;
}

describe("PlotBudgetPolicy", () => {
    it("moves static plot roots from near to mid to far to culled by distance", () => {
        const camera = createCamera();
        const plot = createStaticPlot("plot", -5);
        const policy = new PlotBudgetPolicy({
            isMobile: true,
            nearDistance: 5,
            midDistance: 10,
            farDistance: 20,
            cullDistance: 30,
            offscreenCullDistance: 30,
        });

        expect(policy.decide(plot, camera).state).toBe("near");

        plot.position.z = -15;
        plot.updateMatrixWorld(true);
        expect(policy.decide(plot, camera).state).toBe("mid");

        plot.position.z = -25;
        plot.updateMatrixWorld(true);
        expect(policy.decide(plot, camera).state).toBe("far");

        plot.position.z = -35;
        plot.updateMatrixWorld(true);
        const decision = policy.decide(plot, camera);
        expect(decision.state).toBe("culled");
        policy.applyVisibilityState(plot, decision);
        expect(plot.visible).toBe(false);

        plot.position.z = -5;
        plot.updateMatrixWorld(true);
        const restored = policy.decide(plot, camera);
        policy.applyVisibilityState(plot, restored);
        expect(restored.state).toBe("near");
        expect(plot.visible).toBe(true);
    });

    it("registers safe static roots and excludes behavior roots", () => {
        const scene = new THREE.Scene();
        const staticRoot = createStaticPlot("static", -10);
        const behaviorRoot = createStaticPlot("behavior", -10);
        behaviorRoot.userData.behaviors = [{id: "example"}];
        scene.add(staticRoot, behaviorRoot);

        const manager = new PlotBudgetManager(scene, {isMobile: true});

        expect(manager.getRegisteredCount()).toBe(1);
        expect(getPlotBudgetMetadata(staticRoot)?.enabled).toBe(true);
        expect(getPlotBudgetMetadata(behaviorRoot)?.enabled).toBeUndefined();
    });

    it("updates plot roots in batches", () => {
        const camera = createCamera();
        const scene = new THREE.Scene();
        const a = createStaticPlot("a", -40);
        const b = createStaticPlot("b", -40);
        const c = createStaticPlot("c", -40);
        scene.add(a, b, c);

        const manager = new PlotBudgetManager(scene, {
            isMobile: true,
            batchSize: 1,
            nearDistance: 5,
            midDistance: 10,
            farDistance: 20,
            cullDistance: 30,
            offscreenCullDistance: 30,
        });

        manager.update(camera);
        expect(a.visible).toBe(false);
        expect(b.visible).toBe(true);
        expect(c.visible).toBe(true);

        manager.update(camera);
        expect(b.visible).toBe(false);
        expect(c.visible).toBe(true);
    });

    it("disables renderer LOD auto-update and applies quality distance multiplier", () => {
        const camera = createCamera();
        const scene = new THREE.Scene();
        const root = new THREE.Group();
        root.userData.isStemObject = true;
        const lod = new THREE.LOD();
        lod.addLevel(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()), 0);
        lod.addLevel(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()), 100);
        root.add(lod);
        root.position.z = -10;
        scene.add(root);
        root.updateMatrixWorld(true);

        const manager = new PlotBudgetManager(scene, {
            isMobile: true,
            batchSize: 1,
            lodDistanceMultiplier: 0.5,
        });

        expect(lod.autoUpdate).toBe(false);
        manager.update(camera);
        expect(lod.levels[1]!.distance).toBe(50);

        manager.dispose();
        expect(lod.autoUpdate).toBe(true);
    });

    it("derives tighter mobile plot budgets from low quality settings", () => {
        const lowQuality = getPlotBudgetOptionsFromQuality(
            {
                rendering: {
                    textureQuality: "low",
                    lodBias: 2,
                    pixelRatio: 0.6,
                },
                scene: {
                    viewDistance: 300,
                    lodDistances: [30, 90, 180],
                    cullingAggressiveness: 1,
                },
            } as IQualitySettings,
            {isMobile: true},
        );
        const highQuality = getPlotBudgetOptionsFromQuality(
            {
                rendering: {
                    textureQuality: "high",
                    lodBias: 0,
                    pixelRatio: 1,
                },
                scene: {
                    viewDistance: 300,
                    lodDistances: [30, 90, 180],
                    cullingAggressiveness: 0,
                },
            } as IQualitySettings,
            {isMobile: true},
        );

        expect(lowQuality.nearDistance).toBeLessThan(highQuality.nearDistance!);
        expect(lowQuality.cullDistance).toBeLessThan(highQuality.cullDistance!);
        expect(lowQuality.lodDistanceMultiplier).toBeLessThan(highQuality.lodDistanceMultiplier!);
        expect(lowQuality.heavyTextureBytesLimit).toBeLessThan(highQuality.heavyTextureBytesLimit!);
    });

    it("tightens plot distance and LOD thresholds under runtime budget pressure", () => {
        const camera = createCamera();
        const scene = new THREE.Scene();
        const root = new THREE.Group();
        root.userData.isStemObject = true;
        const lod = new THREE.LOD();
        lod.addLevel(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()), 0);
        lod.addLevel(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()), 100);
        root.add(lod);
        root.position.z = -18;
        scene.add(root);
        root.updateMatrixWorld(true);

        const manager = new PlotBudgetManager(scene, {
            isMobile: true,
            batchSize: 1,
            nearDistance: 5,
            midDistance: 20,
            farDistance: 40,
            cullDistance: 80,
            offscreenCullDistance: 80,
            lodDistanceMultiplier: 1,
            runtimeDistanceScale: 0.6,
            runtimeLodDistanceScale: 0.5,
        });

        manager.update(camera);

        expect(getPlotBudgetMetadata(root)?.state).toBe("mid");
        expect(lod.levels[1]!.distance).toBe(50);
    });
});
