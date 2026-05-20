import {useState} from "react";
import styled from "styled-components";

import {EmittersPanel, type EmittersPanelActions} from "./EmittersPanel";
import {PlayBar} from "./PlayBar/PlayBar";
import {Preview} from "./Preview";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {regularFont} from "../../../../assets/style";
import global from "@stem/editor-oss/global";
import {EDITOR_TOP_NAV_HEIGHT} from "@stem/editor-oss/types/editor";
import {ActionButton as SceneActionButton} from "../ActionBar/ActionBar.style";
import {StyledButton} from "../common/StyledButton";

type Props = {
    onClose: () => void;
};

export const VFXEditor = ({onClose}: Props) => {
    const app = global.app as EngineRuntime;
    const [panelActions, setPanelActions] = useState<EmittersPanelActions | null>(null);

    const handleClose = () => {
        const selected = app.editor?.getSelectedObject();
        app.call("objectChanged", app.editor, selected);
        onClose();
    };

    return (
        <>
            <TopMenuOverlay />
            <EditorRegion>
                <HeaderTitle>Particle Editor</HeaderTitle>
                <HeaderActions>
                    <StyledButton
                        isBlue
                        width="72px"
                        onClick={() => panelActions?.onSave()}
                        className="blueBtn"
                        disabled={!panelActions}
                    >
                        Save
                    </StyledButton>
                    <CloseActionButton
                        onClick={() => panelActions?.onCloseRequest()}
                        title="Close VFX Editor"
                        aria-label="Close VFX Editor"
                        disabled={!panelActions}
                    >
                        ×
                    </CloseActionButton>
                </HeaderActions>
                <EditorContent id="vfxEditor">
                    <Preview />
                    <EmittersPanel
                        onClose={handleClose}
                        onActionsReady={setPanelActions}
                    />
                    <PlayBar />
                </EditorContent>
            </EditorRegion>
        </>
    );
};

const TopMenuOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: ${EDITOR_TOP_NAV_HEIGHT};
    z-index: 102;
    background: rgba(9, 12, 18, 0.52);
    pointer-events: all;
`;

const EditorRegion = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    top: ${EDITOR_TOP_NAV_HEIGHT};
    bottom: 0;
    z-index: 101;
    pointer-events: none;
`;

const EditorContent = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 50%;
    left: 50%;
    box-sizing: border-box;
    transform: translate(-50%, -50%);
    display: flex;
    overflow: hidden;
    pointer-events: auto;
`;

const HeaderTitle = styled.span`
    position: fixed;
    z-index: 103;
    left: 12px;
    top: calc(${EDITOR_TOP_NAV_HEIGHT} + 8px);
    ${regularFont("l")};
    color: var(--theme-font-main-selected-color);
    font-weight: var(--theme-font-medium-plus);
    pointer-events: none;
`;

const HeaderActions = styled.div`
    position: fixed;
    z-index: 103;
    right: 12px;
    top: calc(${EDITOR_TOP_NAV_HEIGHT} + 8px);
    display: flex;
    align-items: center;
    column-gap: 8px;
    pointer-events: all;
`;

const CloseActionButton = styled(SceneActionButton)`
    font-size: 22px;
    line-height: 1;
`;
