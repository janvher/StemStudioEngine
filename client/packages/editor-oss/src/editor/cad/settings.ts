import * as THREE from "three";

export interface CADToolsSettings {
    enabled: boolean;
}

export const DEFAULT_CAD_TOOLS_SETTINGS: CADToolsSettings = {
    enabled: false,
};

/**
 *
 * @param scene
 */
export function getCADToolsSettings(scene?: THREE.Object3D | null): CADToolsSettings {
    const stored = scene?.userData?.cadTools as Partial<CADToolsSettings> | undefined;
    return {
        ...DEFAULT_CAD_TOOLS_SETTINGS,
        ...stored,
    };
}

/**
 *
 * @param scene
 */
export function isCADToolsEnabled(scene?: THREE.Object3D | null): boolean {
    return getCADToolsSettings(scene).enabled;
}

/**
 *
 * @param scene
 * @param settings
 */
export function setCADToolsSettings(scene: THREE.Object3D, settings: CADToolsSettings) {
    if (!scene.userData) {
        scene.userData = {};
    }
    scene.userData.cadTools = {
        ...DEFAULT_CAD_TOOLS_SETTINGS,
        ...settings,
    };
}
