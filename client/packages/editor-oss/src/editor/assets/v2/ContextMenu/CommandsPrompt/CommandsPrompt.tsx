import React, { useMemo, useState } from "react";
import * as THREE from "three";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import Command from "@stem/editor-oss/command/Command";
import AIWorldController from "../../../../../controls/AiWorldController/AiWorldController";
import global from "@stem/editor-oss/global";
import { showToast } from "@stem/editor-oss/showToast";
import { LoadingWrapper, Menu } from "../ContextMenu.styles";
import loadingIcon from "../icons/loading.png";
import { Finalization } from "../SimpleCreate/Finalization";
import { PromptStep } from "../SimpleCreate/PromptStep";


export enum AI_BUILDER_STEPS {
    PROMPT = "Prompt",
    FINALIZATION = "Finalization",
}

type Props = {
    isOpen: boolean;
    onMenuClose: () => void;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    selectedObject?: THREE.Object3D | null;
};

export const CommandsPrompt = ({ isOpen, onMenuClose, setIsOpen, selectedObject }: Props) => {
    const [prompt, setPrompt] = useState("");
    const [isRequesting, setIsRequesting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(AI_BUILDER_STEPS.PROMPT);
    const [generatedCommands, setGeneratedCommands] = useState<Command[]>([]);

    const app = global.app as EngineRuntime;

    const aiWorldController = useMemo(() => AIWorldController.getInstance(app), [isOpen]);

    const handleClose = () => {
        setIsOpen(false);
        onMenuClose();
        setPrompt("");
        setStep(AI_BUILDER_STEPS.PROMPT);
    };

    const handleRetry = () => {
        if (generatedCommands.length > 0) {
            generatedCommands.forEach(command => {
                command.undo();
            });
        }
        handleSubmit();
    };

    const handleSubmit = async () => {
        if (!prompt) return;
        setIsRequesting(true);
        setLoading(true);

        try {
            const commandsRes = await aiWorldController?.generateCommands(prompt, selectedObject);
            if (commandsRes?.commands) {
                // eslint-disable-next-line no-unsafe-optional-chaining
                const { allCommands } = await aiWorldController?.executeCommands(commandsRes.commands);
                setGeneratedCommands(allCommands as Command[]);
                setStep(AI_BUILDER_STEPS.FINALIZATION);
            } else {
                throw new Error();
            }
        } catch (error) {
            if ((error as {code?: string})?.code === "ERR_CANCELED") return;
            showToast({ type: "error", title: "Failed to generate commands" });
        } finally {
            setIsRequesting(false);
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Menu>
            {loading ?
                <LoadingWrapper>
                    <img src={loadingIcon}
                        alt="loading"
                    />
                </LoadingWrapper>
                :
                <>
                    {step === AI_BUILDER_STEPS.PROMPT &&
                        <PromptStep
                            isOpen
                            prompt={prompt}
                            setPrompt={setPrompt}
                            isRequesting={isRequesting}
                            loading={loading}
                            handleSubmit={handleSubmit}
                            placeholder={
                                selectedObject
                                    ? "What would like this Object to do?"
                                    : "What would like to Change or Add"
                            }
                        />
                    }

                    {step === AI_BUILDER_STEPS.FINALIZATION &&
                        <Finalization
                            handleFinished={handleClose}
                            handleAddAnother={() => setStep(AI_BUILDER_STEPS.PROMPT)}
                            handleCreate={handleRetry}
                        />
                    }
                </>
            }
        </Menu>
    );
};
