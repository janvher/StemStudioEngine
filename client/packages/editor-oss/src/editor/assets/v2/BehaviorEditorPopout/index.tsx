import {useCallback, useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import styled, {StyleSheetManager} from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";
import {CodeEditorShell} from "../AssetsLibrary/CodeEditor/CodeEditorShell";
import type {InitialSelection} from "../AssetsLibrary/CodeEditor/types";
import {usePopoutWindow} from "../common/hooks/usePopoutWindow";
import {StyledButton} from "../common/StyledButton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CodeEditorPopoutProps = {
    sceneId: string;
    initialSelection?: InitialSelection;
};

export type PopoutEditorEntry = {
    id: string;
    mode: "code-editor";
    title: string;
    codeEditorProps?: CodeEditorPopoutProps;
    /** Pre-opened window reference (opened synchronously in click handler to avoid popup blockers). */
    popupWindow?: Window;
};

// ---------------------------------------------------------------------------
// PopoutEditorWindow — renders one editor inside a popup browser window
// ---------------------------------------------------------------------------

export const PopoutEditorWindow = ({
    entry,
    onClose,
    onRegisterFocus,
    onRestoreInline,
}: {
    entry: PopoutEditorEntry;
    onClose: () => void;
    onRegisterFocus?: (id: string, focusFn: () => void) => void;
    onRestoreInline?: (selection?: InitialSelection) => void;
}) => {
    const {isOpen, popoutContainer, popoutWindow, open, focus} = usePopoutWindow(onClose, entry.popupWindow);
    const isDirtyRef = useRef(false);

    // Fallback: if no pre-opened window was provided, open one now.
    // This path is less reliable (useEffect loses user-gesture context)
    // but keeps backwards compatibility.
    useEffect(() => {
        if (!entry.popupWindow) {
            open(entry.title);
        }
    }, [open, entry.title, entry.popupWindow]);

    // Register focus callback so parent can bring this window to front
    useEffect(() => {
        onRegisterFocus?.(entry.id, focus);
    }, [entry.id, focus, onRegisterFocus]);

    // Set up beforeunload on the popup to warn about unsaved changes
    useEffect(() => {
        if (!popoutWindow) return;
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        popoutWindow.addEventListener("beforeunload", handler);
        return () => popoutWindow.removeEventListener("beforeunload", handler);
    }, [popoutWindow]);

    const handleDirtyChange = useCallback((dirty: boolean) => {
        isDirtyRef.current = dirty;
    }, []);

    // Wrap onClose to show confirmation if there are unsaved changes
    const handleClose = useCallback(() => {
        if (isDirtyRef.current) {
            const ownerWin = popoutWindow ?? window;
            const confirmed = ownerWin.confirm(
                "You have unsaved changes. Are you sure you want to close?",
            );
            if (!confirmed) return;
        }
        onClose();
    }, [onClose, popoutWindow]);

    const handleRestoreInline = useCallback(() => {
        if (isDirtyRef.current) {
            const ownerWin = popoutWindow ?? window;
            const confirmed = ownerWin.confirm(
                "You have unsaved changes. Restore inline will discard popout drafts. Continue?",
            );
            if (!confirmed) return;
        }
        onRestoreInline?.(entry.codeEditorProps?.initialSelection);
    }, [onRestoreInline, popoutWindow, entry.codeEditorProps?.initialSelection]);

    if (!isOpen || !popoutContainer) return null;

    const modal =
        entry.mode === "code-editor" && entry.codeEditorProps ?
            <CodeEditorShell
                sceneId={entry.codeEditorProps.sceneId}
                initialSelection={entry.codeEditorProps.initialSelection}
                onClose={handleClose}
                onDirtyChange={handleDirtyChange}
                onRestoreInline={onRestoreInline ? handleRestoreInline : undefined}
            />
         : null;

    if (!modal) return null;
    const styledModal = popoutWindow ? 
        <StyleSheetManager target={popoutWindow.document.head}>{modal}</StyleSheetManager>
     : 
        modal
    ;
    return createPortal(styledModal, popoutContainer);
};

// ---------------------------------------------------------------------------
// PopoutIndicator — small bar showing open popout windows + Restore All
// ---------------------------------------------------------------------------

export const PopoutIndicator = ({
    editors,
    onRestoreAll,
}: {
    editors: PopoutEditorEntry[];
    onRestoreAll: () => void;
}) => {
    if (editors.length === 0) return null;

    return (
        <IndicatorBar>
            {editors.map(entry => 
                <Chip key={entry.id}>
                    <ChipIcon>&#8599;</ChipIcon>
                    <ChipLabel>{entry.title}</ChipLabel>
                </Chip>,
            )}
            <StyledButton isGrey
                onClick={onRestoreAll}
                style={{height: 28, fontSize: 12}}
            >
                Restore All
            </StyledButton>
        </IndicatorBar>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const IndicatorBar = styled.div`
    position: absolute;
    bottom: 18px;
    right: 18px;
    ${flexCenter};
    gap: 8px;
    padding: 6px 10px;
    border-radius: 12px;
    border: 1px solid #ffffff1a;
    background: var(--theme-container-minor-dark);
    pointer-events: all;
    z-index: 100;
`;

const Chip = styled.div`
    ${flexCenter};
    gap: 4px;
    padding: 4px 10px;
    border-radius: 8px;
    background: var(--theme-grey-bg);
    border: 1px solid #ffffff0a;
`;

const ChipIcon = styled.span`
    font-size: 12px;
    color: #5b6178;
`;

const ChipLabel = styled.span`
    ${regularFont("s")};
    font-size: 12px;
    color: #a1a1aa;
    white-space: nowrap;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
`;
