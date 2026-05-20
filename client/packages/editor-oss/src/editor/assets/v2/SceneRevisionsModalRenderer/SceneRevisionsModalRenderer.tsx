import {SceneRevisionsModal} from "./SceneRevisionsModal";
import {useAppGlobalContext} from "@stem/editor-oss/context";

export const SceneRevisionsModalRenderer = () => {
    const context = useAppGlobalContext();
    if (!context) return null;
    const {sceneRevisionModalSceneData} = context;
    if (!sceneRevisionModalSceneData) return null;
    return <SceneRevisionsModal />;
};
