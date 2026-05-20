import * as THREE from "three";

export type NamedViewKind = "top" | "bottom" | "front" | "back" | "left" | "right" | "iso";

export interface NamedView {
    id: string;
    name: string;
    kind: NamedViewKind | "custom";
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
}

/**
 * Default named views derived from a scene's bounding sphere.
 *
 * Each axial preset places the camera along one world axis at a distance
 * proportional to the scene radius, targeting the scene center. The iso
 * preset uses a (1,1,1) diagonal for a traditional isometric framing.
 *
 * If the scene is empty (radius = 0), we fall back to a unit-size scene
 * centered at the origin so the presets still produce usable cameras.
 */
export function getDefaultPresets(boundingSphere: THREE.Sphere | null): NamedView[] {
    const center = boundingSphere && !Number.isNaN(boundingSphere.center.x)
        ? boundingSphere.center.clone()
        : new THREE.Vector3(0, 0, 0);
    const radius = boundingSphere && boundingSphere.radius > 0 ? boundingSphere.radius : 1;

    // 3× radius gives a reasonable framing margin for axial presets.
    // Iso wants a longer diagonal so the scene fits the perspective FOV.
    const axialDist = Math.max(radius * 3, 3);
    const isoDist = Math.max(radius * 3.5, 3.5);

    const target: [number, number, number] = [center.x, center.y, center.z];
    const upY: [number, number, number] = [0, 1, 0];
    const upZ: [number, number, number] = [0, 0, 1];

    return [
        {
            id: "preset-top",
            name: "Top",
            kind: "top",
            position: [center.x, center.y + axialDist, center.z],
            target,
            up: upZ,
        },
        {
            id: "preset-bottom",
            name: "Bottom",
            kind: "bottom",
            position: [center.x, center.y - axialDist, center.z],
            target,
            up: [0, 0, -1],
        },
        {
            id: "preset-front",
            name: "Front",
            kind: "front",
            position: [center.x, center.y, center.z + axialDist],
            target,
            up: upY,
        },
        {
            id: "preset-back",
            name: "Back",
            kind: "back",
            position: [center.x, center.y, center.z - axialDist],
            target,
            up: upY,
        },
        {
            id: "preset-left",
            name: "Left",
            kind: "left",
            position: [center.x - axialDist, center.y, center.z],
            target,
            up: upY,
        },
        {
            id: "preset-right",
            name: "Right",
            kind: "right",
            position: [center.x + axialDist, center.y, center.z],
            target,
            up: upY,
        },
        {
            id: "preset-iso",
            name: "Iso",
            kind: "iso",
            position: [center.x + isoDist, center.y + isoDist, center.z + isoDist],
            target,
            up: upY,
        },
    ];
}

/**
 * Build a view that captures the current camera pose, for "Save current view"
 * and as the pre-move snapshot stored by SetCameraViewCommand.
 */
export function captureView(
    camera: THREE.Camera,
    controlsCenter: THREE.Vector3,
    options: {id?: string; name?: string} = {},
): NamedView {
    return {
        id: options.id ?? `view-${Date.now()}`,
        name: options.name ?? "Saved View",
        kind: "custom",
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controlsCenter.x, controlsCenter.y, controlsCenter.z],
        up: [camera.up.x, camera.up.y, camera.up.z],
    };
}
