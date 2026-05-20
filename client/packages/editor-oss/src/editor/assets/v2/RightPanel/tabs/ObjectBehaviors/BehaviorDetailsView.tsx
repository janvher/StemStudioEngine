import { useCallback, useEffect, useMemo, useRef, useState, RefObject } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { useOnClickOutside } from "usehooks-ts";

import { BehaviorDocumentationPanel } from "./BehaviorDocumentationPanel/BehaviorDocumentationPanel";
import { BehaviorGeneralPanel } from "./BehaviorGeneralPanel";
import { BehaviorThrottlingPanel } from "./BehaviorThrottlingPanel";
import deleteIcon from "./icons/delete.svg";
import infoIcon from "./icons/info.svg";
import { TriggerFlowModal } from "./TriggerFlowModal";
import { getAssetResolutionContext, resolveAssetRevisionId } from '@stem/editor-oss/asset-management/AssetResolutionContext';
import BehaviorData from "../../../../../../behaviors/BehaviorData";
import { isLegacyBehaviorId } from '../../../../../../behaviors/util';
import { useAssetResolutionContext } from '@stem/editor-oss/context/AssetResolutionContext';
import { useBehaviorData } from '../../../../../../editor/behaviors/hooks/behaviors';
import global from "@stem/editor-oss/global";
import { BEHAVIOR_UI_CONTAINER_ID } from "@stem/editor-oss/types/editor";
import { StyledButton } from "../../../common/StyledButton";
import goBackIcon from "../../icons/go-back.svg";
import { Container, Header, IconWrapper } from "../../styles/Behaviors.style";

interface Props {
    selectedBehavior: BehaviorData;
    setSelectedBehavior: React.Dispatch<any>;
    playMode?: boolean;
}

