import React from "react";
import styled from "styled-components";
import {PiecewiseBezier} from "three.quarks";

import {BezierCurveEditor} from "./BezierCurveEditor";
import {NEW_EDITOR_LAYER_Z_INDEX} from "../../../AnimationCombiner/ModelAnimationCombiner.style";
import {useEscapeDismiss} from "../../../common/hooks/useEscapeDismiss";
import closeIcon from "../../../icons/close-panel.svg";

interface BezierCurveEditorModalProps {
    value: PiecewiseBezier;
    onChange?: (value: PiecewiseBezier) => void;
    onClose: () => void;
    width?: number;
    height?: number;
}

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: ${NEW_EDITOR_LAYER_Z_INDEX + 1};
`;

const ModalContent = styled.div`
    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    padding: 20px;
    box-shadow: var(--theme-dialog-shadow);
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
`;

const ModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--theme-container-divider);
`;

const ModalTitle = styled.h3`
    margin: 0;
    color: var(--theme-font-main-selected-color);
    font-size: 16px;
    font-weight: var(--theme-font-medium-plus);
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
        background: var(--theme-container-secondary-dark);
    }

    img {
        width: 13px;
        height: auto;
    }
`;

const EditorWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

export const BezierCurveEditorModal: React.FC<BezierCurveEditorModalProps> = ({
    value,
    onChange,
    onClose,
    width = 600,
    height = 400,
}) => {
    useEscapeDismiss({onEscape: onClose});

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <ModalOverlay onClick={handleOverlayClick}>
            <ModalContent onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Bezier Curve Editor</ModalTitle>
                    <CloseButton onClick={onClose}
                        title="Close editor"
                        className="reset-css"
                    >
                        <img src={closeIcon}
                            alt="close"
                        />
                    </CloseButton>
                </ModalHeader>

                <EditorWrapper>
                    <BezierCurveEditor value={value}
                        onChange={onChange}
                        width={width}
                        height={height}
                    />
                </EditorWrapper>
            </ModalContent>
        </ModalOverlay>
    );
};
