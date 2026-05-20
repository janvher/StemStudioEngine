import {NavigateFunction} from "react-router-dom";

import {generateProjectLink} from "../../../../v2/pages/links";
import {saveScene} from "@stem/network/api/scene";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {handleAddBox} from "../utils/addBox";
import {handleAddTerrain} from "../utils/createTerrain";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const createSandboxStarter = async (engine: EngineRuntime, navigate: NavigateFunction) => {
    if (!engine || !engine.editor) return;
    engine.editor.isSandbox = true;
    const userName = engine?.authManager?.getUserName();
    const sceneName = `${userName ? capitalize(userName) + "'s" : "Your"} Sandbox`;
    engine.editor.sceneName = sceneName;
    handleAddBox(undefined, engine.editor, engine, true);
    await handleAddTerrain(engine.editor);
    engine.editor.syncSceneBehaviorConfigs();

    // Save the scene first to get a valid sceneID before entering play mode
    // Don't create thumbnail yet - scene isn't rendered properly
    await handleSaveScene(engine, navigate, sceneName, false);

    engine.on("playerStarted.TemplatePanel", () => {
        engine.on("playerStarted.TemplatePanel", null);
        setTimeout(async () => {
            // Now that the player has started and scene is rendered, save again with thumbnail
            await saveScene(true, false);
            engine.editor?.component?.handleLoading(false);
        }, 1000);
    });
};

export const handleSaveScene = async (
    engine: EngineRuntime,
    navigate: NavigateFunction,
    name: string,
    createThumbnail: boolean = true,
    shouldNavigate: boolean = true,
) => {
    engine.editor!.sceneName = name;

    await saveScene(createThumbnail);

    // Navigate to the new project, replacing the intermediate /create/project
    // entry so browser-back goes straight to the dashboard instead of replaying
    // the autoCreate flow (which would duplicate the Directional Light).
    if (shouldNavigate && engine.editor?.sceneID) {
        const url = generateProjectLink(engine.editor.sceneID);
        await navigate(url, {replace: true});
    }
};
