import {useEffect, useState} from "react";

import {useGenerationJobs} from "./hooks/useGenerationJobs";
import global from "@stem/editor-oss/global";

type Props = {
    sceneId: string;
};

export const GenerationJobsMonitor = ({sceneId: propSceneId}: Props) => {
    const [sceneId, setSceneId] = useState(propSceneId);

    // Sync when prop changes (covers initial scene load via EditorComponent re-render)
    useEffect(() => {
        if (propSceneId) {
            setSceneId(propSceneId);
        }
    }, [propSceneId]);

    // Also listen to sceneLoaded to catch scene switches when EditorComponent doesn't re-render
    useEffect(() => {
        const app = global.app;
        const onSceneLoaded = () => setSceneId(app?.editor?.sceneID || "");
        app?.on("sceneLoaded.generationJobsMonitor", onSceneLoaded);
        return () => { app?.on("sceneLoaded.generationJobsMonitor", null); };
    }, []);

    useGenerationJobs(sceneId || undefined);
    return null;
};
