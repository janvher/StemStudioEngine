/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {useEffect, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import styled from "styled-components";
import {toast} from "toastywave";

import arrowRight from "./icons/arrow-right.svg";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {
    getAssetResolutionContext,
    resolveAssetRevisionId,
} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {flexCenter, regularFont} from "../../../../../../../assets/style";
import BehaviorData from "../../../../../../../behaviors/BehaviorData";
import {isLegacyBehaviorId} from "../../../../../../../behaviors/util";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import AttributeUtil from "../../../../../../../editor/behaviors/AttributeUtil";
import {useBehaviorData} from "../../../../../../../editor/behaviors/hooks/behaviors";
import global from "@stem/editor-oss/global";
import i18n from "@stem/editor-oss/i18n/config";
import {ItemMenuText, RightClickMenu} from "../../../../../../../ui/common/RightClickMenu/RightClickMenu";
import {isTemplateScene} from "@stem/editor-oss/utils/isTemplateScene";
import {PanelCheckbox} from "../../../common/PanelCheckbox";
import {BehaviorDocumentationPanel} from "../BehaviorDocumentationPanel/BehaviorDocumentationPanel";
import infoIcon from "../icons/info.svg";
import deleteIcon from "./icons/delete.svg";

enum MENU_OPTION_TYPE {
    COPY_ONE = "copyOne",
    COPY_ALL = "copyAll",
    PASTE = "paste",
    DELETE = "delete",
}

const MENU_OPTIONS = [
    {type: MENU_OPTION_TYPE.COPY_ONE, text: "Copy Behavior"},
    {type: MENU_OPTION_TYPE.COPY_ALL, text: "Copy All Behaviors"},
    {type: MENU_OPTION_TYPE.PASTE, text: "Paste Behavior"},
    {type: MENU_OPTION_TYPE.DELETE, text: "Delete"},
];

const MENU_OPTION_TOOLTIPS: Record<MENU_OPTION_TYPE, string> = {
    [MENU_OPTION_TYPE.COPY_ONE]: "Copy this behavior with current settings",
    [MENU_OPTION_TYPE.COPY_ALL]: "Copy all behaviors from the selected object",
    [MENU_OPTION_TYPE.PASTE]: "Paste behavior data from clipboard",
    [MENU_OPTION_TYPE.DELETE]: "Delete this behavior from the selected object",
};

interface Props {
    onRemoveBehaviorById: (type: string) => void;
    setSelectedBehavior: (behavior: BehaviorData) => void;
    copyAllBehaviors?: () => void;
    pasteBehavior?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    behaviorData: BehaviorData;
    allBehaviors: BehaviorData[];
    playMode?: boolean;
}

export const SingleBehavior = ({
    onRemoveBehaviorById,
    behaviorData: behaviorData,
    setSelectedBehavior,
    copyAllBehaviors,
    pasteBehavior,
    allBehaviors,
    playMode,
}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const behaviorDataManager = editor?.behaviorDataManager;
    const selected = editor?.selected;
    const ref = useRef<HTMLDivElement>(null);
    const [singleBehaviorMenuOpen, setSingleBehaviorMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{x: number; y: number} | null>(null);
    const [isDocPanelOpen, setIsDocPanelOpen] = useState(false);
    const [docPanelPosition, setDocPanelPosition] = useState({top: 0, left: 0});
    const docPanelRef = useRef<HTMLDivElement>(null);
    const infoButtonRef = useRef<HTMLButtonElement>(null);

    // Determine the correct revision ID for this behavior. Note that if this
    // behavior is inside a stem but not the scene, we need to use the stem's
    // asset resolution context instead of the scene's.
    const {context: sceneContext} = useAssetResolutionContext();
    const revisionId = useMemo(() => {
        if (isLegacyBehaviorId(behaviorData.id)) {
            return undefined;
        }

        const target = Array.isArray(selected) ? selected[0] : selected;
        const targetContext = target ? getAssetResolutionContext(target, true) : null;
        return resolveAssetRevisionId(behaviorData.id, targetContext || sceneContext);
    }, [behaviorData.id, selected, sceneContext]);

    const {config: behaviorConfig, isLoading} = useBehaviorData(behaviorData.id, {
        revisionId,
    });
    const fallbackConfig = useMemo(
        () => global.app?.editor?.behaviorConfigRegistry.getConfig(behaviorData.id) || null,
        [behaviorData.id],
    );
    const resolvedConfig = behaviorConfig || fallbackConfig;
    const hasValidConfig = !isLoading && Boolean(resolvedConfig);

    const handleRemoveBehaviorType = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation();
        e.preventDefault();
        onRemoveBehaviorById?.(behaviorData.uuid);
    };

    const handleSelectBehavior = () => {
        if (!hasValidConfig) return;
        setSelectedBehavior?.(behaviorData);
    };

    const handleRightClick = (event: any) => {
        setSingleBehaviorMenuOpen(true);
        const x = event.clientX;
        const y = event.clientY;
        setMenuPosition({x, y});
    };

    const closeMenu = () => {
        setSingleBehaviorMenuOpen(false);
        setMenuPosition(null);
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

    const copyBehavior = () => {
        const behaviorString = JSON.stringify(behaviorData);
        navigator.clipboard
            .writeText(behaviorString)
            .then(() => toast.success(i18n.t("Behavior copied!")))
            .catch(err => console.error("Failed to copy: ", err));
    };

    const handleMenuClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, type: MENU_OPTION_TYPE) => {
        e.stopPropagation();
        e.preventDefault();
        setSingleBehaviorMenuOpen(false);
        switch (type) {
            case MENU_OPTION_TYPE.COPY_ONE:
                copyBehavior();
                break;

            case MENU_OPTION_TYPE.COPY_ALL:
                copyAllBehaviors?.();
                break;

            case MENU_OPTION_TYPE.PASTE:
                pasteBehavior?.(e);
                break;

            case MENU_OPTION_TYPE.DELETE:
                handleRemoveBehaviorType(e);
                break;

            default:
                break;
        }
    };

    const handleEnabled = () => {
        if (!hasValidConfig) return;
        if (selected && behaviorData && !Array.isArray(selected)) {
            if (!resolvedConfig?.allowMultiple) {
                allBehaviors.forEach(el => {
                    if (!behaviorData.enabled && el.id === behaviorData.id && el.uuid !== behaviorData.uuid) {
                        el.enabled = false;
                    }
                });
            }
            behaviorData.enabled = !behaviorData.enabled;

            if (!behaviorData.enabled) {
                app?.game?.removeBehaviorByUUID(behaviorData.uuid);
                app?.editor?.removeBehaviorPlugin(behaviorData.uuid);
            } else {
                const options = {
                    uuid: behaviorData.uuid,
                    attributes: behaviorData.attributesData,
                    throttleConfig: behaviorData.throttleConfig,
                };
                void app?.game?.addBehaviorToObject(selected, behaviorData.id, options);
                app?.editor?.addBehaviorPlugin(selected, behaviorData);
            }
            app.call(`objectChanged`, editor, selected);
        }
    };

    const handleToggleDocPanel = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
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
    const nameAttribute = AttributeUtil.getNestedProperty(behaviorData.attributesData, "customName");
    const customName = nameAttribute
        ? (AttributeUtil.getAttributeValue(nameAttribute, resolvedConfig?.name || "") as string)
        : undefined;
    const behaviorName = isLoading ? "" : customName || resolvedConfig?.name || behaviorData.id;

    const isTemplate = isTemplateScene(editor?.sceneID);

    const filteredMenuOptions = (() => {
        let options = hasValidConfig
            ? MENU_OPTIONS
            : MENU_OPTIONS.filter(option => option.type === MENU_OPTION_TYPE.DELETE);
        if (isTemplate) {
            options = options.filter(
                option => option.type !== MENU_OPTION_TYPE.DELETE && option.type !== MENU_OPTION_TYPE.PASTE,
            );
        }
        return options;
    })();

    if (playMode) {
        if (!behaviorData.enabled || !hasValidConfig) return null;
        return (
            <StyledBehaviorPlayMode
                onClick={handleSelectBehavior}
                ref={ref}
                onContextMenu={handleRightClick}
                id="behavior"
            >
                {behaviorName}
                {resolvedConfig?.isScript && resolvedConfig.id !== behaviorData.id && (
                    <span className="details">{`(${behaviorData.id})`}</span>
                )}
                <IconsWrapper onClick={e => e.stopPropagation()}>
                    <img
                        src={arrowRight}
                        alt={i18n.t("open behavior")}
                    />
                </IconsWrapper>
            </StyledBehaviorPlayMode>
        );
    }

    const selectedObject = Array.isArray(selected) ? selected[0] : selected;
    const canToggleBehavior =
        !isTemplate &&
        Boolean(selectedObject && behaviorDataManager?.canToggleBehaviorOnObject(selectedObject, behaviorData.uuid));
    const canRemoveBehavior =
        !isTemplate &&
        Boolean(selectedObject && behaviorDataManager?.canRemoveBehaviorFromObject(selectedObject, behaviorData.uuid));

    return (
        <>
            <BehaviorItem
                onClick={handleSelectBehavior}
                ref={ref}
                onContextMenu={handleRightClick}
                id="behavior"
                $hasValidConfig={hasValidConfig}
                title={hasValidConfig ? i18n.t("Click to edit. Right-click for more actions") : i18n.t("Behavior config is missing")}
            >
                <BehaviorName
                    $behaviorDisabled={!behaviorData.enabled}
                    $hasValidConfig={hasValidConfig}
                >
                    {behaviorName}
                    {resolvedConfig?.isScript && resolvedConfig.id !== behaviorData.id && (
                        <span className="details">{`(${behaviorData.id})`}</span>
                    )}
                    {!isLoading && !hasValidConfig && <span className="invalid-text">{i18n.t(" [Behavior missing]")}</span>}
                </BehaviorName>

                <IconsWrapper onClick={e => e.stopPropagation()}>
                    {canRemoveBehavior && (
                        <DeleteIconButton
                            onClick={handleRemoveBehaviorType}
                            title={i18n.t("Click to remove this behavior")}
                            $alwaysVisible={!hasValidConfig}
                        >
                            <img
                                src={deleteIcon}
                                alt={i18n.t("remove behavior")}
                            />
                        </DeleteIconButton>
                    )}
                    {hasValidConfig && resolvedConfig?.documentation && (
                        <DocsIconButton
                            ref={infoButtonRef}
                            onClick={handleToggleDocPanel}
                            title={i18n.t("Click to open behavior documentation")}
                        >
                            <img
                                src={infoIcon}
                                alt={i18n.t("behavior documentation")}
                            />
                        </DocsIconButton>
                    )}
                    {hasValidConfig && (
                        <PanelCheckbox
                            checked={!!behaviorData.enabled}
                            onChange={handleEnabled}
                            disabled={!canToggleBehavior}
                            v2
                        />
                    )}
                </IconsWrapper>
                {singleBehaviorMenuOpen && menuPosition && (
                    <RightClickMenu
                        onClickoutsideCallback={closeMenu}
                        left={menuPosition.x}
                        top={menuPosition.y}
                    >
                        {filteredMenuOptions.map(({type, text}, index) => (
                            <ItemMenuText
                                key={type + index}
                                onClick={e => handleMenuClick(e, type)}
                                $red={type === MENU_OPTION_TYPE.DELETE}
                                title={i18n.t(MENU_OPTION_TOOLTIPS[type])}
                            >
                                {i18n.t(text)}
                            </ItemMenuText>
                        ))}
                    </RightClickMenu>
                )}
            </BehaviorItem>
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

export const BehaviorItem = styled.div<{$hasValidConfig?: boolean}>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    height: 32px;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: #fff;
    background: transparent;
    box-sizing: border-box;
    cursor: ${({$hasValidConfig}) => ($hasValidConfig !== false ? "pointer" : "default")};
    position: relative;
    transition: all 0.3s ease-in-out;
    border-radius: 8px;
    pointer-events: all;
    &:hover {
        background: ${({$hasValidConfig}) => ($hasValidConfig !== false ? "#262626" : "transparent")};
        color: #fff;
        .panelCheckboxWrapper {
            display: ${({$hasValidConfig}) => ($hasValidConfig !== false ? "inline-block" : "none")};
        }
    }

    .details {
        color: var(--theme-font-unselected-color);
    }

    .invalid-text {
        color: var(--theme-font-red);
    }
`;

export const BehaviorName = styled.span<{$behaviorDisabled: boolean; $hasValidConfig?: boolean}>`
    color: ${({$behaviorDisabled, $hasValidConfig}) =>
        !$hasValidConfig
            ? "var(--theme-font-disabled)"
            : $behaviorDisabled
              ? "var(--theme-font-disabled)"
              : "var(--theme-font-selected-color)"};

    ${({$behaviorDisabled}) =>
        $behaviorDisabled &&
        `
    .details {
        color: var(--theme-font-disabled);
    }
    `}
`;

const IconsWrapper = styled.div`
    ${flexCenter};
    gap: 8px;
    .panelCheckboxWrapper {
        display: none;
        pointer-events: all;
    }
`;

const DocsIconButton = styled.button`
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    ${flexCenter};

    img {
        width: 12px;
        height: 12px;
        opacity: 0.7;
    }

    &:hover img {
        opacity: 1;
    }
`;

const DeleteIconButton = styled.button<{$alwaysVisible?: boolean}>`
    background: transparent;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    ${flexCenter};
    opacity: ${({$alwaysVisible}) => ($alwaysVisible ? 1 : 0)};
    pointer-events: ${({$alwaysVisible}) => ($alwaysVisible ? "all" : "none")};
    transition: opacity 0.2s ease;

    img {
        width: 12px;
        height: 12px;
        opacity: 0.7;
    }

    &:hover img {
        opacity: 1;
    }

    ${BehaviorItem}:hover & {
        opacity: 1;
        pointer-events: all;
    }
`;

export const StyledBehaviorPlayMode = styled.div`
    width: 100%;
    height: 40px;
    border-bottom: 1px solid #fafafa33;
    padding: 8px;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    ${flexCenter};
    justify-content: space-between;
    flex-wrap: nowrap;
    column-gap: 4px;
    cursor: pointer;
    transition: 0.3s ease;

    &:hover {
        background: var(--theme-container-milky);
    }
`;
