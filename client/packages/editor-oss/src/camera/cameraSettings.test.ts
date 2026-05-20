import {PerspectiveCamera} from "three";

import {applyCameraProjectionSettings, getCameraControlSettings} from "./cameraSettings";
import {CAMERA_OBJECT_INTERACTION, CAMERA_TYPES, OCCLUSION_TYPES, type CameraData} from "@stem/editor-oss/types/editor";

/**
 *
 * @param overrides
 */
function makeCameraData(overrides: Partial<CameraData> = {}): CameraData {
    return {
        type: "Camera",
        cameraType: CAMERA_TYPES.THIRD_PERSON,
        cameraEffect: 0 as any,
        usePointerLock: false,
        objectInteraction: CAMERA_OBJECT_INTERACTION.ZOOM,
        cameraFOV: 60,
        ...overrides,
    };
}

describe("cameraSettings", () => {
    describe("applyCameraProjectionSettings", () => {
        it("applies projection settings and updates the matrix when values change", () => {
            const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
            const updateSpy = vi.spyOn(camera, "updateProjectionMatrix");

            const changed = applyCameraProjectionSettings(
                camera,
                makeCameraData({
                    cameraFOV: 50,
                    cameraNear: 0.5,
                    cameraFar: 500,
                }),
            );

            expect(changed).toBe(true);
            expect(camera.fov).toBe(50);
            expect(camera.near).toBe(0.5);
            expect(camera.far).toBe(500);
            expect(updateSpy).toHaveBeenCalledTimes(1);
        });

        it("does not update projection matrix when projection values are unchanged", () => {
            const camera = new PerspectiveCamera(60, 1, 0.2, 200);
            const updateSpy = vi.spyOn(camera, "updateProjectionMatrix");

            const changed = applyCameraProjectionSettings(
                camera,
                makeCameraData({
                    cameraFOV: 60,
                    cameraNear: 0.2,
                    cameraFar: 200,
                }),
            );

            expect(changed).toBe(false);
            expect(updateSpy).not.toHaveBeenCalled();
        });

        it("safely handles missing optional near/far values", () => {
            const camera = new PerspectiveCamera(70, 1, 0.3, 700);
            const updateSpy = vi.spyOn(camera, "updateProjectionMatrix");

            const changed = applyCameraProjectionSettings(
                camera,
                makeCameraData({
                    cameraFOV: 65,
                    cameraNear: undefined,
                    cameraFar: undefined,
                }),
            );

            expect(changed).toBe(true);
            expect(camera.fov).toBe(65);
            expect(camera.near).toBe(0.3);
            expect(camera.far).toBe(700);
            expect(updateSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("getCameraControlSettings", () => {
        it("uses defaults for control limits when distance limits are missing", () => {
            const settings = getCameraControlSettings(makeCameraData(), {
                nearLimit: 2,
                farLimit: 12,
            });

            expect(settings.nearLimit).toBe(2);
            expect(settings.farLimit).toBe(12);
            expect(settings.controlType).toBe(CAMERA_TYPES.THIRD_PERSON);
            expect(settings.occlusionType).toBe(OCCLUSION_TYPES.DISTANCE);
        });
    });
});
