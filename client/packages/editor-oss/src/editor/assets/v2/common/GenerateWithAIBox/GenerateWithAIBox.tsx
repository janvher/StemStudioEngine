import {useState} from "react";

import {Helper, UploadButton} from "./GenerateWithAIBox.style";
import {useModelsTabContext} from "@stem/editor-oss/context";
import {LabelButton} from "../../common/LabelButton";
import {ContextMenuWrapper} from "../../ContextMenu/ContextMenuWrapper/ContextMenuWrapper";
import {Create} from "../../ContextMenu/Create/Create";
import magicAiIcon from "../../icons/magic-ai.svg";
import {StyledButton} from "../StyledButton";

export const GenerateWithAIBox = ({
    simplified,
    sceneID,
    grey,
    onGenerationStart,
}: {
    grey?: boolean;
    simplified?: boolean;
    addToProject?: boolean;
    sceneID?: string;
    onGenerationStart?: () => void;
}) => {
    const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
    const {setModelUploadCallback} = useModelsTabContext();
    const position = {x: window.innerWidth / 2, y: window.innerHeight / 2};

    const handleClose = () => {
        setIsAiPromptOpen(false);
        setModelUploadCallback(null);
    };

    const handleGenerationStart = () => {
        setIsAiPromptOpen(false);
        onGenerationStart?.();
    };

    return (
        <>
            {simplified ? 
                <LabelButton isPink
                    width="auto"
                    onClick={() => setIsAiPromptOpen(true)}
                >
                    <img src={magicAiIcon} />
                    Generate
                </LabelButton>
             : 
                <UploadButton $grey={grey}>
                    {!grey && <Helper className="helper-white helper">Don’t see what you’re looking for?</Helper>}
                    <StyledButton width="auto"
                        style={{padding: "8px 12px"}}
                        onClick={() => setIsAiPromptOpen(true)}
                    >
                        <img src={magicAiIcon} />
                        {grey ? "Generate" : "Generate with AI"}
                    </StyledButton>
                </UploadButton>
            }

            {isAiPromptOpen && 
                <ContextMenuWrapper
                    position={position}
                    center
                    isOpen={isAiPromptOpen}
                    header="AI Generation"
                    close={() => setIsAiPromptOpen(false)}
                >
                    <Create
                        setIsOpen={setIsAiPromptOpen}
                        isOpen={isAiPromptOpen}
                        onMenuClose={handleClose}
                        position={position}
                        sceneID={sceneID}
                        onGenerationStart={handleGenerationStart}
                    />
                </ContextMenuWrapper>
            }
        </>
    );
};
