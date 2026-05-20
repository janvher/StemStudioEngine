import React from "react";

import {ModelViewer} from "../../ModelViewer/ModelViewer";
import {ModelContainer, Step, StepsWrapper, SubmitButton} from "../ContextMenu.styles";

type ResultProps = {
    modelUrl: string;
    onRemix: () => void;
    onAccept: () => void;
};

export const Result: React.FC<ResultProps> = ({modelUrl, onRemix, onAccept}) => {
    const [isRendered, setIsRendered] = React.useState(false);

    return (
        <>
            <StepsWrapper>
                <Step>
                    {modelUrl && 
                        <ModelContainer>
                            <ModelViewer modelUrl={modelUrl}
                                setIsRendered={setIsRendered}
                                isRendered={isRendered}
                            />
                        </ModelContainer>
                    }
                </Step>
            </StepsWrapper>

            <SubmitButton onClick={onRemix}>Remix AI Generation</SubmitButton>
            <SubmitButton $isSecondary
                $isDark
                onClick={onAccept}
            >
                Accept
            </SubmitButton>
        </>
    );
};
