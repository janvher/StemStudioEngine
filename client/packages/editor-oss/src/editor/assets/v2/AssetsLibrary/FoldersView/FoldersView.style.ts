import styled, {keyframes} from "styled-components";

import {flexCenter} from "../../../../../assets/style";
import {StyledButton} from "../../common/StyledButton";

const fadeInButton = keyframes`
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export const FoldersList = styled.div`
    width: 100%;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
    align-items: start;
    justify-content: start;
    grid-gap: 22px 20px;
    max-width: 100%;
`;

export const FolderItemWrapper = styled.div<{$disabled?: boolean}>`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    row-gap: 4px;
    width: 100%;
    cursor: ${({$disabled}) => ($disabled ? "not-allowed" : "pointer")};
    opacity: ${({$disabled}) => ($disabled ? 0.62 : 1)};

    .folderIcon {
        width: 100%;
    }

    .thumbnail {
        border-radius: 8px;
        width: 100%;
        aspect-ratio: 1/1;
        margin: 0 auto;
    }

    .label {
        color: var(--theme-font-unselected-color);
        font-weight: var(--theme-font-medium-plus);
        font-size: var(--theme-font-size-extra-small);
        text-align: left;
    }
`;

export const FolderIconWrapper = styled.div`
    position: relative;
    width: 100%;
`;

export const UnavailableBadge = styled.span`
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.82);
    background: rgba(20, 23, 41, 0.78);

    &::after {
        content: "";
        position: absolute;
        left: 5px;
        top: 10px;
        width: 12px;
        height: 2px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.9);
        transform: rotate(-38deg);
        transform-origin: center;
    }
`;

export const FolderCount = styled.div`
    color: var(--theme-font-unselected-tertiary-color);
    font-size: 10px;
    line-height: 12px;
    min-height: 12px;
`;

export const IconContainer = styled.div`
    position: relative;
    width: 100%;
`;

export const Overlay = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    ${flexCenter};
    border-radius: 8px;
    column-gap: 8px;
    background-color: transparent;

    button.commonButton {
        z-index: 2;
        font-size: var(--theme-font-size-extra-small);
        padding: 4px 8px 4px 4px;
    }
`;

export const ImportButton = styled(StyledButton)`
    animation: ${fadeInButton} 0.3s ease forwards;
`;
