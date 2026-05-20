import {useLayoutEffect, useRef, useState} from "react";

import {useLibrariesContext} from "@stem/editor-oss/context";
import {TABS} from "../types";
import {ActiveTab, TabButton, TabContainer} from "./AnimatedTabs.style";

export const AnimatedTabs = () => {
    const tabs = Object.values(TABS);
    const {activeTab, setActiveTab, setActiveSceneLibrary, setActiveFolder} = useLibrariesContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState({left: 0, width: 0});

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        const activeBtn = containerRef.current.querySelector<HTMLButtonElement>(`button[data-tab="${activeTab}"]`);
        if (activeBtn) {
            const btnRect = activeBtn.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            setRect({
                left: btnRect.left - containerRect.left,
                width: btnRect.width,
            });
        }
    }, [activeTab, tabs.length]);

    return (
        <TabContainer ref={containerRef}>
            <ActiveTab style={{left: rect.left, width: rect.width}} />

            {tabs.map(tab => {
                return (
                    <TabButton
                        key={tab}
                        data-tab={tab}
                        $active={tab === activeTab}
                        onClick={() => {
                            setActiveSceneLibrary(undefined);
                            setActiveFolder(undefined);
                            setActiveTab(tab);
                        }}
                    >
                        {tab}
                    </TabButton>
                );
            })}
        </TabContainer>
    );
};
