import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Finalization } from "./Finalization";
import { GenerationStepsList } from "./GenerationStepsList";
import { PromptStep } from "./PromptStep";
import { Result } from "./Result";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import AIWorldController from "../../../../../controls/AiWorldController/AiWorldController";
import {
    AI_AGENT_MODE,
    COMMANDS,
    PendingCommandData,
} from "../../../../../controls/AiWorldController/AiWorldController.types";
import global from "@stem/editor-oss/global";
import { showToast } from "@stem/editor-oss/showToast";
import { CollisionType } from "../../types/physics";
import { getPhysics } from "../../utils/getPhysics";
import { Menu } from "../ContextMenu.styles";

export enum AI_BUILDER_STEPS {
    PROMPT = "Prompt",
    SEARCH = "Search",
    GENERATE = "Generate",
    RESULT = "Result",
    FINALIZATION = "Finalization",
}

export enum COMMAND_CONFIRMATION_STATUS {
    PENDING = "Pending",
    CONFIRMED = "Confirmed",
    REJECTED = "Rejected",
}

type Props = {
    isOpen: boolean;
    onFinished?: (model: THREE.Object3D | null) => void;
    onMenuClose: () => void;
    onAILoading?: () => void;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    position?: { x: number; y: number };
    objectToReplace?: THREE.Object3D | null;
    replaceObject?: boolean;
    inPlayerView?: boolean;
    setIsAILoading: React.Dispatch<React.SetStateAction<boolean>>;
    passPrompt?: (prompt: string) => void;
    setAiMessages?: React.Dispatch<React.SetStateAction<string[]>>;
};

