import {PerspectiveCamera} from "three";

import {CAMERA_TYPES, type CameraData, OCCLUSION_TYPES} from "@stem/editor-oss/types/editor";

export interface CameraControlSettings {
    controlType: CAMERA_TYPES;
    nearLimit: number;
    farLimit: number;
    usePointerLock: boolean;
    defaultPhi: number;
    cameraHeadHeight?: number;
    enableCameraFollowBehavior: boolean;
    backViewTolerance: number;
    backViewReturnSpeed: number;
    frontViewFlipSpeed: number;
    frontViewFlipAngle: number;
    frontViewFlipTransitionSpeed: number;
    occlusionType: OCCLUSION_TYPES;
}

interface CameraControlSettingsDefaults {
    nearLimit: number;
    farLimit: number;
}

/**
 * Applies projection-related camera settings from cameraData to a PerspectiveCamera.
 * Returns true when projection parameters changed.
 * @param camera
 * @param cameraData
 */
export function applyCameraProjectionSettings(
    camera: PerspectiveCamera,
    cameraData?: CameraData,
): boolean {
    if (!cameraData) {
        return false;
    }

    let projectionNeedsUpdate = false;

    if (typeof cameraData.cameraFOV === "number" && camera.fov !== cameraData.cameraFOV) {
        camera.fov = cameraData.cameraFOV;
        projectionNeedsUpdate = true;
    }

    if (typeof cameraData.cameraNear === "number" && camera.near !== cameraData.cameraNear) {
        camera.near = cameraData.cameraNear;
        projectionNeedsUpdate = true;
    }

    if (typeof cameraData.cameraFar === "number" && camera.far !== cameraData.cameraFar) {
        camera.far = cameraData.cameraFar;
        projectionNeedsUpdate = true;
    }

    if (projectionNeedsUpdate) {
        camera.updateProjectionMatrix();
    }

    return projectionNeedsUpdate;
}

/**
 *
 * @param cameraData
 * @param defaults
 */
export function getCameraControlSettings(
    cameraData: CameraData,
    defaults: CameraControlSettingsDefaults,
): CameraControlSettings {
    // NONE means a custom behavior controls the camera — return passive defaults
    if (cameraData.cameraType === CAMERA_TYPES.NONE) {
        return {
            controlType: CAMERA_TYPES.NONE,
            nearLimit: cameraData.cameraMinDistance ?? defaults.nearLimit,
            farLimit: cameraData.cameraMaxDistance ?? defaults.farLimit,
            usePointerLock: false,
            defaultPhi: (cameraData.cameraAngle || 67.5) * Math.PI / 180,
            cameraHeadHeight: cameraData.cameraHeadHeight,
            enableCameraFollowBehavior: false,
            backViewTolerance: 90 * Math.PI / 180,
            backViewReturnSpeed: 0.5,
            frontViewFlipSpeed: 0.3,
            frontViewFlipAngle: 120 * Math.PI / 180,
            frontViewFlipTransitionSpeed: 0.3,
            occlusionType: OCCLUSION_TYPES.DISTANCE,
        };
    }

    return {
        controlType: cameraData.cameraType ?? CAMERA_TYPES.THIRD_PERSON,
        nearLimit: cameraData.cameraMinDistance ?? defaults.nearLimit,
        farLimit: cameraData.cameraMaxDistance ?? defaults.farLimit,
        usePointerLock: !!cameraData.usePointerLock,
        defaultPhi: (cameraData.cameraAngle || 67.5) * Math.PI / 180,
        cameraHeadHeight: cameraData.cameraHeadHeight,
        enableCameraFollowBehavior: cameraData.enableCameraFollowBehavior ?? false,
        backViewTolerance: (cameraData.cameraBackViewTolerance ?? 90) * Math.PI / 180,
        backViewReturnSpeed: cameraData.cameraBackViewReturnSpeed ?? 0.5,
        frontViewFlipSpeed: cameraData.cameraFrontViewFlipSpeed ?? 0.3,
        frontViewFlipAngle: (cameraData.cameraFrontViewFlipAngle ?? 120) * Math.PI / 180,
        frontViewFlipTransitionSpeed: cameraData.cameraFrontViewFlipTransitionSpeed ?? 0.3,
        occlusionType: cameraData.occlusionType ?? OCCLUSION_TYPES.DISTANCE,
    };
}
