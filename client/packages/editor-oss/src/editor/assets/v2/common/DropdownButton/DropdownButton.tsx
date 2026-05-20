import React, {useRef, useState} from "react";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import arrowDownIcon from "../../RightPanel/icons/arrow-down.svg";
import {StyledButton} from "../StyledButton";

type DropdownOption = {
    label: string;
    onClick: () => void;
};

type Props = {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    dropdownOptions: DropdownOption[];
    style?: React.CSSProperties;
    className?: string;
    id?: string;
    disabled?: boolean;
    isPinkGradient?: boolean;
    width?: string;
    addPlusIcon?: boolean;
};

export const DropdownButton = ({
    children,
    onClick,
    dropdownOptions,
    style,
    className,
    id,
    disabled,
    isPinkGradient,
    width,
    addPlusIcon,
}: Props) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(containerRef as React.RefObject<HTMLElement>, () => setIsDropdownOpen(false));

    const handleMainButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
            onClick(e);
        }
    };

    const handleDropdownToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleOptionClick = (option: DropdownOption) => {
        option.onClick();
        setIsDropdownOpen(false);
    };

    return (
        <Container ref={containerRef}
            style={style}
            className={className}
            id={id}
        >
            <ButtonGroup $isPinkGradient={isPinkGradient}
                $width={width}
            >
                <MainButton
                    onClick={handleMainButtonClick}
                    disabled={disabled}
                    width={width ? `calc(${width} - 32px)` : "108px"}
                    addPlusIcon={addPlusIcon}
                >
                    {children}
                </MainButton>
                <DropdownToggle onClick={handleDropdownToggle}
                    disabled={disabled}
                    width="32px"
                >
                    <ArrowIcon src={arrowDownIcon}
                        $isOpen={isDropdownOpen}
                    />
                </DropdownToggle>
            </ButtonGroup>
            {isDropdownOpen &&
                <DropdownMenu>
                    {dropdownOptions.map((option, index) => 
                        <DropdownItem key={index}
                            onClick={() => handleOptionClick(option)}
                        >
                            {option.label}
                        </DropdownItem>,
                    )}
                </DropdownMenu>
            }
        </Container>
    );
};

const Container = styled.div`
    position: relative;
    display: inline-block;
`;

const ButtonGroup = styled.div<{$isPinkGradient?: boolean; $width?: string}>`
    display: flex;
    align-items: center;
    border-radius: 8px;
    width: ${({$width}) => $width || "140px"};
    height: 32px;

    ${({$isPinkGradient}) =>
        $isPinkGradient &&
        `
        background: linear-gradient(90deg, #9730FF 0%, #EB1BB2 100.33%);
    `}
`;

const MainButton = styled(StyledButton)`
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent !important;

    &:hover {
        background: rgba(255, 255, 255, 0.1) !important;
    }
`;

const DropdownToggle = styled(StyledButton)`
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    padding: 8px 6px;
    background: transparent !important;

    &:hover {
        background: rgba(255, 255, 255, 0.1) !important;
    }
`;

const ArrowIcon = styled.img<{$isOpen: boolean}>`
    width: 12px;
    height: 12px;
    transition: transform 0.2s ease;
    transform: ${({$isOpen}) => $isOpen ? "rotate(180deg)" : "rotate(0deg)"};
    filter: brightness(0) invert(1);
`;

const DropdownMenu = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--theme-container-secondary-dark);
    border-radius: 8px;
    box-shadow: 0px 4px 15px 0px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    margin-top: 4px;
    overflow: hidden;
`;

const DropdownItem = styled.div`
    padding: 12px 16px;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: white;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: var(--theme-container-divider);
    }

    &:first-child {
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
    }

    &:last-child {
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
    }
`;
