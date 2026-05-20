import React, {useState} from "react";
import styled from "styled-components";

import trashIcon from "../../../../../../editor/assets/v2/icons/trash.svg";
import {StyledButton} from "../../../common/StyledButton";

const SectionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.1);
    width: 100%;
    box-sizing: border-box;
`;

const SectionHeader = styled.div<{$isExpanded: boolean}>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-main-selected-color);
    margin-bottom: ${props => props.$isExpanded ? "8px" : "0"};
`;

const ExpandToggle = styled.span`
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
`;

const ActionsContainer = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

interface ActionConfig {
    label: string;
    onClick: () => void;
    variant?: "delete" | "primary";
}

/**
 * Optional toggle rendered inline in the section header. Clicks on the
 * toggle are isolated from the expand/collapse click so the user can
 * enable/disable without expanding.
 */
interface HeaderToggleConfig {
    checked: boolean;
    onChange: (next: boolean) => void;
    ariaLabel?: string;
}

interface CollapsibleEditorSectionProps {
    title: string;
    defaultExpanded?: boolean;
    actions?: ActionConfig[];
    /**
     * When provided, renders an enable/disable switch in the header.
     * Click bubbling is stopped so toggling doesn't affect expansion.
     */
    headerToggle?: HeaderToggleConfig;
    children?: React.ReactNode;
}

const HeaderSwitch = styled.label`
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    padding: 2px 4px;

    input {
        appearance: none;
        -webkit-appearance: none;
        width: 32px;
        height: 18px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s ease;
        margin: 0;

        &::before {
            content: "";
            position: absolute;
            top: 2px;
            left: 2px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #d8d8d8;
            transition: left 0.2s ease, background 0.2s ease;
        }

        &:checked {
            background: var(--theme-font-main-selected-color, #4c86ff);
            &::before {
                left: 16px;
                background: #fff;
            }
        }
    }
`;

export const CollapsibleEditorSection: React.FC<CollapsibleEditorSectionProps> = ({
    title,
    defaultExpanded = true,
    actions = [],
    headerToggle,
    children,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <SectionWrapper>
            <SectionHeader $isExpanded={isExpanded}>
                <ExpandToggle onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? "▼" : "▶"} {title}
                </ExpandToggle>
                {(headerToggle || actions.length > 0) &&
                    <ActionsContainer onClick={(e) => e.stopPropagation()}>
                        {headerToggle && (
                            <HeaderSwitch
                                onClick={(e) => e.stopPropagation()}
                                aria-label={headerToggle.ariaLabel ?? `Toggle ${title}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={headerToggle.checked}
                                    onChange={(e) => headerToggle.onChange(e.target.checked)}
                                />
                            </HeaderSwitch>
                        )}
                        {actions.map((action, index) =>
                            <React.Fragment key={index}>
                                {action.variant === "delete" ?
                                    <img
                                        src={trashIcon}
                                        alt="Delete"
                                        onClick={action.onClick}
                                        style={{cursor: "pointer"}}
                                        key={index}
                                    />
                                 :
                                    <StyledButton key={index}
                                        isBlue
                                        onClick={action.onClick}
                                    >
                                        {action.label}
                                    </StyledButton>
                                }
                            </React.Fragment>,
                        )}
                    </ActionsContainer>
                }
            </SectionHeader>

            {isExpanded && children}
        </SectionWrapper>
    );
};
