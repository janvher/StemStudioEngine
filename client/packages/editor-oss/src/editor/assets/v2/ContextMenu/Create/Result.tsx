import React from "react";

import {
    GENERATION_STEPS_FUNCTIONS,
    GenerationStep,
} from "../../../../../controls/AiWorldController/AiWorldController.types";
import {
    Step,
    StepDetails,
    StepDetailsItem,
    StepInput,
    StepsWrapper,
    SubmitButton,
} from "../ContextMenu.styles";

type ResultProps = {
    onRemix: () => void;
    onAccept: () => void;
    generationSteps: GenerationStep[];
    handleParamChange: (step: string, paramName: string, value: any) => void;
};

export const Result: React.FC<ResultProps> = ({onRemix, onAccept, generationSteps, handleParamChange}) => {
    const enhanceStep = generationSteps.find(step => step.function === GENERATION_STEPS_FUNCTIONS.ENCHANCE_PROMPT);
    const paramsList = Object.keys(enhanceStep?.parameters).map(key => ({
        key,
        value: enhanceStep?.parameters[key],
    }));
    return (
        <>
            <StepsWrapper>
                <Step>
                    1. AI Generation Result
                </Step>

                {enhanceStep &&
                    <Step>
                        2. {enhanceStep.step}
                        {paramsList.length > 0 &&
                            <StepDetails>
                                {paramsList.map(({key, value}) => {
                                    return (
                                        <StepDetailsItem key={key}>
                                            <span>{key}</span>

                                            <StepInput
                                                value={value}
                                                onChange={e => handleParamChange(enhanceStep.step, key, e.target.value)}
                                            />
                                        </StepDetailsItem>
                                    );
                                })}
                            </StepDetails>
                        }
                    </Step>
                }
            </StepsWrapper>

            <SubmitButton onClick={onRemix}>Remix AI Generation</SubmitButton>
            <SubmitButton $isSecondary
                onClick={onAccept}
            >
                Accept
            </SubmitButton>
        </>
    );
};
