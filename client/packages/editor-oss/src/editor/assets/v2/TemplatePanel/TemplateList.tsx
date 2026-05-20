import {useEffect, useState} from "react";

import {GAME_TEMPLATE_ID, ITemplate, TEMPLATES} from "./constants/templates";
import {SingleTemplate} from "./SingleTemplate/SingleTemplate";
import {StyledTemplateList} from "./TemplatePanel.style";
import {getStartersStats} from "@stem/network/api/scene";
import {showToast} from "@stem/editor-oss/showToast";

export type TemplateProps = {
    templates: ITemplate[];
    selectedItemId: string;
    onClick: (id: string) => void;
    onDoubleClick: (id: string, newTab?: boolean) => void;
};

export const TemplateList = ({templates, selectedItemId, onClick, onDoubleClick}: TemplateProps) => {
    const [startersStats, setStartersStats] = useState({blankProjectCount: 0, sandboxStarterCount: 0});

    useEffect(() => {
        void (async () => {
            try {
                const res = await getStartersStats();
                if (res) {
                    setStartersStats(res);
                }
            } catch (e) {
                console.error(e);
                showToast({type: "error", title: "Failed to get starters stats."});
            }
        })();
    }, []);

    const gametemplate = TEMPLATES.find(el => !el.IsSandbox) || TEMPLATES[0]!;
    const sandboxTemplate = TEMPLATES.find(el => el.IsSandbox);
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return (
        <StyledTemplateList>
            <SingleTemplate
                key={GAME_TEMPLATE_ID}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                selectedItemId={selectedItemId}
                item={{...gametemplate, RemixCount: startersStats.blankProjectCount}}
            />
            {isLocalhost && sandboxTemplate && (
                <SingleTemplate
                    key={sandboxTemplate.ID}
                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    selectedItemId={selectedItemId}
                    item={{...sandboxTemplate, RemixCount: startersStats.sandboxStarterCount}}
                />
            )}
            {templates && templates.length > 0 && 
                <>
                    {templates.map((item, index) => 
                        <SingleTemplate
                            key={item.ID + index}
                            onClick={onClick}
                            onDoubleClick={onDoubleClick}
                            selectedItemId={selectedItemId}
                            item={item}
                        />,
                    )}
                </>
            }
        </StyledTemplateList>
    );
};
