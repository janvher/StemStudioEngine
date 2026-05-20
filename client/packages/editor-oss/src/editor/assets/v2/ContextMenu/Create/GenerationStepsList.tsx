import React, {useState, useEffect, useRef} from "react";
import {useOnClickOutside} from "usehooks-ts";

import {AI_BUILDER_STEPS} from "./Create";
import {
    GENERATION_STEPS_FUNCTIONS,
    GenerationStep,
} from "../../../../../controls/AiWorldController/AiWorldController.types";
import {BehaviorConfig} from "../../../../../editor/behaviors/BehaviorConfig";
import {ModelViewer} from "../../ModelViewer/ModelViewer";
import {
    StepsWrapper,
    Step,
    StepDetails,
    StepDetailsItem,
    StepInput,
    SubmitButton,
    ResultImage,
    ImagesWrapper,
    ModelContainer,
    InputWrapper,
    InputButton,
    EmptyInput,
    BehaviorsMenu,
    BehaviorsMenuItem,
} from "../ContextMenu.styles";
import aiButton from "../icons/ai-button.svg";
import trashIcon from "../icons/trash.svg";

type GenerationStepsListProps = {
    generationSteps: GenerationStep[];
    handleParamChange: (step: string, paramName: string, value: any) => void;
    handleAccept: (model: any) => void;
    handleGenerate: () => void;
    handleEnhanceSelect: () => void;
    foundModels: any[];
    behaviorConfigs: BehaviorConfig[];
    setStep: (step: AI_BUILDER_STEPS) => void;
    step: AI_BUILDER_STEPS;
};

export const GenerationStepsList: React.FC<GenerationStepsListProps> = ({
    generationSteps,
    handleParamChange,
    handleEnhanceSelect,
    handleAccept,
    handleGenerate,
    behaviorConfigs,
    foundModels,
    setStep,
    step,
}) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [buttonText, setButtonText] = useState("Accept");
    const [behaviorsMenuOpen, setBehaviorsMenuOpen] = useState(false);
    const [isInitial, setIsInitial] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);
    const filteredSteps = generationSteps.filter(step => step.function !== GENERATION_STEPS_FUNCTIONS.GENERATE_MODEL);
    const first3ModelsThumbnails = foundModels.slice(0, 3).map((model: any) => model.Thumbnail);

    useOnClickOutside(menuRef as React.RefObject<HTMLElement>, () => setBehaviorsMenuOpen(false));

    useEffect(() => {
        if (selectedImage === aiButton) {
            handleEnhanceSelect();
            setSelectedModel(null);
            setIsRendered(false);
            setButtonText("Generate AI Model");
        } else {
            setStep(AI_BUILDER_STEPS.SEARCH);
            setSelectedModel(foundModels.find(model => model.Thumbnail === selectedImage));
            setButtonText("Accept");
        }
    }, [selectedImage]);

    useEffect(() => {
        if (step === AI_BUILDER_STEPS.GENERATE) {
            setSelectedImage(aiButton);
        } else if (isInitial) {
            setIsInitial(false);
            setSelectedImage(first3ModelsThumbnails[0]);
        }
    }, [step, isInitial]);

    const handleImageSelect = (img: string) => {
        setSelectedImage(img);
    };

    return (
        <>
            <StepsWrapper>
                <Step>
                    1. Prompt Result
                    <StepDetails>
                        <ImagesWrapper>
                            {[...first3ModelsThumbnails, aiButton].map((img, index) => 
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
                            modelUrl={selectedModel.Url}
                            setIsRendered={setIsRendered}
                            isRendered={isRendered}
                        />
                    </ModelContainer>
                }
                {filteredSteps.map((step, index) => {
                    const paramsList = Object.keys(step.parameters).map(key => ({
                        key,
                        value: step.parameters[key],
                    }));

                    return (
                        <Step key={index + 1}>
                            {index + 2}. {step.step}
                            {paramsList.length > 0 && 
                                <StepDetails>
                                    {paramsList.map(({key, value}) => {
                                        const isBehaviorsArray =
                                            Array.isArray(value) &&
                                            step.function === GENERATION_STEPS_FUNCTIONS.ATTACH_BEHAVIORS;
                                        return (
                                            <StepDetailsItem key={key}>
                                                {step.function !== GENERATION_STEPS_FUNCTIONS.ATTACH_BEHAVIORS && 
                                                    <span>{key}</span>
                                                }

                                                {isBehaviorsArray ? 
                                                    <>
                                                        {value
                                                            .filter(val =>
                                                                behaviorConfigs.find(b => b.id === val.toLowerCase()),
                                                            )
                                                            .map((val, index) => 
                                                                <InputWrapper key={index}>
                                                                    <StepInput disabled
                                                                        key={index}
                                                                        value={val}
                                                                    />
                                                                    <InputButton
                                                                        onClick={() =>
                                                                            handleParamChange(
                                                                                step.step,
                                                                                key,
                                                                                value.filter((_, i) => i !== index),
                                                                            )
                                                                        }
                                                                    >
                                                                        <img src={trashIcon}
                                                                            alt="delete"
                                                                        />
                                                                    </InputButton>
                                                                </InputWrapper>,
                                                            )}

                                                        <EmptyInput onClick={() => setBehaviorsMenuOpen(true)}>
                                                            Add
                                                            <InputButton>+</InputButton>
                                                        </EmptyInput>
                                                        {behaviorsMenuOpen && 
                                                            <BehaviorsMenu ref={menuRef}>
                                                                {behaviorConfigs.map((config, index) => {
                                                                    const isSelected = value.includes(config.id);
                                                                    return (
                                                                        <BehaviorsMenuItem
                                                                            $isSelected={isSelected}
                                                                            key={index}
                                                                            onClick={() => {
                                                                                handleParamChange(step.step, key, [
                                                                                    ...value,
                                                                                    config.id,
                                                                                ]);
                                                                                setBehaviorsMenuOpen(false);
                                                                            }}
                                                                        >
                                                                            {config.name}
                                                                        </BehaviorsMenuItem>
                                                                    );
                                                                })}
                                                            </BehaviorsMenu>
                                                        }
                                                    </>
                                                 : 
                                                    <StepInput
                                                        value={value}
                                                        onChange={e =>
                                                            handleParamChange(step.step, key, e.target.value)
                                                        }
                                                    />
                                                }
                                            </StepDetailsItem>
                                        );
                                    })}
                                </StepDetails>
                            }
                        </Step>
                    );
                })}
            </StepsWrapper>
            <SubmitButton
                $isSecondary={step === AI_BUILDER_STEPS.SEARCH}
                onClick={() => step === AI_BUILDER_STEPS.SEARCH ? handleAccept(selectedModel) : handleGenerate()}
            >
                {buttonText}
            </SubmitButton>
        </>
    );
};
