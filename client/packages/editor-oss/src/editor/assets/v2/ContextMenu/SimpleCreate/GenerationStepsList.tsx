import React, { useState, useEffect } from "react";

import { Step, StepDetails, SubmitButton, ResultImage, ImagesWrapper, ModelContainer } from "../ContextMenu.styles";
import { AI_BUILDER_STEPS } from "./Create";
import global from "@stem/editor-oss/global";
import { ModelViewer } from "../../ModelViewer/ModelViewer";
import aiButton from "../icons/ai-button.svg";

type GenerationStepsListProps = {
    handleAccept: (model: any) => void;
    handleGenerate: () => void;
    foundModels: any[];
    setStep: (step: AI_BUILDER_STEPS) => void;
    step: AI_BUILDER_STEPS;
};

export const GenerationStepsList: React.FC<GenerationStepsListProps> = ({
    handleAccept,
    handleGenerate,
    foundModels,
    setStep,
    step,
}) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [buttonText, setButtonText] = useState("Accept");
    const [isInitial, setIsInitial] = useState(true);
    const isInGame = !!global.app?.isPlaying;
    const firstModelsThumbnails = foundModels.slice(0, isInGame ? 5 : 3).map((model: any) => model.previewUrl);

    useEffect(() => {
        if (selectedImage === aiButton) {
            setSelectedModel(null);
            setIsRendered(false);
            setButtonText("Create AI Model");
            setStep(AI_BUILDER_STEPS.GENERATE);
        } else {
            setStep(AI_BUILDER_STEPS.SEARCH);
            setSelectedModel(foundModels.find(model => model.previewUrl === selectedImage));
            setButtonText("Accept");
        }
    }, [selectedImage]);

    useEffect(() => {
        if (step === AI_BUILDER_STEPS.GENERATE) {
            setSelectedImage(aiButton);
        } else if (isInitial) {
            setIsInitial(false);
            setSelectedImage(firstModelsThumbnails[0]);
        }
    }, [step, isInitial]);

    const handleImageSelect = (img: string) => {
        setSelectedImage(img);
        const model = foundModels.find(model => model.previewUrl === img);
        setSelectedModel(model || null);
    };

    return (
        <>
            <Step>
                <StepDetails>
                    <ImagesWrapper>
                        {[...firstModelsThumbnails, aiButton].map((img, index) => 
                            <ResultImage
                                key={index}
                                onClick={() => handleImageSelect(img)}
                                $isSelected={selectedImage === img}
                            >
                                <img src={img}
                                    alt="result"
                                />
                            </ResultImage>,
                        )}
                    </ImagesWrapper>
                </StepDetails>
            </Step>
            {selectedModel && 
                <ModelContainer>
                    <ModelViewer
                        modelUrl={selectedModel.downloadUrl}
                        setIsRendered={setIsRendered}
                        isRendered={isRendered}
                    />
                </ModelContainer>
            }
            <SubmitButton
                $isInGame={isInGame}
                onClick={() => step === AI_BUILDER_STEPS.SEARCH ? handleAccept(selectedModel) : handleGenerate()}
            >
                {buttonText}
            </SubmitButton>
        </>
    );
};
