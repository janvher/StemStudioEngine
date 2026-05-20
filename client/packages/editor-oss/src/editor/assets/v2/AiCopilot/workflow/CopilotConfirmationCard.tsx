import React from "react";

import {
    ConfirmationActions,
    ConfirmationButton,
    ConfirmationCard,
    ConfirmationInlineMeta,
    ConfirmationMetaLabel,
    ConfirmationSystemTag,
    ConfirmationText,
    ConfirmationTitle,
    ValidationCapsule,
    ValidationList,
} from "../AiCopilot.styles";
import type {CopilotValidationResult} from "../../CopilotWorkspace/copilotPreviewSession";

type ValidationCapsuleStatus = Exclude<CopilotValidationResult["status"], "pending">;

const validationCapsuleLabels: Record<string, string> = {
    "scene-loads": "Scene",
    "player-spawn": "Player",
    "main-camera": "Camera",
    "game-enabled": "Game Mode",
    "asset-resolution": "Assets",
    "runtime-errors": "Runtime",
    "physics-init": "Physics",
    "generated-code-static": "Behavior Code",
    "generated-lambda-static": "Lambdas",
    "multiplayer-sync": "Multiplayer",
    "performance-budget": "Performance",
};

const isValidationCapsuleResult = (
    result: CopilotValidationResult,
): result is CopilotValidationResult & {status: ValidationCapsuleStatus} =>
    result.status !== "pending";

export const getValidationCapsules = (validationResults: CopilotValidationResult[]) =>
    validationResults
        .filter(isValidationCapsuleResult)
        .map(result => ({
            id: result.id,
            label: validationCapsuleLabels[result.id] ?? result.label,
            status: result.status,
            title: result.detail ? `${result.label}: ${result.detail}` : result.label,
        }));

type Props = {
    summary: string;
    affectedSystems: string;
    validationResults: CopilotValidationResult[];
    onAccept: () => void;
    onKeepTesting: () => void;
    onRevise: () => void;
    onReject: () => void;
    acceptDisabled?: boolean;
    acceptTitle?: string;
    rejectDisabled?: boolean;
};

export const CopilotConfirmationCard = ({
    summary,
    affectedSystems,
    validationResults,
    onAccept,
    onKeepTesting,
    onRevise,
    onReject,
    acceptDisabled = false,
    acceptTitle,
    rejectDisabled = false,
}: Props) => {
    const validationCapsules = getValidationCapsules(validationResults);

    return (
        <ConfirmationCard>
            <ConfirmationTitle>Temporary Preview Ready</ConfirmationTitle>
            <ConfirmationText>{summary}</ConfirmationText>
            <ConfirmationInlineMeta>
                <ConfirmationMetaLabel>Affected</ConfirmationMetaLabel>
                <ConfirmationSystemTag>{affectedSystems}</ConfirmationSystemTag>
            </ConfirmationInlineMeta>
            {validationCapsules.length > 0 ? (
                <ValidationList>
                    {validationCapsules.map(result => (
                        <ValidationCapsule
                            key={result.id}
                            $status={result.status}
                            title={result.title}
                        >
                            {result.label}
                        </ValidationCapsule>
                    ))}
                </ValidationList>
            ) : (
                <ConfirmationText>Validation pending</ConfirmationText>
            )}
            <ConfirmationActions>
                <ConfirmationButton
                    type="button"
                    $variant="primary"
                    disabled={acceptDisabled}
                    title={acceptTitle}
                    onClick={onAccept}
                >
                    Accept & Create Version
                </ConfirmationButton>
                <ConfirmationButton
                    type="button"
                    onClick={onKeepTesting}
                >
                    Keep Testing
                </ConfirmationButton>
                <ConfirmationButton
                    type="button"
                    onClick={onRevise}
                >
                    Revise
                </ConfirmationButton>
                <ConfirmationButton
                    type="button"
                    $variant="danger"
                    disabled={rejectDisabled}
                    onClick={onReject}
                >
                    Reject Changes
                </ConfirmationButton>
            </ConfirmationActions>
        </ConfirmationCard>
    );
};
