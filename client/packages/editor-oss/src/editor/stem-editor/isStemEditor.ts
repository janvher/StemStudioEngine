import type {Scene} from "three";

import type {StemEditorMetadata} from "./saveStemEditor";

/**
 * Returns true when the given scene is loaded in stem-editor mode.
 *
 * @param scene - The scene to check, or undefined/null.
 * @returns true when `scene.userData.stemEditor` metadata is present.
 */
export const isStemEditor = (scene: Scene | null | undefined): boolean => {
    if (!scene) return false;
    const meta = scene.userData?.stemEditor as StemEditorMetadata | undefined;
    return !!meta?.assetId;
};
