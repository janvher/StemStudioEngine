import React, {useEffect, useRef} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {useEscapeDismiss} from "./hooks/useEscapeDismiss";
import {ModalBackdrop} from "./ModalBackdrop";
import {ModalCloseButton} from "./ModalCloseButton";
import {flexCenter, regularFont} from "../../../../assets/style";
import i18n from "@stem/editor-oss/i18n/config";

const Container = styled.div`
    width: 400px;
    height: 200px;
    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    color: var(--theme-font-main-selected-color);
    ${flexCenter};
    flex-direction: column;
    position: relative;
`;

const Title = styled.div`
    width: 100%;
    height: 60px;
    background: var(--theme-dialog-bg);
    border-top-left-radius: var(--theme-dialog-border-radius);
    border-top-right-radius: var(--theme-dialog-border-radius);
    ${regularFont("s")};
    ${flexCenter};
    position: absolute;
    top: 0;
    left: 0;
`;


const Content = styled.div`
    padding: 24px 32px;
    text-align: center;
    flex: 1;
    ${flexCenter};
    flex-direction: column;
    gap: 0px;
    width: 100%;
    box-sizing: border-box;
`;

const ProgressContainer = styled.div`
    width: 200px;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
`;

const ProgressBar = styled.div<{$progress: number}>`
    height: 100%;
    background: linear-gradient(90deg, #ff6b9d, #ff9a56);
    border-radius: 4px;
    width: ${props => props.$progress}%;
    transition: width 0.3s ease;
`;

const StatusText = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-main-selected-color);
    margin-bottom: 8px;
    font-weight: 500;
`;

const DetailText = styled.div`
    ${regularFont("xs")};
    color: var(--theme-font-main-color);
    opacity: 0.7;
    margin-bottom: 2px;
`;

const PhaseIndicator = styled.span`
    margin-left: 8px;
    opacity: 0.7;
    font-size: 11px;
    font-weight: normal;
`;

export interface ImportProgress {
    currentStep?: string;
    overallProgress?: number; // 0-100 overall progress across all steps
    stepIndicator?: string; // e.g., "2/4"
}

interface ImportProgressDialogProps {
    isOpen: boolean;
    progress: ImportProgress | null;
    onClose?: () => void;
    allowClose?: boolean;
    title?: string;
}

export const ImportProgressDialog = ({
    isOpen,
    progress,
    onClose,
    allowClose = false,
    title = i18n.t("Importing Scene"),
}: ImportProgressDialogProps) => {
    const ref = useRef<HTMLDivElement>(null);

    useEscapeDismiss({
        onEscape: () => {
            if (allowClose && onClose) {
                onClose();
            }
        },
        enabled: allowClose && !!onClose,
    });

    useOnClickOutside(ref as React.RefObject<HTMLElement>, () => {
        if (allowClose && onClose) {
            onClose();
        }
    });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getStatusText = () => {
        if (!progress) return i18n.t("Initializing import...");
        return progress.currentStep || i18n.t("Preparing scene data...");
    };

    return (
        <ModalBackdrop>
            <Container ref={ref}>
                <Title>
                    {title}
                    {progress?.stepIndicator && <PhaseIndicator>{i18n.t("Step {{stepIndicator}}", {stepIndicator: progress.stepIndicator})}</PhaseIndicator>}
                    {allowClose && onClose && (
                        <ModalCloseButton onClick={onClose} />
                    )}
                </Title>
                <Content>
                    <StatusText>{getStatusText()}</StatusText>
                    <ProgressContainer>
                        <ProgressBar $progress={progress?.overallProgress ?? 0} />
                    </ProgressContainer>
                    <DetailText>{progress?.overallProgress ?? 0}%</DetailText>
                </Content>
            </Container>
        </ModalBackdrop>
    );
};