export const Create = forwardRef(function Create(
    { isOpen, onMenuClose, setIsOpen, setIsAILoading, onAILoading, onFinished, passPrompt, setAiMessages }: Props,
    ref,
) {
    const [prompt, setPrompt] = useState("");
    const [isRequesting, setIsRequesting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(AI_BUILDER_STEPS.PROMPT);
    const [modelData, setModelData] = useState<{
        modelUrl: string;
        width: number;
        height: number;
    }>({
        modelUrl: "",
        width: 1,
        height: 2,
    });
    const [generatedCommands, setGeneratedCommands] = useState<any[]>([]);
    const [foundModels, setFoundModels] = useState<any[]>([]);
    const checkIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const selectedModelRef = useRef<any>(null);
    const wasCancelledRef = useRef(false);

    let retryAttempts = 0;
    const pendingCommandConfirmationStatusRef = useRef<COMMAND_CONFIRMATION_STATUS>(
        COMMAND_CONFIRMATION_STATUS.PENDING,
    );

    const app = global.app as EngineRuntime;

    const aiWorldController = useMemo(() => {
        const controller = AIWorldController.getInstance(app);
        controller.setCommandsRequiringConfirmation([COMMANDS.GET_SEARCH_RESULTS]);
        controller.setAgentMode(AI_AGENT_MODE.SANDBOX_GENERATION);
        controller.resetAIAgentThread();
        setAiMessages?.([]);

        return controller;
    }, []);

    useEffect(() => {
        passPrompt?.(prompt);
    }, [prompt]);

    const handleRetry = () => {
        if (generatedCommands.length > 0) {
            generatedCommands.forEach(command => {
                command?.undo?.();
            });
        }
        setGeneratedCommands([]);
        setStep(AI_BUILDER_STEPS.PROMPT);
    };

    const handleClose = () => {
        setIsOpen(false);
        onMenuClose();
        setPrompt("");
        setStep(AI_BUILDER_STEPS.PROMPT);
    };

    const onPendingCnfirmation = async (commandData: PendingCommandData) => {
        if (wasCancelledRef.current) return;
        pendingCommandConfirmationStatusRef.current = COMMAND_CONFIRMATION_STATUS.PENDING;
        if (commandData.aiCommand?.type === COMMANDS.GET_SEARCH_RESULTS) {
            return await handleSearchResultsConfirmation(commandData);
        }
    };

    const handleSearchResultsConfirmation = async (commandData: PendingCommandData) => {
        if (wasCancelledRef.current) return;
        setStep(AI_BUILDER_STEPS.SEARCH);
        const searchResults = JSON.parse(commandData.aiAgentRequest?.params.searchResults || "{}");
        const assets = searchResults.assets || [];
        setFoundModels(assets);
        setIsAILoading(false);
        const data = await new Promise((resolve, reject) => {
            checkIntervalRef.current = setInterval(() => {
                if (wasCancelledRef.current) {
                    clearInterval(checkIntervalRef.current);
                    reject(new Error("User cancelled the command"));
                }
                if (pendingCommandConfirmationStatusRef.current === COMMAND_CONFIRMATION_STATUS.CONFIRMED) {
                    clearInterval(checkIntervalRef.current);
                    searchResults.assets = assets.map((asset: any) => {
                        // If Sketchfab asset, remove download URL it contains token expiring after some time
                        return {
                            ...asset,
                            downloadUrl: asset.provider === "sketchfab" ? "" : asset.downloadUrl,
                        };
                    });
                    resolve({
                        ...commandData,
                        aiAgentRequest: {
                            ...commandData.aiAgentRequest,
                            params: {
                                searchResults: JSON.stringify(searchResults),
                            },
                            userMessage: selectedModelRef.current
                                ? `User selected a model to import. Selected model ID: ${selectedModelRef.current.id}`
                                : "User verified search results and requested to generate a new model using AI",
                        },
                    });
                } else if (pendingCommandConfirmationStatusRef.current === COMMAND_CONFIRMATION_STATUS.REJECTED) {
                    clearInterval(checkIntervalRef.current);
                    reject(new Error("User rejected the command"));
                }
            }, 100);
        });

        return data as PendingCommandData;
    };

    const sendRequest = useCallback(
        async (prompt: string) => {
            try {
                const res = await aiWorldController?.callAIAgent(prompt);
                if (wasCancelledRef.current) return;
                if (res?.response && res.response.trim() !== "") {
                    setAiMessages?.(prev => [...prev, res.response]);
                }
                if (res?.commands) {
                    await aiWorldController?.executeLoopedCommands(
                        res.commands,
                        aiRes => aiRes?.trim() !== "" ? setAiMessages?.(prev => [...prev, aiRes]) : null,
                        (cmds: any[]) => setGeneratedCommands(prev => [...prev, ...cmds]),
                        onPendingCnfirmation,
                    );
                } else {
                    throw new Error();
                }
            } catch (error: any) {
                if (error.code === "ERR_CANCELED") return;
                console.error("Send request error: ", error);
                throw new Error("Failed to generate commands. Please try again.");
            }
        },
        [setAiMessages],
    );

    const handleSubmit = async (customPrompt?: string) => {
        let aiPrompt = prompt || customPrompt;
        if (!aiPrompt) return;
        setIsAILoading(true);
        setIsRequesting(true);
        onAILoading?.();
        setLoading(true);
        selectedModelRef.current = null;
        wasCancelledRef.current = false;
        aiWorldController.resetSignal();
        try {
            await sendRequest(aiPrompt);
            retryAttempts = 0;
            if (wasCancelledRef.current) return;

            const model =
                aiWorldController?.getLastModifiedObject() || (app.editor?.selected as THREE.Object3D | null) || null;

            onFinished?.(model);
            setDynamicPhysics(model);

            if (!onFinished) {
                setStep(AI_BUILDER_STEPS.RESULT);
                setModelData({
                    ...modelData,
                    modelUrl: model?.userData.Url,
                });
            }
        } catch (error: any) {
            retryAttempts += 1;
            console.error('handleSubmit error:', error);
            if (error.code === "ERR_CANCELED") return;
            showToast({ type: "error", title: "Failed to generate commands" });

            if (retryAttempts < 4) {
                showToast({
                    type: "info",
                    title: `Retrying in 3 seconds... (Attempt ${retryAttempts}/4)`,
                });
                setTimeout(() => {
                    void handleSubmit(
                        `Last request failed, try again. If previous request contained commands try to use different parameters. Original user prompt: ${aiPrompt}`,
                    );
                }, 3000);
                return;
            } else {
                showToast({
                    type: "error",
                    title: "Maximum retry attempts reached. Please try again with a different prompt.",
                });
                retryAttempts = 0;
            }
        } finally {
            if (retryAttempts === 0) {
                setIsAILoading(false);
                setIsRequesting(false);
                setLoading(false);
                setPrompt("");
            }
        }
    };

    const setDynamicPhysics = (model: THREE.Object3D | null) => {
        if (!model) return;
        const currentPhysics = model.userData.physics || {};
        model.userData.physics = getPhysics({
            ...currentPhysics,
            enabled: true,
            mass: 1,
            ctype: CollisionType.Dynamic,
        });
    };

    const handleResetThread = () => {
        aiWorldController?.resetAIAgentThread();
        setAiMessages?.([]);
    };

    const handleCancel = () => {
        aiWorldController?.abortAIAgent();
        wasCancelledRef.current = true;
        setIsRequesting(false);
        setLoading(false);
        setIsAILoading(false);
        setStep(AI_BUILDER_STEPS.PROMPT);
        setPrompt("");
        setGeneratedCommands([]);
        retryAttempts = 0;
        setAiMessages?.([]);
    };

    useImperativeHandle(ref, () => ({
        cancel: handleCancel,
        retry: handleRetry,
    }));

    const handleAcceptSelectedModel = (selectedModel: any) => {
        selectedModelRef.current = selectedModel;
        pendingCommandConfirmationStatusRef.current = COMMAND_CONFIRMATION_STATUS.CONFIRMED;
        setIsAILoading(true);
    };

    const handleGenerate = () => {
        selectedModelRef.current = null;
        pendingCommandConfirmationStatusRef.current = COMMAND_CONFIRMATION_STATUS.CONFIRMED;
        setIsAILoading(true);
    };

    const handleAcceptResult = () => {
        setStep(AI_BUILDER_STEPS.FINALIZATION);
    };

    useEffect(() => {
        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, []);

    if (!isOpen) return null;
    return (
        <Menu>
            {step === AI_BUILDER_STEPS.PROMPT && 
                <PromptStep
                    isOpen
                    prompt={prompt}
                    setPrompt={setPrompt}
                    isRequesting={isRequesting}
                    loading={loading}
                    handleSubmit={handleSubmit}
                />
            }
            {(step === AI_BUILDER_STEPS.GENERATE || step === AI_BUILDER_STEPS.SEARCH) && 
                <GenerationStepsList
                    handleAccept={handleAcceptSelectedModel}
                    handleGenerate={handleGenerate}
                    foundModels={foundModels}
                    setStep={setStep}
                    step={step}
                />
            }
            {step === AI_BUILDER_STEPS.RESULT && 
                <Result modelUrl={modelData.modelUrl}
                    onAccept={handleAcceptResult}
                    onRemix={handleGenerate}
                />
            }

            {step === AI_BUILDER_STEPS.FINALIZATION && 
                <Finalization
                    handleFinished={handleClose}
                    handleAddAnother={() => setStep(AI_BUILDER_STEPS.PROMPT)}
                    handleCreate={() => {
                        handleResetThread();
                        void handleSubmit();
                    }}
                />
            }
        </Menu>
    );
});
