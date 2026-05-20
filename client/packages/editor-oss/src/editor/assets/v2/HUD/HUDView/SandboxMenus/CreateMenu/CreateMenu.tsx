import { useRef, useState } from "react";
import { Object3D } from "three";

import { AIWrapper, Header, Menu } from "./CreateMenu.style";
import { LoadingView } from "./LoadingView";
import { ResultView } from "./ResultView";
import i18n from "@stem/editor-oss/i18n/config";
import { AssetsListMenu } from "../../../../ContextMenu/AssetsListMenu/AssetsListMenu";
import { BackButton, CloseButton } from "../../../../ContextMenu/common";
import { AiMessage, AiMessages, Separator } from "../../../../ContextMenu/ContextMenu.styles";
import plusIcon from "../../../../ContextMenu/icons/v2/plus.svg";
import { Create as SimpleCreate } from "../../../../ContextMenu/SimpleCreate/Create";
import { Wrapper } from "../style";


interface BuilderRefInterface {
    cancel: () => void;
    retry: () => void;
}

export const CreateMenu = () => {
    const [isAssetSelectionOpen, setIsAssetSelectionOpen] = useState(false);
    const [isAICreationOpen, setIsAICreationOpen] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState("");
    const [aiMessages, setAiMessages] = useState<string[]>([]);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const builderRef = useRef<BuilderRefInterface>(null);

    const handleClose = () => {
        setIsAICreationOpen(false);
    };
    const handleGoBack = () => {
        setIsAICreationOpen(false);
        setIsGenerated(false);
        setIsAssetSelectionOpen(true);
    };

    const handleFinished = (model: Object3D | null) => {
        setThumbnailUrl(model?.userData?.Thumbnail || null);
        setIsGenerated(true);
        setErrorMessage(model ? null : i18n.t("Failed to generate model"));
    };

    const handleRetry = () => {
        builderRef.current?.retry();
        setIsGenerated(false);
        setThumbnailUrl(null);
        setErrorMessage(null);
        setIsAILoading(false);
        setAiMessages([]);
    };

    const handleCancel = () => {
        builderRef.current?.cancel();
        setIsGenerated(false);
        setThumbnailUrl(null);
        setErrorMessage(null);
        setIsAILoading(false);
        setAiMessages([]);
        setIsAssetSelectionOpen(false);
        setCurrentPrompt("");
    };

    return (
        <Wrapper
            onMouseDown={() => {
                // const event = new PointerEvent("pointerup", {bubbles: true});
                // (app!.game!.cameraControl as any).pointerUpHandler(event);
            }}
        >
            {isAICreationOpen && 
                <AIWrapper>
                    <Header>
                        <BackButton
                            onClick={handleGoBack}
                        />{" "}
                        {i18n.t("AI Generation")}{" "}
                        <CloseButton
                            onClick={handleClose}
                        />{" "}
                    </Header>
                    {aiMessages.filter(msg => msg?.trim() !== "").length > 0 && 
                        <>
                            <AiMessages>
                                {aiMessages.map((msg, index) => 
                                    <AiMessage key={index}>{msg}</AiMessage>,
                                )}
                            </AiMessages>
                            <Separator style={{ marginBottom: "8px", background: "var(--theme-container-milky)" }} />
                        </>
                    }

                    {isAILoading ? 
                        <LoadingView onCancel={handleCancel} />
                     : 
                        isGenerated && 
                            <ResultView
                                onRetry={handleRetry}
                                goBack={handleGoBack}
                                prompt={currentPrompt}
                                thumbnailUrl={thumbnailUrl}
                                errorMessage={errorMessage}
                            />
                        
                    }
                    <SimpleCreate
                        setIsOpen={setIsAICreationOpen}
                        isOpen={isAICreationOpen && !isAILoading && !isGenerated}
                        onMenuClose={() => setIsAICreationOpen(false)}
                        setIsAILoading={setIsAILoading}
                        onFinished={handleFinished}
                        inPlayerView
                        passPrompt={(prompt: string) => setCurrentPrompt(prompt)}
                        ref={builderRef}
                        setAiMessages={setAiMessages}
                    />
                </AIWrapper>
            }

            {isAssetSelectionOpen ? 
                <AssetsListMenu
                    close={() => setIsAssetSelectionOpen(false)}
                    openAIBuilder={() => {
                        setIsAICreationOpen(true);
                        setIsAssetSelectionOpen(false);
                    }}
                />
             : isAICreationOpen ? null : 
                <Menu
                    onClick={() => {
                        isAILoading ? setIsAICreationOpen(true) : setIsAssetSelectionOpen(true);
                    }}
                    title={i18n.t("Click to open create menu (or right-click in scene)")}
                >
                    {i18n.t("Create")}
                    <img src={plusIcon}
                        alt=""
                        className="plusIcon"
                    />
                </Menu>
            }
        </Wrapper>
    );
};
