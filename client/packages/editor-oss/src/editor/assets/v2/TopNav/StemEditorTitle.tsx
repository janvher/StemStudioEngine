import {useEffect, useState} from "react";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";

export const StemEditorTitle = () => {
    const app = global.app as EngineRuntime;
    const [name, setName] = useState(app.editor?.sceneName || "");

    useEffect(() => {
        const update = () => setName(app.editor?.sceneName || "");
        app.on("sceneLoaded.StemEditorTitle", update);
        app.on("sceneNameUpdated.StemEditorTitle", update);
        app.on("clear.StemEditorTitle", update);
        update();
        return () => {
            app.on("sceneLoaded.StemEditorTitle", null);
            app.on("sceneNameUpdated.StemEditorTitle", null);
            app.on("clear.StemEditorTitle", null);
        };
    }, [app]);

    return (
        <span style={{fontSize: "13px", fontWeight: 500, color: "#e5e7eb"}}>
            Stem Editor: {name}
        </span>
    );
};
