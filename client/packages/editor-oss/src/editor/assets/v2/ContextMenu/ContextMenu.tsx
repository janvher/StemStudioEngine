import React, {useEffect, useMemo, useRef, useState} from "react";
import * as THREE from "three";
import {useOnClickOutside} from "usehooks-ts";

import {AssetsListMenu} from "./AssetsListMenu/AssetsListMenu";
import {CommandsPrompt} from "./CommandsPrompt/CommandsPrompt";
import {Menu, MenuItem} from "./ContextMenu.styles";
import {MenuItemConfig, MenuLevel} from "./ContextMenu.types";
import {ContextMenuWrapper} from "./ContextMenuWrapper/ContextMenuWrapper";
import {Create} from "./Create/Create";
import {EditMenu} from "./EditMenu/EditMenu";
import aiIcon from "./icons/v2/ai.svg";
import copyIcon from "./icons/v2/copy.svg";
import gizmoIcon from "./icons/v2/gizmo.svg";
import pasteIcon from "./icons/v2/paste.svg";
import plusIcon from "./icons/v2/plus.svg";
import {Create as SimpleCreate} from "./SimpleCreate/Create";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import i18n from "@stem/editor-oss/i18n/config";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    position: {x: number; y: number};
};

export enum MENU_LABELS {
    AI = "AI",
    GIZMO = "Gizmo",
    COPY = "Copy",
    CREATE = "Create",
    PASTE = "Paste",
    DELETE = "Delete",
    SETTINGS = "Settings",
    MAKE_CHANGE = "Make Change",
    ADD_INTERACTION = "Add Interaction",
}

const MENU_TOOLTIPS: Partial<Record<MENU_LABELS, string>> = {
    [MENU_LABELS.CREATE]: "Open create tools to add new objects",
    [MENU_LABELS.ADD_INTERACTION]: "Open AI Copilot to add interaction logic",
    [MENU_LABELS.COPY]: "Copy the selected object to clipboard",
    [MENU_LABELS.PASTE]: "Paste the copied object from clipboard",
    [MENU_LABELS.GIZMO]: "Open transform controls (currently unavailable)",
};

const checkClipboardHasNoContent = async (): Promise<boolean> => {
    try {
        const text = await navigator.clipboard.readText();
        return text.trim().length === 0;
    } catch (error) {
        return true;
    }
};

