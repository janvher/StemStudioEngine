/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import styled from "styled-components";

import {BehaviorDocumentationPanel} from "./BehaviorDocumentationPanel/BehaviorDocumentationPanel";
import {BehaviorGeneralPanel} from "./BehaviorGeneralPanel";
import {BehaviorThrottlingPanel} from "./BehaviorThrottlingPanel";
import deleteIcon from "./icons/delete.svg";
import infoIcon from "./icons/info.svg";
import {TriggerFlowModal} from "./TriggerFlowModal";
import {
    getAssetResolutionContext,
    resolveAssetRevisionId,
} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import BehaviorData from "../../../../../../behaviors/BehaviorData";
import {isLegacyBehaviorId} from "../../../../../../behaviors/util";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {useBehaviorData} from "../../../../../../editor/behaviors/hooks/behaviors";
import global from "@stem/editor-oss/global";
import {BEHAVIOR_UI_CONTAINER_ID} from "@stem/editor-oss/types/editor";
import AttributeUtil from "../../../../../behaviors/AttributeUtil";
import {StyledButton} from "../../../common/StyledButton";
import goBackIcon from "../../icons/go-back.svg";
import {ActionButtons, Container, Header, IconWrapper} from "../../styles/Behaviors.style";
import {TriggerDiagramIcon} from "./SelectedBehaviorsList/icons/TriggerDiagramIcon";

interface Props {
    selectedBehavior: BehaviorData;
    setSelectedBehavior: React.Dispatch<any>;
    playMode?: boolean;
}

