import {describe, expect, it} from "vitest";

import {CAMERA_TYPES} from "@stem/editor-oss/types/editor";
import {getWorkspaceCameraProfile} from "./workspaceCameraProfile";

describe("getWorkspaceCameraProfile", () => {
    it("allows free camera for standard third-person play cameras", () => {
        const profile = getWorkspaceCameraProfile({cameraType: CAMERA_TYPES.THIRD_PERSON});

        expect(profile.secondaryAction).toBe("free-camera");
        expect(profile.secondaryLabel).toBe("Free Camera");
    });

    it("uses input release for pointer-lock and first-person cameras", () => {
        expect(getWorkspaceCameraProfile({cameraType: CAMERA_TYPES.FIRST_PERSON}).secondaryAction).toBe("release-input");
        expect(getWorkspaceCameraProfile({
            cameraType: CAMERA_TYPES.THIRD_PERSON,
            usePointerLock: true,
        }).secondaryAction).toBe("release-input");
    });

    it("uses inspect camera for 2D, orbit, and fixed camera play styles", () => {
        expect(getWorkspaceCameraProfile({cameraType: CAMERA_TYPES.SIDE_SCROLLER}).secondaryAction).toBe("inspect-camera");
        expect(getWorkspaceCameraProfile({cameraType: CAMERA_TYPES.TOP_DOWN}).secondaryAction).toBe("inspect-camera");
        expect(getWorkspaceCameraProfile({cameraType: "OrbitControls" as CAMERA_TYPES}).secondaryAction).toBe("inspect-camera");
        expect(getWorkspaceCameraProfile({cameraType: CAMERA_TYPES.FIXED}).secondaryAction).toBe("inspect-camera");
    });

    it("uses input release for flight-style cameras", () => {
        const profile = getWorkspaceCameraProfile({cameraType: "FlyControls" as CAMERA_TYPES});

        expect(profile.secondaryAction).toBe("release-input");
        expect(profile.secondaryLabel).toBe("Release Input");
    });
});
