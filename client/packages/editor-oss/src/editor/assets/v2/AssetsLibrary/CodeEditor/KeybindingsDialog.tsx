/**
 * KeybindingsDialog — shows all keyboard shortcuts available in the CodeEditor.
 */
import React from "react";
import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
const MOD = isMac ? "\u2318" : "Ctrl";
const SHIFT = isMac ? "\u21E7" : "Shift";

interface Keybinding {
    keys: string;
    description: string;
}

const KEYBINDINGS: Keybinding[] = [
    {keys: `${MOD}+S`, description: "Save current file"},
    {keys: `${MOD}+${SHIFT}+S`, description: "Save all files"},
    {keys: `${MOD}+P`, description: "Quick open (go to file)"},
    {keys: `${MOD}+${SHIFT}+F`, description: "Search across files"},
    {keys: `${MOD}+F`, description: "Find in current file"},
    {keys: `${MOD}+${SHIFT}+R`, description: "Find and replace"},
    {keys: `${MOD}+G`, description: "Go to line"},
    {keys: `F12`, description: "Go to definition"},
    {keys: `${MOD}+D`, description: "Select next occurrence"},
    {keys: `${MOD}+/`, description: "Toggle line comment"},
    {keys: `${MOD}+${SHIFT}+K`, description: "Delete line"},
    {keys: `${isMac ? "Option" : "Alt"}+\u2191/\u2193`, description: "Move line up/down"},
    {keys: `${MOD}+[/]`, description: "Indent/outdent"},
    {keys: `${MOD}+Z`, description: "Undo"},
    {keys: `${MOD}+${SHIFT}+Z`, description: "Redo"},
    {keys: `Escape`, description: "Close dialogs / quick open"},
];

interface KeybindingsDialogProps {
    onClose: () => void;
}

export const KeybindingsDialog: React.FC<KeybindingsDialogProps> = ({onClose}) => {
    return (
        <Overlay onClick={onClose}>
            <Dialog onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>Keyboard Shortcuts</Title>
                    <CloseBtn onClick={onClose}>&times;</CloseBtn>
                </Header>
                <Body>
                    {KEYBINDINGS.map((kb, i) => (
                        <Row key={i}>
                            <Keys>{kb.keys}</Keys>
                            <Description>{kb.description}</Description>
                        </Row>
                    ))}
                </Body>
            </Dialog>
        </Overlay>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.4);
    ${flexCenter};
`;

const Dialog = styled.div`
    width: min(420px, 90vw);
    max-height: 80vh;
    background: var(--theme-container-bg, #1e1e1e);
    border: 1px solid var(--theme-container-divider, #333);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Header = styled.div`
    ${flexCenter};
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--theme-container-divider, #333);
`;

const Title = styled.span`
    ${regularFont("s")};
    font-weight: 600;
    color: #e4e4e7;
`;

const CloseBtn = styled.button`
    background: none;
    border: none;
    color: #888;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
    &:hover {
        color: #fff;
    }
`;

const Body = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 18px;

    &:hover {
        background: var(--theme-hover-bg, #2a2d2e);
    }
`;

const Keys = styled.span`
    ${regularFont("s")};
    font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    font-size: 12px;
    color: #a1a1aa;
    background: rgba(255, 255, 255, 0.06);
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    white-space: nowrap;
`;

const Description = styled.span`
    ${regularFont("s")};
    color: #ccc;
    text-align: right;
`;