export const BehaviorInEditorConfigurationView = ({selectedBehavior, setSelectedBehavior, playMode}: Props) => {
    const selected = global.app?.editor?.selected;
    const selectedObject = Array.isArray(selected) ? selected[0] : selected;

    // Determine the correct revision ID for this behavior. Note that if this
    // behavior is inside a stem but not the scene, we need to use the stem's
    // asset resolution context instead of the scene's.
    const {context: sceneContext} = useAssetResolutionContext();
    const revisionId = useMemo(() => {
        if (isLegacyBehaviorId(selectedBehavior.id)) {
            return undefined;
        }

        const target = Array.isArray(selected) ? selected[0] : selected;
        const targetContext = target ? getAssetResolutionContext(target, true) : null;
        const targetRevisionId = targetContext ? resolveAssetRevisionId(selectedBehavior.id, targetContext) : undefined;
        return targetRevisionId ?? resolveAssetRevisionId(selectedBehavior.id, sceneContext);
    }, [selectedBehavior.id, selected, sceneContext]);

    const {config: behaviorConfig, code: behaviorScript} = useBehaviorData(selectedBehavior.id, {
        revisionId,
    });
    const fallbackConfig = useMemo(
        () => global.app?.editor?.behaviorConfigRegistry.getConfig(selectedBehavior.id) || null,
        [selectedBehavior.id],
    );
    const fallbackScript = useMemo(
        () => global.app?.editor?.behaviorScriptRegistry.getScript(selectedBehavior.id) || null,
        [selectedBehavior.id],
    );
    const resolvedBehaviorConfig = behaviorConfig || fallbackConfig;
    const resolvedBehaviorScript = behaviorScript || fallbackScript;
    const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
    const isTriggerBehavior = selectedBehavior.id === "trigger";

    const infoButtonRef = useRef<HTMLImageElement>(null);
    const docPanelRef = useRef<HTMLDivElement>(null);
    const [isDocPanelOpen, setIsDocPanelOpen] = useState(false);
    const [docPanelPosition, setDocPanelPosition] = useState({top: 0, left: 0});
    const resolvedConfig = behaviorConfig || fallbackConfig;

    const handleToggleDocPanel = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!resolvedConfig?.documentation) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setDocPanelPosition({
            top: rect.top,
            left: rect.left - 248,
        });
        setIsDocPanelOpen(prev => !prev);
    };

    useEffect(() => {
        if (!isDocPanelOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedPanel = !!docPanelRef.current && docPanelRef.current.contains(target);
            const clickedButton = !!infoButtonRef.current && infoButtonRef.current.contains(target);

            if (!clickedPanel && !clickedButton) {
                setIsDocPanelOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDocPanelOpen]);

    useEffect(() => {
        const behaviorUIManager = global.app?.editor?.behaviorUIManager;
        if (!resolvedBehaviorConfig || !behaviorUIManager) {
            return;
        }

        let cancelled = false;

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

            // Use async getBehaviorContext to fetch resources directly from API
            const behaviorContext = await behaviorContextProvider.getBehaviorContext(
                selectedObject,
                global.app!.editor!.scene,
                global.app!.editor!.sceneID,
                global.app!.editor!.assetSource ?? null,
            );

            if (cancelled) return;

            behaviorUIManager
                .showBehaviorUI(resolvedBehaviorConfig, selectedBehavior, behaviorContext)
                .catch(console.error);
        };

        void handleOpenBehaviorUI();

        return () => {
            cancelled = true;
            behaviorUIManager.hideBehaviorUI();
        };
    }, [resolvedBehaviorConfig, selectedBehavior]);

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
        if (playMode || !resolvedBehaviorConfig || !resolvedBehaviorScript) return;

        global.app?.editor?.component?.openCodeEditor({kind: "behavior", id: selectedBehavior.id});
    }, [playMode, resolvedBehaviorConfig, resolvedBehaviorScript, selectedBehavior.id]);

    const behaviorDataManager = global.app?.editor?.behaviorDataManager;
    const canDeleteBehavior = Boolean(
        selectedObject && behaviorDataManager?.canRemoveBehaviorFromObject(selectedObject, selectedBehavior.uuid),
    );

    const isEditable = resolveAssetRevisionId(selectedBehavior.id, sceneContext) !== undefined;
    const nameAttribute = AttributeUtil.getNestedProperty(selectedBehavior.attributesData, "customName");
    const customName = nameAttribute
        ? (AttributeUtil.getAttributeValue(nameAttribute, resolvedBehaviorConfig?.name || "") as string)
        : undefined;
    const showActionButton = isEditable && !playMode;
    return (
        <>
            <BehaviorDetailsWrapper
                className="hidden-scroll"
                $reserveSpace={showActionButton}
            >
                <Container $playMode={playMode}>
                    <Header $playMode={playMode}>
                        <img
                            src={goBackIcon}
                            alt="go back"
                            className="icon"
                            onClick={() => setSelectedBehavior(null)}
                        />
                        <span>{customName ?? resolvedBehaviorConfig?.name}</span>

                        <IconWrapper $playMode={playMode}>
                            {resolvedConfig?.documentation && (
                                <img
                                    ref={infoButtonRef}
                                    src={infoIcon}
                                    className="icon"
                                    onClick={handleToggleDocPanel}
                                    alt="info"
                                />
                            )}
                            {canDeleteBehavior && (
                                <img
                                    src={deleteIcon}
                                    className="delete-icon"
                                    onClick={handleDelete}
                                />
                            )}
                        </IconWrapper>
                    </Header>
                    {isTriggerBehavior && !playMode && (
                        <DiagramButton
                            onClick={() => setIsFlowModalOpen(true)}
                            title="View trigger flow diagram"
                        >
                            <TriggerDiagramIcon />
                            <span>View Flow Diagram</span>
                        </DiagramButton>
                    )}
                    <div
                        className="behaviorsContainer"
                        id={BEHAVIOR_UI_CONTAINER_ID}
                    >
                        {/* Automaticly render UI widgets in BehaviorUIManager */}
                    </div>

                    {/* General behavior settings */}
                    {!playMode && (
                        <BehaviorGeneralPanel
                            behaviorId={selectedBehavior.id}
                            behaviorUuid={selectedBehavior.uuid}
                        />
                    )}

                    {/* Behavior throttling settings */}
                    {!playMode && (
                        <BehaviorThrottlingPanel
                            behaviorId={selectedBehavior.id}
                            behaviorUuid={selectedBehavior.uuid}
                        />
                    )}
                </Container>
                {showActionButton && (
                    <ActionButtons>
                        {isEditable && (
                            <StyledButton
                                isBlue
                                width="100%"
                                onClick={handleEditBehavior}
                            >
                                Edit Behavior
                            </StyledButton>
                        )}
                    </ActionButtons>
                )}
            </BehaviorDetailsWrapper>
            {isFlowModalOpen && isTriggerBehavior && (
                <TriggerFlowModal
                    behaviorAttributes={selectedBehavior.attributesData || {}}
                    onClose={() => setIsFlowModalOpen(false)}
                />
            )}
            {isDocPanelOpen &&
                resolvedConfig?.documentation &&
                createPortal(
                    <BehaviorDocumentationPanel
                        ref={docPanelRef}
                        documentation={resolvedConfig.documentation}
                        behaviorName={resolvedConfig.name}
                        author={resolvedConfig.author}
                        onClose={() => setIsDocPanelOpen(false)}
                        style={{
                            position: "fixed",
                            top: docPanelPosition.top,
                            left: docPanelPosition.left,
                        }}
                    />,
                    document.body,
                )}
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

const BehaviorDetailsWrapper = styled.div<{$reserveSpace: boolean}>`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 11px;
    box-sizing: border-box;
    padding: 0;
    ${({$reserveSpace}) =>
        $reserveSpace &&
        `
   height: calc(100% - 40px);
    `}
`;
