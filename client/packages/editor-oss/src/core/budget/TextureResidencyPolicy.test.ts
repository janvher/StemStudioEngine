import {describe, expect, it, vi} from "vitest";
import * as THREE from "three";

import {getAvatarBudgetMetadata, markRemotePlayerAvatar} from "./AvatarBudgetPolicy";
import {markObjectForPlotBudget} from "./PlotBudgetPolicy";
import {
    getTextureResidencyMetadata,
    getTextureResidencyOptionsFromQuality,
    TextureResidencyManager,
} from "./TextureResidencyPolicy";
import type {IQualitySettings} from "../quality/interfaces/IQualityManager";

function createTexture(name: string, size = 256): THREE.Texture {
    const texture = new THREE.Texture({width: size, height: size});
    texture.name = name;
    return texture;
}

function createTexturedRoot(name: string): {
    root: THREE.Group;
    material: THREE.MeshStandardMaterial;
    baseMap: THREE.Texture;
    normalMap: THREE.Texture;
    roughnessMap: THREE.Texture;
} {
    const baseMap = createTexture(`${name}-base`);
    const normalMap = createTexture(`${name}-normal`);
    const roughnessMap = createTexture(`${name}-roughness`);
    const material = new THREE.MeshStandardMaterial({
        map: baseMap,
        normalMap,
        roughnessMap,
    });
    const root = new THREE.Group();
    root.name = name;
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
    return {root, material, baseMap, normalMap, roughnessMap};
}

