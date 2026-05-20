import styled, {keyframes} from "styled-components";

import OutOfDateBadge from "../../../../../common/OutOfDateBadge";

export const Overlay = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

export const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 4px;
    padding: 0 9px 8px;
`;

export const Preview = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--theme-editor-box-bg);
    border-radius: 6px;
    gap: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
    min-height: 40px;
    height: 40px;

    &:hover {
        background: var(--theme-grey-bg);
    }

    .icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
    }
`;

export const AssetName = styled.div`
    font-weight: var(--theme-font-medium-plus);
    font-size: var(--theme-font-size-extra-small);
    line-height: 16px;
    color: #a1a1aa;
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
`;

const popupAnimation = keyframes`
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export const InfoPopup = styled.div`
    position: absolute;
    bottom: 100%;
    left: 0;
    width: 100%;
    background: var(--theme-container-secondary-dark);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
    z-index: 1000;
    animation: ${popupAnimation} 0.2s ease;

    &::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 12px;
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid var(--theme-container-secondary-dark);
    }
`;

export const PopupDescription = styled.div`
    font-size: var(--theme-font-size-extra-small);
    color: #a1a1aa;
    line-height: 1.4;
    word-break: break-word;
    white-space: pre-wrap;
    max-height: 120px;
    overflow-y: auto;
`;

export const PopupContainer = styled.div`
    position: relative;
    width: 100%;
`;

export const StyledOutOfDateBadge = styled(OutOfDateBadge)`
    position: unset;
    padding: 0;
    height: auto;
    width: auto;
`;
