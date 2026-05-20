import {useEffect, useRef, useState} from "react";
import Marquee from "react-fast-marquee";

import {SceneNameWrapper} from "./TopNav.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {truncateName} from "../../../../v2/pages/services";

export const SceneNameReadOnly = () => {
    const app = global.app as EngineRuntime;

    const textRef = useRef<HTMLSpanElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const [isOverflow, setIsOverflow] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [sceneName, setSceneName] = useState(app.editor?.sceneName || "");
    const [sceneLoaded, setSceneLoaded] = useState(false);

    useEffect(() => {
        if (sceneLoaded && sceneName) {
            document.title = sceneName;
        }
    }, [sceneLoaded, sceneName]);

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

        app.on("clear.TopNav", () => {
            setSceneName(app.editor?.sceneName || "");
        });

        app.on("sceneLoaded.TopNav", () => {
            const newName = app.editor?.sceneName || "";
            document.title = newName || "StemStudio";
            setSceneName(newName);
            setSceneLoaded(true);
        });

        setSceneName(app.editor?.sceneName || "");

        return () => {
            app.on("sceneNameUpdated.TopNav", null);
            app.on("clear.TopNav", null);
            app.on("sceneLoaded.TopNav", null);
        };
    }, [app]);

    const shouldMarquee = isOverflow && isActive;

    return (
        <SceneNameWrapper
            ref={wrapperRef}
            onMouseEnter={() => setIsActive(true)}
            onMouseLeave={() => setIsActive(false)}
            onTouchStart={() => setIsActive(true)}
        >
            <span
                ref={textRef}
                className="sceneName"
                style={{position: "absolute", visibility: "hidden", whiteSpace: "nowrap"}}
            >
                {truncateName(sceneName, 20)}
            </span>

            {shouldMarquee ? (
                <Marquee
                    speed={25}
                    delay={0}
                >
                    <span className="sceneName">{sceneName}</span> <div style={{width: "24px"}} />
                </Marquee>
            ) : (
                <span className="sceneName"> {truncateName(sceneName, 20)}</span>
            )}
        </SceneNameWrapper>
    );
};