describe("TextureResidencyPolicy", () => {
    it("reduces ghost avatar optional maps and restores them when full", () => {
        const scene = new THREE.Scene();
        const avatar = createTexturedRoot("avatar");
        scene.add(avatar.root);
        markRemotePlayerAvatar(avatar.root);
        getAvatarBudgetMetadata(avatar.root)!.lastState = "ghost";
        const disposeNormal = vi.spyOn(avatar.normalMap, "dispose");
        const disposeRoughness = vi.spyOn(avatar.roughnessMap, "dispose");

        const manager = new TextureResidencyManager(scene, {
            isMobile: true,
            batchSize: 1,
            ownershipRefreshInterval: 1,
            disposeReducedTextures: true,
        });

        manager.update();
        expect(avatar.material.map).toBe(avatar.baseMap);
        expect(avatar.material.normalMap).toBeNull();
        expect(avatar.material.roughnessMap).toBeNull();
        expect(disposeNormal).toHaveBeenCalledTimes(1);
        expect(disposeRoughness).toHaveBeenCalledTimes(1);
        expect(avatar.root.userData.textureResidencyState).toBe("reduced");

        getAvatarBudgetMetadata(avatar.root)!.lastState = "full";
        manager.update();
        expect(avatar.material.map).toBe(avatar.baseMap);
        expect(avatar.material.normalMap).toBe(avatar.normalMap);
        expect(avatar.material.roughnessMap).toBe(avatar.roughnessMap);
        expect(avatar.root.userData.textureResidencyState).toBe("resident");
    });

    it("evicts culled avatar maps and restores stored references", () => {
        const scene = new THREE.Scene();
        const avatar = createTexturedRoot("culled-avatar");
        scene.add(avatar.root);
        markRemotePlayerAvatar(avatar.root);
        getAvatarBudgetMetadata(avatar.root)!.lastState = "culled";
        const disposeBase = vi.spyOn(avatar.baseMap, "dispose");
        const disposeNormal = vi.spyOn(avatar.normalMap, "dispose");

        const manager = new TextureResidencyManager(scene, {
            isMobile: true,
            batchSize: 1,
            ownershipRefreshInterval: 1,
        });

        manager.update();
        expect(avatar.material.map).toBeNull();
        expect(avatar.material.normalMap).toBeNull();
        expect(avatar.material.roughnessMap).toBeNull();
        expect(disposeBase).toHaveBeenCalledTimes(1);
        expect(disposeNormal).toHaveBeenCalledTimes(1);
        expect(avatar.root.userData.textureResidencyState).toBe("evicted");

        getAvatarBudgetMetadata(avatar.root)!.lastState = "full";
        manager.update();
        expect(avatar.material.map).toBe(avatar.baseMap);
        expect(avatar.material.normalMap).toBe(avatar.normalMap);
        expect(avatar.material.roughnessMap).toBe(avatar.roughnessMap);
    });

    it("evicts ghost avatars under critical runtime texture pressure", () => {
        const scene = new THREE.Scene();
        const avatar = createTexturedRoot("pressure-avatar");
        scene.add(avatar.root);
        markRemotePlayerAvatar(avatar.root);
        getAvatarBudgetMetadata(avatar.root)!.lastState = "ghost";

        const manager = new TextureResidencyManager(scene, {
            isMobile: true,
            batchSize: 1,
            ownershipRefreshInterval: 1,
            maxResidentTextureBytes: 1,
            runtimePressure: "critical",
            evictGhostAvatarsUnderPressure: true,
        });

        manager.update();

        expect(avatar.material.map).toBeNull();
        expect(avatar.material.normalMap).toBeNull();
        expect(avatar.root.userData.textureResidencyState).toBe("evicted");
        expect(getTextureResidencyMetadata(avatar.root)?.lastDecision?.reason).toBe("avatar-ghost-critical-texture-pressure");
    });

    it("tracks resident texture bytes separately from total managed texture bytes", () => {
        const scene = new THREE.Scene();
        const plot = createTexturedRoot("resident-stats");
        scene.add(plot.root);
        markObjectForPlotBudget(plot.root, {state: "far"});

        const manager = new TextureResidencyManager(scene, {
            isMobile: true,
            batchSize: 1,
            ownershipRefreshInterval: 1,
            disposeReducedTextures: false,
        });
        const before = manager.getStats();

        manager.update();
        manager.update();
        const after = manager.getStats();

        expect(before.residentTextureBytes).toBe(before.textureBytes);
        expect(after.textureBytes).toBe(before.textureBytes);
        expect(after.residentTextureBytes).toBeLessThan(after.textureBytes);
    });

    it("protects materials shared across managed roots", () => {
        const scene = new THREE.Scene();
        const first = createTexturedRoot("shared-a");
        const second = createTexturedRoot("shared-b");
        second.material = first.material;
        (second.root.children[0] as THREE.Mesh).material = first.material;
        scene.add(first.root, second.root);
        markObjectForPlotBudget(first.root, {state: "far"});
        markObjectForPlotBudget(second.root, {state: "far"});
        const disposeNormal = vi.spyOn(first.normalMap, "dispose");

        const manager = new TextureResidencyManager(scene, {
            isMobile: true,
            batchSize: 2,
            ownershipRefreshInterval: 1,
        });

        manager.update();
        expect(first.material.map).toBe(first.baseMap);
        expect(first.material.normalMap).toBe(first.normalMap);
        expect(disposeNormal).not.toHaveBeenCalled();
    });

    it("updates texture roots in batches", () => {
        const scene = new THREE.Scene();
        const first = createTexturedRoot("first");
        const second = createTexturedRoot("second");
        scene.add(first.root, second.root);
        markObjectForPlotBudget(first.root, {state: "far"});
        markObjectForPlotBudget(second.root, {state: "far"});

        const manager = new TextureResidencyManager(scene, {
            isMobile: true,
            batchSize: 1,
            ownershipRefreshInterval: 1,
            disposeReducedTextures: false,
        });

        manager.update();
        expect(first.material.normalMap).toBeNull();
        expect(second.material.normalMap).toBe(second.normalMap);

        manager.update();
        expect(second.material.normalMap).toBeNull();
    });

    it("derives tighter mobile residency options from low quality settings", () => {
        const lowQuality = getTextureResidencyOptionsFromQuality(
            {
                rendering: {
                    textureQuality: "low",
                    lodBias: 2,
                },
                scene: {
                    cullingAggressiveness: 1,
                },
            } as IQualitySettings,
            {isMobile: true},
        );
        const highQuality = getTextureResidencyOptionsFromQuality(
            {
                rendering: {
                    textureQuality: "high",
                    lodBias: 0,
                },
                scene: {
                    cullingAggressiveness: 0,
                },
            } as IQualitySettings,
            {isMobile: true},
        );

        expect(lowQuality.maxResidentTextureBytes).toBeLessThan(highQuality.maxResidentTextureBytes!);
        expect(lowQuality.disposeReducedTextures).toBe(true);
        expect(lowQuality.batchSize).toBeLessThanOrEqual(highQuality.batchSize!);
    });
});
