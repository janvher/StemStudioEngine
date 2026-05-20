import { debounce } from "lodash";
import { useCallback, useRef, useState, useEffect } from "react";
import Marquee from "react-fast-marquee";

import { SceneNameWrapper } from "./TopNav.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import { useHomepageContext } from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import Ajax from "@stem/editor-oss/utils/Ajax";
import { backendUrlFromPath } from "@stem/editor-oss/utils/UrlUtils";
import { DetailsPopup } from "../common/DetailsPopup/DetailsPopup";


export const SceneName = () => {
    const app = (global.app ?? {}) as EngineRuntime;
    const {setShouldRefreshDashboard} = useHomepageContext();

    const textRef = useRef<HTMLSpanElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [isOverflow, setIsOverflow] = useState(false);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [sceneName, setSceneName] = useState(app.editor?.sceneName || "");
    const [sceneLoaded, setSceneLoaded] = useState(false);
    const [dialogName, setDialogName] = useState("");

    useEffect(() => {
        if (sceneLoaded && sceneName) {
            document.title = sceneName;
        }
    }, [sceneName]);

    useEffect(() => {
        if (textRef.current && wrapperRef.current) {
            setIsOverflow(textRef.current.scrollWidth > wrapperRef.current.clientWidth);
        }
    }, [sceneName]);

    useEffect(() => {
        app.on("sceneNameUpdated.TopNav", () => {
            const newName = app.editor?.sceneName;
            if (newName) setSceneName(newName);
        });

        app.on("clear.TopNav", () => setSceneName(app.editor?.sceneName || ""));
        app.on("sceneLoaded.TopNav", () => {
            document.title = app.editor?.sceneName || "StemStudio";
            setSceneName(app.editor?.sceneName || "");
            setSceneLoaded(true);
        });
        setSceneName(app.editor?.sceneName || "");

        return () => {
            app.on("sceneNameUpdated.TopNav", null);

            app.on("clear.TopNav", null);
            app.on("sceneLoaded.TopNav", null);
        };
    }, [app]);

    const getSceneAlias = (name: string) => {
        return name.toLowerCase().replace(/[ \\._~:/?#[\]@!$&'()*+,;=%-]/g, "");
    };

    const debouncedSceneChange = useCallback(
        debounce(data => {
            Ajax.post({
                url: backendUrlFromPath(`/api/Scene/Edit`),
                data: {
                    Name: data.name,
                    ID: app.editor?.sceneID,
                    Alias: data.alias,
                },
                msgBodyType: "multipart",
            }).then(response => {
                if (response?.data.Code === 200 && app.editor) {
                    app.editor.sceneName = data.name;
                    app.editor.sceneAlias = data.alias;
                    if (data.alias) {
                        app.editor.sceneAlias = response.data.Data ? response.data.Data.alias : "";
                    }
                    setShouldRefreshDashboard(true);
                    app.call(`clear`, app.editor, app.editor);
                }
            });
        }, 500),
        [app, setShouldRefreshDashboard],
    );

    const handleNameChange = () => {
        if (!app.editor) return;
        if (!dialogName.trim()) return;

        app.editor.sceneName = dialogName;
        setSceneName(dialogName);
        app.call("sceneNameUpdated");
        const newAlias = getSceneAlias(dialogName);
        debouncedSceneChange({ name: dialogName, alias: newAlias });
        setShowRenameDialog(false);
    };

    const handleOpenRenameDialog = () => {
        setDialogName(sceneName);
        setShowRenameDialog(true);
    };

    return (
        <>
            <SceneNameWrapper
                ref={wrapperRef}
                onClick={handleOpenRenameDialog}
            >
                {/* hidden span for measurement */}
                <span
                    ref={textRef}
                    style={{ position: "absolute", visibility: "hidden", whiteSpace: "nowrap" }}
                >
                    {sceneName}
                </span>

                {isOverflow ? (
                    <Marquee speed={25} delay={1}>
                        {sceneName} <div style={{ width: "24px" }} />
                    </Marquee>
                ) : (
                    <span>{sceneName}</span>
                )}
            </SceneNameWrapper>

            {showRenameDialog && (
                <DetailsPopup
                    title="Rename Game"
                    textInputData={{
                        label: "Game Name",
                        value: dialogName,
                        setValue: setDialogName,
                    }}
                    saveDisabled={!dialogName.trim()}
                    onSave={handleNameChange}
                    onCancel={() => setShowRenameDialog(false)}
                    style={{ width: "280px" }}
                />
            )}
        </>
    );
};
