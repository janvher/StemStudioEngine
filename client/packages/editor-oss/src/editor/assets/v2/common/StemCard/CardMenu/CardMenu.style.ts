import styled from "styled-components";

import {flexCenter} from "../../../../../../assets/style";

export const MENU_SIZE = "24px";

export const MenuButton = styled.div<{$active: boolean}>`
    position: relative;
    ${flexCenter};
    width: ${MENU_SIZE};
    height: ${MENU_SIZE};
    border-radius: 8px;
    background-color: ${({$active}) => $active ? "#2a2e42" : "transparent"};
    transition: 0.15s;

    &:hover {
        background-color: #2a2e42;
    }

    img.dots {
        width: 12px;
        height: 3px;
    }
`;

export const OptionsContainerPortal = styled.div`
    position: fixed;
    z-index: 10000;

    width: 114px;
    padding: 4px;
    border-radius: 8px;
    border: 1px solid var(--theme-grey-bg-secondary);
    background: var(--theme-grey-bg);
`;

export const StyledOption = styled.button`
    width: 100%;
    text-align: left;
    color: var(--theme-font-unselected-secondary-color);
    font-size: var(--theme-font-size-s);
    line-height: 133%;
    border-radius: 4px;
    padding: 2px 4px;

    &:hover {
        background: var(--theme-grey-bg-tertiary-button-hover);
    }
`;