export const ContextMenu = ({isOpen, onClose, position}: Props) => {
    const app = global.app as EngineRuntime;

    const getMenuConfig = (selected: THREE.Object3D | null): MenuItemConfig[] => {
        return [
            {
                label: MENU_LABELS.CREATE,
                condition: !!selected,
                icon: plusIcon,
                onClick: () => {
                    setIsAssetSelectionOpen(true);
                },
            },
            {
                label: MENU_LABELS.ADD_INTERACTION,
                icon: aiIcon,
                condition: !!selected,
                onClick: () => {
                    setIsAiPromptOpen(true);
                    setSelectedObject(selected);
                },
            },
            /*{
                label: "Replace Object",
                condition: !!selected,
                onClick: () => {
                    setReplaceObject(true);
                    setSelectedObject(selected);
                    setIsCreationOpen(true);
                },
            },
            {
                label: MENU_LABELS.MAKE_CHANGE,
                condition: !selected,
                onClick: () => {
                    setIsAiPromptOpen(true);
                    setSelectedObject(selected);
                },
            },*/
            {
                label: MENU_LABELS.GIZMO,
                condition: !!selected,
                icon: gizmoIcon,
                onClick: () => {},
                disabled: true,
            },
            {
                label: MENU_LABELS.COPY,
                condition: !!selected,
                icon: copyIcon,
                onClick: () => app.editor?.copy(),
            },
            {
                label: MENU_LABELS.CREATE,
                condition: !selected,
                onClick: () => {
                    setIsAssetSelectionOpen(true);
                },
            },
            {
                label: MENU_LABELS.PASTE,
                icon: pasteIcon,
                onClick: () => app.editor?.paste(),
                condition: !selected,
            },
        ];
    };

    const [replaceObject, setReplaceObject] = useState(false);
    const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
    const [isAssetSelectionOpen, setIsAssetSelectionOpen] = useState(false);
    const [isCreationOpen, setIsCreationOpen] = useState(false);
    const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
    const [selected, setSelected] = useState<THREE.Object3D | null>(null);
    const [mainMenuPosition, setMainMenuPosition] = useState(position);
    const [isAILoading, setIsAILoading] = useState(false);
    const [clipboardEmpty, setClipboardEmpty] = useState(true);

    const initialMenu: MenuLevel | undefined = useMemo(() => {
        return {items: getMenuConfig(selected)};
    }, [selected, app]);
    const [menuStack, setMenuStack] = useState([initialMenu]);
    const [isHidden, setIsHidden] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(menuRef as React.RefObject<HTMLElement>, event => {
        if (!isOpen) return;
        if (event instanceof MouseEvent && event.button === 2) return;

        if (isCreationOpen || isAiPromptOpen || isAILoading) return;

        if (
            (event.target as HTMLElement)?.getAttribute("id")?.includes("headlessui-combobox-options") ||
            (event.target as HTMLElement)?.parentElement?.getAttribute("id")?.includes("headlessui-combobox-options")
        )
            return;

        handleClose();
    });

    useEffect(() => {
        const checkClipboard = async () => {
            const isEmpty = await checkClipboardHasNoContent();
            setClipboardEmpty(isEmpty);
        };
        isOpen && checkClipboard();
    }, [isOpen]);

    const handleItemClick = (item: MenuItemConfig) => {
        if (item.submenu) {
            setMenuStack(prev => [...prev, {items: item.submenu!, header: item.label}]);
        } else if (item.onClick) {
            item.onClick();
        }
    };

    const handleClose = () => {
        setMenuStack([initialMenu]);
        setIsHidden(true);
        setTimeout(() => {
            setIsHidden(false);
            resetState();
            onClose();
        }, 0); // Timeout to allow react state update
    };

    const resetState = () => {
        setIsAssetSelectionOpen(false);
        setIsCreationOpen(false);
        setIsAiPromptOpen(false);
        setReplaceObject(false);
        setSelectedObject(null);
        setSelected(null);
    };

    const handleSelectObject = () => {
        if (app.editor?.selected && !(app.editor.selected instanceof Array)) {
            setSelected(app.editor.selected);
        } else {
            setSelected(null);
        }
    };

    useEffect(() => {
        setMainMenuPosition(position);
    }, [position]);

    useEffect(() => {
        setMenuStack([initialMenu]);
    }, [initialMenu]);

    useEffect(() => {
        app.on("objectSelected.ContextMenu", handleSelectObject);
        return () => {
            app.on("objectSelected.ContextMenu", null);
        };
    }, []);

    const currentMenu = menuStack[menuStack.length - 1]?.items.filter(item =>
        typeof item.condition === "boolean" ? item.condition : true,
    );
    const isMainMenuOpened = !isCreationOpen && !isAiPromptOpen;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div ref={menuRef}
            style={{visibility: isHidden ? "hidden" : "visible"}}
        >
            <ContextMenuWrapper
                position={position}
                isOpen={isOpen && isMainMenuOpened && !selected}
                setMainMenuPosition={setMainMenuPosition}
            >
                <Menu>
                    {currentMenu?.map((item, index) => 
                        <MenuItem
                            key={index}
                            onClick={() => handleItemClick(item)}
                            disabled={item.label === MENU_LABELS.PASTE && clipboardEmpty}
                            title={
                                item.label === MENU_LABELS.PASTE && clipboardEmpty
                                    ? i18n.t("Clipboard is empty")
                                    : i18n.t(MENU_TOOLTIPS[item.label as MENU_LABELS] || item.label)
                            }
                        >
                            {i18n.t(item.label)}
                            {item.label === MENU_LABELS.CREATE && <img src={plusIcon}
                                alt=""
                                className="plusIcon"
                                                                  />}
                        </MenuItem>,
                    )}
                </Menu>
            </ContextMenuWrapper>
            {!!selected && 
                <ContextMenuWrapper
                    customWidth="auto"
                    noPadding
                    position={position}
                    isOpen={!!selected && isOpen}
                    setMainMenuPosition={setMainMenuPosition}
                >
                    <EditMenu items={currentMenu || []}
                        position={position}
                    />
                </ContextMenuWrapper>
            }

            {isAssetSelectionOpen && 
                <ContextMenuWrapper
                    isCreateStep
                    position={mainMenuPosition}
                    isOpen={isAssetSelectionOpen && !isAILoading}
                >
                    <AssetsListMenu
                        oldVersion
                        close={() => setIsAssetSelectionOpen(false)}
                        openAIBuilder={() => {
                            setIsCreationOpen(true);
                            setIsAssetSelectionOpen(false);
                        }}
                    />
                </ContextMenuWrapper>
            }

            {isCreationOpen && 
                <ContextMenuWrapper
                    isCreateStep
                    isAIBox
                    position={mainMenuPosition}
                    isOpen={isCreationOpen && !isAILoading}
                    close={() => setIsCreationOpen(false)}
                    header={i18n.t("Generate with AI")}
                >
                    {app.isPlaying ? 
                        <SimpleCreate
                            setIsOpen={setIsCreationOpen}
                            isOpen={isCreationOpen}
                            onMenuClose={handleClose}
                            position={position}
                            objectToReplace={selectedObject}
                            replaceObject={replaceObject}
                            setIsAILoading={setIsAILoading}
                            inPlayerView
                        />
                     : 
                        <Create
                            setIsOpen={setIsCreationOpen}
                            isOpen={isCreationOpen}
                            onMenuClose={handleClose}
                            position={position}
                            objectToReplace={selectedObject}
                            replaceObject={replaceObject}
                        />
                    }
                </ContextMenuWrapper>
            }

            {isAiPromptOpen && 
                <ContextMenuWrapper
                    position={mainMenuPosition}
                    isOpen={isAiPromptOpen}
                    header={i18n.t("AI Copilot (Old Version)")}
                    close={() => setIsAiPromptOpen(false)}
                    isCreateStep
                >
                    <CommandsPrompt
                        setIsOpen={setIsAiPromptOpen}
                        isOpen={isAiPromptOpen}
                        onMenuClose={handleClose}
                        selectedObject={selectedObject}
                    />
                </ContextMenuWrapper>
            }
        </div>
    );
};
