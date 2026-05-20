import {useMemo, useState} from "react";
import styled from "styled-components";

import arrow from "./arrow.svg";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import AIWorldController from "../../../../../../controls/AiWorldController/AiWorldController";
import global from "@stem/editor-oss/global";
import {StyledTextarea} from "../../../common/StyledTextarea";
import {CreditsBar} from "../../../CreditsBar/CreditsBar";
export const PromptForm = styled.form<{$isAiLoading: boolean}>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: calc(100% - 16px);
    padding: 4px;
    box-sizing: border-box;
    background: var(--theme-grey-bg);
    border-radius: 8px;

    ${props =>
        props.$isAiLoading &&
        `
        opacity: 0.7;
        cursor: progress;
        & input, & textarea {
            pointer-events: none;
        }

    `}
`;

export const SubmitButton = styled.button`
    outline: none;
    border: none;
    border-radius: 8px;
    height: 32px;
    width: 32px;
    color: var(--theme-font-main-selected-color);
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    background: #0284c7;
    text-align: center;
    cursor: pointer;
    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    margin-left: auto;
    img {
        margin-bottom: -2px;
    }
`;

type Props = {
    onSubmit?: (prompt: string) => void;
    onResponse?: (prompt: string) => void;
    onError?: (error: Error) => void;
    scriptSource: string;
    setScriptSource: (source: string) => void;
    isAiLoading: boolean;
    setIsAiLoading: (loading: boolean) => void;
    disabled?: boolean;
};

export const AiPromptComponent = ({
    onSubmit,
    onResponse,
    onError,
    scriptSource,
    setScriptSource,
    isAiLoading,
    setIsAiLoading,
    disabled,
}: Props) => {
    const [prompt, setPrompt] = useState("");
    const app = global?.app;
    const {aiCredits} = useAuthorizationContext();
    const noCredits = aiCredits !== null && aiCredits <= 0;
    const aiControl = useMemo(() => {
        if (!app) {
            return null;
        }
        return AIWorldController.getInstance(app);
    }, [app]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPrompt("");
        void handleAiSubmit(prompt);
        onSubmit?.(prompt);
    };

    const handleAiSubmit = async (prompt: string) => {
        setIsAiLoading(true);
        try {
            const response = await aiControl?.generateCodeEdit(prompt + ` code: ${scriptSource}`);
            if (response?.code) {
                setScriptSource(response.code);
                onResponse?.(response.code);
            }
        } catch (error) {
            console.error(error);
            onError?.(new Error("Failed to generate code"));
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <PromptForm onSubmit={handleSubmit}
            $isAiLoading={isAiLoading}
        >
            <StyledTextarea
                disabled={isAiLoading || disabled}
                value={prompt}
                setValue={value => setPrompt(value)}
                placeholder="Ask me to change or fix code"
            />
            <div style={{display: "flex", alignItems: "center"}}>
                <CreditsBar />
                <SubmitButton disabled={isAiLoading || disabled || noCredits}
                    type="submit"
                >
                    <img src={arrow}
                        alt="Submit"
                    />
                </SubmitButton>
            </div>
        </PromptForm>
    );
};
