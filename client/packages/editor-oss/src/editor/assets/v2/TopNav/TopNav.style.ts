import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";
import {EDITOR_TOP_NAV_HEIGHT} from "@stem/editor-oss/types/editor";

export const StyledNav = styled.nav`
    position: fixed;
    z-index: 101;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: ${EDITOR_TOP_NAV_HEIGHT};
    background: var(--theme-container-main-dark);

    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
`;

export const WorkspaceHeaderGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
`;

export const WorkspaceProjectInput = styled.div`
    width: min(260px, 24vw);
    min-width: 160px;
    height: 32px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.04);
    color: #f8fafc;
    font-size: 13px;
    line-height: 1;
    overflow: hidden;
`;

export const WorkspaceMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(248, 250, 252, 0.68);
    font-family: "Source Code Pro", monospace;
    font-size: 11px;
    white-space: nowrap;
`;

export const WorkspaceVersionChip = styled.button<{$preview?: boolean}>`
    height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    border: 1px solid ${({$preview}) => $preview ? "rgba(14, 165, 233, 0.45)" : "rgba(255, 255, 255, 0.14)"};
    border-radius: 6px;
    background: ${({$preview}) => $preview ? "rgba(14, 165, 233, 0.14)" : "rgba(255, 255, 255, 0.05)"};
    color: #f8fafc;
    font-family: "Source Code Pro", monospace;
    font-size: 12px;
    cursor: default;
`;

export const WorkspaceSaved = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(248, 250, 252, 0.72);
`;

export const LeftSide = styled.div`
    font-weight: 400;
    font-size: var(--theme-font-size-s);
    color: #f8fafc;
    width: 240px;

    .go-back-icon {
        padding: 2px;
        width: 24px;
    }

    .go-back-icon,
    .menuIcon {
        cursor: pointer;
        border-radius: 8px;
        transition: 0.3s;
        &:hover {
            background-color: #262626;
        }
    }
`;

export const SceneNameWrapper = styled.div`
    overflow: hidden;
    white-space: nowrap;
    display: inline-block;
    max-width: 180px;
    flex-grow: 1;
    text-align: center;
    position: relative;
    cursor: pointer;
    .space {
        width: 24px;
    }
`;

export const Middle = styled.div`
    ${flexCenter};
    background: var(--theme-grey-bg);
    padding: 2px;
    border-radius: 8px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
`;
export const Right = styled.div`
    ${flexCenter};
`;

export const EditorButton = styled.div<{$isBlue: boolean; $disabled?: boolean}>`
    width: 78px;
    height: 28px;
    border-top-width: 1px;
    padding: 8px 12px;
    border-radius: 8px;
    background: ${({$isBlue}) => ($isBlue ? "#0284c7" : "transparent")};
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    cursor: ${({$disabled}) => $disabled ? "not-allowed" : "pointer"};
    opacity: ${({$disabled}) => $disabled ? 0.45 : 1};
    text-align: center;
`;

export const RenameInput = styled.input`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    color: #f8fafc;
    border: none;
    background: transparent;
    outline: none;
    width: 150px;
    border-bottom: 1px solid #a3a3a3;
    padding-bottom: 4px;
    margin-bottom: -4px;
`;
