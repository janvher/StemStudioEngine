import {
    DEFAULT_BOUNDING_BOX_SETTINGS,
    type BoundingBoxMode,
    type BoundingBoxSettings,
} from "../editor/assets/v2/RightPanel/panels/ProjectSettings/constants";
import global from "../global";

export const getBoundingBoxMode = (): BoundingBoxMode => {
    const app = (global as any).app;
    const saved = app?.editor?.scene?.userData?.boundingBox as BoundingBoxSettings | undefined;
    return saved?.mode || DEFAULT_BOUNDING_BOX_SETTINGS.mode;
};

export const isAabbMode = (): boolean => getBoundingBoxMode() === "aabb";
