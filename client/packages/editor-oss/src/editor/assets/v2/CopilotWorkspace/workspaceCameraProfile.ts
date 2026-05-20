import {CAMERA_TYPES, type CameraData} from "@stem/editor-oss/types/editor";

export type WorkspaceCameraSecondaryAction = "free-camera" | "inspect-camera" | "release-input";

export type WorkspaceCameraProfile = {
    cameraTypeLabel: string;
    secondaryAction: WorkspaceCameraSecondaryAction;
    secondaryLabel: string;
    secondaryTitle: string;
};

const normalizeCameraType = (cameraType: unknown): string =>
    typeof cameraType === "string" ? cameraType.trim() : "";

export const getWorkspaceCameraProfile = (
    cameraData?: Partial<CameraData> | null,
): WorkspaceCameraProfile => {
    const cameraType = normalizeCameraType(cameraData?.cameraType);
    const lowerType = cameraType.toLowerCase();
    const pointerLockDriven = !!cameraData?.usePointerLock ||
        cameraType === CAMERA_TYPES.FIRST_PERSON ||
        lowerType.includes("pointerlock") ||
        lowerType.includes("first person");
    const gameplayOwnedCamera = pointerLockDriven ||
        cameraType === CAMERA_TYPES.VEHICLE ||
        cameraType === CAMERA_TYPES.SPECTATOR ||
        lowerType.includes("fly") ||
        lowerType.includes("flight");
    const fixedOr2DCamera = cameraType === CAMERA_TYPES.TOP_DOWN ||
        cameraType === CAMERA_TYPES.SIDE_SCROLLER ||
        cameraType === CAMERA_TYPES.FIXED ||
        cameraType === CAMERA_TYPES.NONE ||
        lowerType === "2d" ||
        lowerType.includes("orbit") ||
        lowerType.includes("trackball");

    if (gameplayOwnedCamera) {
        return {
            cameraTypeLabel: cameraType || "Gameplay Camera",
            secondaryAction: "release-input",
            secondaryLabel: "Release Input",
            secondaryTitle: "Release gameplay mouse capture and inspect the running scene.",
        };
    }

    if (fixedOr2DCamera) {
        return {
            cameraTypeLabel: cameraType || "Gameplay Camera",
            secondaryAction: "inspect-camera",
            secondaryLabel: "Inspect Camera",
            secondaryTitle: "Inspect the running scene using the current gameplay camera.",
        };
    }

    return {
        cameraTypeLabel: cameraType || CAMERA_TYPES.THIRD_PERSON,
        secondaryAction: "free-camera",
        secondaryLabel: "Free Camera",
        secondaryTitle: "Detach to a temporary orbit camera while gameplay keeps running.",
    };
};