export const BehaviorDetailsView = ({ selectedBehavior, setSelectedBehavior, playMode }: Props) => {
    const selected = global.app?.editor?.selected;
    const selectedObject = Array.isArray(selected) ? selected[0] : selected;

    // Determine the correct revision ID for this behavior. Note that if this
    // behavior is inside a stem but not the scene, we need to use the stem's
    // asset resolution context instead of the scene's.
    const { context: sceneContext } = useAssetResolutionContext();
    const revisionId = useMemo(() => {
        if (isLegacyBehaviorId(selectedBehavior.id)) {
            return undefined;
        }

        const target = Array.isArray(selected) ? selected[0] : selected;
        const targetContext = target ? getAssetResolutionContext(target, true) : null;
        return resolveAssetRevisionId(selectedBehavior.id, targetContext || sceneContext);
    }, [selectedBehavior.id, selected, sceneContext]);

    const { config: behaviorConfig } = useBehaviorData(selectedBehavior.id, {
        revisionId,
    });
    const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
    const isTriggerBehavior = selectedBehavior.id === "trigger";
    const [isDocPanelOpen, setIsDocPanelOpen] = useState(false);
    const [docPanelPosition, setDocPanelPosition] = useState({ top: 0, left: 0 });
    const infoButtonRef = useRef<HTMLImageElement>(null);
    const docPanelRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(
        [docPanelRef, infoButtonRef] as unknown as RefObject<HTMLElement>[],
        () => setIsDocPanelOpen(false),
    );

    const handleToggleDocPanel = useCallback(() => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDocPanelPosition({
                top: rect.top,
                left: rect.left - 248, // 240px width + 8px gap
            });
        }
        setIsDocPanelOpen(prev => !prev);
    }, []);

    useEffect(() => {
        const behaviorUIManager = global.app?.editor?.behaviorUIManager;
        if (!behaviorConfig || !behaviorUIManager) {
            return;
        }
        
        const handleOpenBehaviorUI = async () => {
            const selected = global.app?.editor?.selected;
            const selectedObject = Array.isArray(selected) ? selected[0] : selected;
            if (!selectedObject) {
                console.error("Missing selected");
                return;
            }

            const behaviorContextProvider = global.app?.editor?.behaviorContextProvider;
            if (!behaviorContextProvider) {
                console.error("Missing behaviorContextProvider");
                return;
            }
            
            const behaviorContext = await behaviorContextProvider.getBehaviorContext(
                selectedObject,
                (global.app!).editor!.scene,
                (global.app!).editor!.sceneID,
                (global.app!).editor!.assetSource ?? null,
            );

            behaviorUIManager.showBehaviorUI(behaviorConfig, selectedBehavior, behaviorContext).catch(console.error);
        };

        handleOpenBehaviorUI().catch(console.error);

        return () => {
            behaviorUIManager.hideBehaviorUI();
        };
    }, [behaviorConfig, selectedBehavior]);

    const handleDelete = (e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
        e.preventDefault();
        e.stopPropagation();

        const selected = global.app?.editor?.selected;
        if (!selected || selected instanceof Array) {
            return;
        }
        
        if (global.app?.editor?.removeBehaviorFromObject(selected, selectedBehavior.uuid)) {
            global.app?.game?.removeBehaviorByUUID(selectedBehavior.uuid);
            setSelectedBehavior(null);
        }
    };

    const handleEditBehavior = useCallback(() => {
        if (playMode || !selectedBehavior) return;

        // Keep the editor mounted at EditorComponent level; fork-on-edit can
        // swap the behavior id while the details panel is open.
        global.app?.editor?.component?.openCodeEditor({kind: "behavior", id: selectedBehavior.id});
    }, [playMode, selectedBehavior]);

    const behaviorDataManager = global.app?.editor?.behaviorDataManager;
    const canDeleteBehavior = Boolean(
        selectedObject &&
        behaviorDataManager?.canRemoveBehaviorFromObject(selectedObject, selectedBehavior.uuid),
    );

    const isEditable = resolveAssetRevisionId(selectedBehavior.id, sceneContext) !== undefined;

    return (
        <>
            <BehaviorDetailsWrapper ref={wrapperRef}
                className="hidden-scroll"
            >
                <Container $playMode={playMode}>
                    <Header $playMode={playMode}>
                        <img
                            src={goBackIcon}
                            alt="go back"
                            className="icon"
                            onClick={() => setSelectedBehavior(null)}
                        />
                        <span>{behaviorConfig?.name || ""}</span>

                        <IconWrapper $playMode={playMode}>
                            {behaviorConfig?.documentation &&
                                <img
                                    ref={infoButtonRef}
                                    src={infoIcon}
                                    className="icon"
                                    onClick={handleToggleDocPanel}
                                    alt="info"
                                />
                            }
                            {canDeleteBehavior &&
                                <img
                                    src={deleteIcon}
                                    className="delete-icon"
                                    onClick={handleDelete}
                                />
                            }
                        </IconWrapper>
                    </Header>
                    {isTriggerBehavior && !playMode &&
                        <DiagramButton
                            onClick={() => setIsFlowModalOpen(true)}
                            title="View trigger flow diagram"
                        >
                            <svg width="14"
                                height="14"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <rect x="1"
                                    y="1"
                                    width="5"
                                    height="3"
                                    rx="1"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                />
                                <rect x="10"
                                    y="1"
                                    width="5"
                                    height="3"
                                    rx="1"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                />
                                <rect x="1"
                                    y="12"
                                    width="5"
                                    height="3"
                                    rx="1"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                />
                                <rect x="10"
                                    y="12"
                                    width="5"
                                    height="3"
                                    rx="1"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                />
                                <path d="M3.5 4V7.5H8M12.5 4V7.5H8M8 7.5V8.5M3.5 12V8.5H8M12.5 12V8.5H8"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                />
                            </svg>
                            <span>View Flow Diagram</span>
                        </DiagramButton>
                    }
                    <div
                        className="behaviorsContainer"
                        id={BEHAVIOR_UI_CONTAINER_ID}
                    >
                        {/* Automaticly render UI widgets in BehaviorUIManager */}
                    </div>

                    {/* General behavior settings */}
                    {!playMode && 
                        <BehaviorGeneralPanel
                            behaviorId={selectedBehavior.id}
                            behaviorUuid={selectedBehavior.uuid}
                        />
                    }

                    {/* Behavior throttling settings */}
                    {!playMode && 
                        <BehaviorThrottlingPanel
                            behaviorId={selectedBehavior.id}
                            behaviorUuid={selectedBehavior.uuid}
                        />
                    }

                    {isEditable && !playMode && 
                        <StyledButton
                            isBlue
                            width="100%"
                            onClick={handleEditBehavior}
                        >
                            Edit Behavior
                        </StyledButton>
                    }
                </Container>
            </BehaviorDetailsWrapper>
            {isFlowModalOpen && isTriggerBehavior &&
                <TriggerFlowModal
                    behaviorAttributes={selectedBehavior.attributesData || {}}
                    onClose={() => setIsFlowModalOpen(false)}
                />
            }
            {isDocPanelOpen && behaviorConfig?.documentation &&
                createPortal(
                    <BehaviorDocumentationPanel
                        ref={docPanelRef}
                        documentation={behaviorConfig.documentation}
                        behaviorName={behaviorConfig.name}
                        author={behaviorConfig.author}
                        onClose={() => setIsDocPanelOpen(false)}
                        style={{
                            position: "fixed",
                            top: docPanelPosition.top,
                            left: docPanelPosition.left,
                        }}
                    />,
                    document.body,
                )
            }
        </>
    );
};

const DiagramButton = styled.button`
    background: none;
    border: 1px solid var(--theme-container-divider, #333);
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 6px;
    color: var(--theme-font-unselected-color);
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    transition: all 0.2s ease;
    margin: 0 8px 4px;

    &:hover {
        color: var(--theme-font-selected-color);
        background: var(--theme-container-secondary-dark);
    }
`;

const BehaviorDetailsWrapper = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 11px;
    box-sizing: border-box;
    padding: 0;
`;
