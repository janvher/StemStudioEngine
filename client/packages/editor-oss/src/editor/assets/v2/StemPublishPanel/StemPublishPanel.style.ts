import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";
import {EDITOR_TOP_NAV_HALF_HEIGHT, PANEL_FULL_HEIGHT} from "@stem/editor-oss/types/editor";
import {TextInput} from "../common/TextInput";

export const Container = styled.div`
    position: fixed;
    z-index: 100;
    right: 12px;
    top: 50%;
    transform: translateY(calc(-50% + ${EDITOR_TOP_NAV_HALF_HEIGHT}));
    height: ${PANEL_FULL_HEIGHT};
    width: 264px;

    background: var(--theme-container-main-dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    color: var(--theme-font-main-selected-color);

    .common-text {
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        color: var(--theme-font-unselected-tertiary-color);
        line-height: 120%;
        text-align: left;
    }
`;

export const FloatingButton = styled.button<{$bottom?: boolean}>`
    position: absolute;
    ${({$bottom}) => $bottom ? `bottom: 8px` : `top: 8px`};
    right: 8px;
    width: 32px;
    height: 32px;
    padding: 8px;
    ${flexCenter};
    border-radius: 8px;
    background-color: var(--theme-grey-bg-secondary) !important;

    .xIcon {
        width: 16px;
        height: 16px;
    }
    .editIcon {
        width: 13px;
        height: 13px;
    }
`;

export const Config = styled.div`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 20px;
    width: 100%;
    padding: 10px 8px 12px;
    flex-grow: 1;
`;

export const Heading = styled.div`
    ${flexCenter};
    justify-content: space-between;
    column-gap: 8px;
    width: 100%;

    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-bold);
    color: var(--theme-font-main-selected-color);

    .statusIcon {
        width: 16px;
    }
`;

export const SharingHeading = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    column-gap: 8px;
    width: 100%;

    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-bold);
    color: var(--theme-font-main-selected-color);

    .statusIcon {
        width: 16px;
    }
`;

export const Property = styled.div`
    position: relative;
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
`;

export const Label = styled.label`
    display: block;
    ${regularFont("s")};
    color: #aeaeae;
`;

export const Input = styled(TextInput)<{$editMode?: boolean}>`
    width: 100%;
    height: 24px;
    color: white;
    background-color: var(--theme-grey-bg);

    ${({$editMode}) =>
        $editMode &&
        `
    border: 1px solid var(--theme-container-active-blue);
    `}
`;

export const ValidationError = styled.div`
    font-size: var(--theme-font-size-extra-small);
    line-height: 120%;
    color: var(--theme-font-red);
    position: absolute;
    bottom: -4px;
    left: 0;
    transform: translateY(100%);
`;
