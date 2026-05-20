import moment from "moment";

type SceneUserData = {
    lastEditTime?: number | string;
    lastSaveTime?: number | string;
};

/**
 *
 * @param sceneUserData
 */
export function editorHasUnsavedChanges(sceneUserData?: SceneUserData | null) {
    if (!sceneUserData?.lastEditTime) {
        return false;
    }

    const lastEditTime = moment(sceneUserData.lastEditTime);
    const lastSaveTime = moment(
        sceneUserData?.lastSaveTime || lastEditTime.clone().subtract(1, "minute"),
    );

    return lastEditTime.isAfter(lastSaveTime);
}
