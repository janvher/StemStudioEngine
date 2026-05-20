import styled from "styled-components";

import {regularFont} from "../../../../../assets/style";

export const Container = styled.div<{$right?: boolean}>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    padding: 8px;
    width: 200px;
    height: auto;
    border-radius: 16px;
    cursor: default;

    position: absolute;
    bottom: -12px;
    ${({$right}) => $right ? `right: 8px; ` : `left: 8px;`}

    transform: translateY(100%);

    background: var(--theme-container-main-dark);
    border: 1px solid #ffffff1a;

    input,
    label {
        margin-top: 0;
    }
`;

export const MenuItem = styled.li<{$disabled?: boolean}>`
    display: flex;
    align-items: center;
    cursor: ${({$disabled}) => $disabled ? "not-allowed" : "pointer"};
    width: 100%;
    transition: 0.2s;
    padding: 8px;
    border-radius: 8px;
    height: 32px;
    background-color: transparent;

    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    color: var(--theme-font-unselected-secondary-color);
    &:hover {
        background-color: var(--theme-container-hover-blue-border);
        color: var(--theme-font-main-selected-color);
    }

    .checkbox {
        margin-left: auto;
    }
`;

export const Overlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    border-radius: 16px;
`;
