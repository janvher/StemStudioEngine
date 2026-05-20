import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

/**
 * Shell-level styled primitives for the CodeEditor.
 *
 * These were promoted wholesale from BehaviorCreator.style.ts. The names have
 * been made asset-agnostic (e.g. SettingsPanel -> RightPanel,
 * BEHAVIOR_CREATOR_HEADER_HEIGHT -> HEADER_HEIGHT) since the shell now hosts
 * behaviors, lambdas, and file assets.
 *
 * Right-panel per-kind styles (Property / Label / Input / SectionTitle /
 * DetailsData / ExpandButton / ReadOnlyInput) continue to live in
 * BehaviorCreator.style.ts — they are panel content, not shell.
 */

export const HEADER_HEIGHT = "57px";

// --- Modal shell ---------------------------------------------------------

export const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

export const ModalContent = styled.div`
    background-color: var(--ce-bg, var(--theme-dialog-bg));
    border: none;
    box-shadow: var(--theme-dialog-shadow);
    width: 100%;
    height: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

// --- Header --------------------------------------------------------------

export const ModalHeader = styled.div`
    padding: 12px;
    height: ${HEADER_HEIGHT};
    flex-shrink: 0;
    border-bottom: 1px solid var(--ce-border, var(--theme-container-divider));
    background: var(--ce-bg, inherit);
    color: var(--ce-fg, inherit);
    ${regularFont("s")}
    font-weight: var(--theme-font-medium-plus);
    ${flexCenter};
    justify-content: space-between;
    position: relative;
    z-index: 2;

    .heading {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium-plus);
        color: var(--ce-fg, inherit);
    }
`;

export const ButtonsWrapper = styled.div`
    ${flexCenter};
    column-gap: 4px;
`;

export const HeaderIconBtn = styled.button<{$accent?: boolean}>`
    ${flexCenter};
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid #ffffff1a;
    background: ${p => (p.$accent ? "var(--theme-button-bg-blue)" : "transparent")};
    color: ${p => (p.$accent ? "#fff" : "var(--ce-fg, #d4d4d8)")};
    cursor: pointer;
    transition:
        background 0.15s,
        color 0.15s;
    &:hover {
        background: ${p => (p.$accent ? "var(--theme-button-bg-blue-hover, #2563eb)" : "#ffffff14")};
        color: #fff;
    }
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const HeaderTextBtn = styled.button`
    ${flexCenter};
    gap: 4px;
    height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid #ffffff1a;
    background: transparent;
    color: var(--ce-fg, #d4d4d8);
    font-size: 14px;
    cursor: pointer;
    transition:
        background 0.15s,
        color 0.15s;
    &:hover {
        background: #ffffff14;
        color: #fff;
    }
`;

// --- Body columns --------------------------------------------------------

/**
 * Three-column body wrapper. Host the left asset tree, center Monaco surface,
 * and right per-kind panel as direct children.
 */
export const BodyWrapper = styled.div`
    display: flex;
    align-items: stretch;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden;
`;

/**
 * Center column hosting the Monaco editor surface.
 * Replaces BehaviorEditorContainer from BehaviorCreator.style.ts.
 */
export const EditorSurface = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    height: 100%;
    flex: 1;
    min-width: 0;
    border: 1px solid var(--ce-border, var(--theme-grey-bg));
    background: var(--ce-bg, #1e1e1e);
    position: relative;
`;

/**
 * Right column hosting the per-kind panel (BehaviorPanel / LambdaPanel /
 * FilePanel). Replaces SettingsPanel from BehaviorCreator.style.ts.
 */
export const RightPanel = styled.div`
    height: 100%;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 12px;
    padding-bottom: 8px;
    background: var(--ce-sidebar-bg, var(--theme-container-bg));
    color: var(--ce-fg, inherit);

    /* Allow child inputs/selects to shrink below their intrinsic size */
    input, select, textarea {
        min-width: 0;
    }

    .RevisionSection,
    .AttributesSection {
        flex-shrink: 0;
    }
`;

/**
 * Left column hosting the AssetTree (behaviors / lambdas / files folders).
 * Width is handled by the parent (ResizableFileTree-style wrapper).
 */
export const LeftPanel = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    border-right: 1px solid var(--ce-border, var(--theme-container-divider));
    background: var(--ce-sidebar-bg, var(--theme-container-bg));
    overflow: hidden;
`;
