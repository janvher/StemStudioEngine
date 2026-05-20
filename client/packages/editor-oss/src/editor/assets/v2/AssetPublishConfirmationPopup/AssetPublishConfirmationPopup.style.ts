import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

export const Popup = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 99999;

    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;

    width: 264px;
    height: 547px;
    border-radius: var(--theme-dialog-border-radius);
    border: none;
    background: var(--theme-dialog-bg);
    box-shadow: var(--theme-dialog-shadow);
`;

export const Content = styled.div`
    padding: 12px 8px;
    width: 100%;
    flex-grow: 1;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
`;

export const Heading = styled.div`
    ${flexCenter};
    justify-content: space-between;
    column-gap: 8px;
    width: 100%;

    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-bold);
    color: var(--theme-font-main-selected-color);
`;

export const ButtonsContainer = styled.div`
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    row-gap: 8px;
`;
