import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";
import {TextInput} from "../TextInput";

export const Popup = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 3;

    width: 264px;
    padding: 8.5px 12.5px;
    background: var(--theme-dialog-bg);
    border-radius: var(--theme-dialog-border-radius);
    border: none;
    box-shadow: var(--theme-dialog-shadow);

    display: flex;
    flex-direction: column;
    gap: 8px 0;
    justify-content: flex-start;
`;

export const PopupItem = styled.div<{$saveButton?: boolean}>`
    ${flexCenter};
    width: 100%;
    height: 40px;
    ${({$saveButton}) => $saveButton && `margin: 42px 0 5px;`};

    .checkboxLabelWrapper {
        width: calc(100% - 40px);
    }

    .checkboxLabel {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

export const PopupItemHeader = styled.div<{$small?: boolean}>`
    ${flexCenter};
    width: 100%;
    height: 40px;
    justify-content: space-between;
    ${regularFont("s")};
    font-weight: var(--theme-font-bold);
    line-height: 130%;

    ${({$small}) =>
        $small &&
        `
    font-weight: var(--theme-font-medium-plus);
    font-size: 12px;
    `}
`;

export const Overlay = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
`;

export const Property = styled.div`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
`;

export const Label = styled.label`
    display: block;
    ${regularFont("s")};
    color: #a1a1aa;
`;

export const Input = styled(TextInput)<{$editMode?: boolean}>`
    width: 100%;
    height: 24px;
    color: white;

    ${({$editMode}) =>
        $editMode &&
        `
    border: 1px solid var(--theme-container-active-blue);
    `}
`;
