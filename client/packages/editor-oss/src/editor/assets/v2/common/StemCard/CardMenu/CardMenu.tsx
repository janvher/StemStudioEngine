import React, {useCallback, useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useOnClickOutside} from "usehooks-ts";

import {MenuButton, OptionsContainerPortal, StyledOption} from "./CardMenu.style";
import {DomainAssetDto} from "@stem/network/api/client/api";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {useRemoveAssetsAndInstancesFromScene} from "../../../../../asset-management/hooks/scene";
import {useAddPrefabToScene} from "../../../../../prefabs/hooks/prefabs";
import {ASSET_STATUS} from "../../../AssetsLibrary/services";
import {useCanEditAsset} from "../../hooks/useCanEditAsset";
import {InfoCard} from "../../InfoCard/InfoCard";
import meniIcon from "../icons/menu-icon.svg";

interface IMenuOption {
    label: string;
    action: () => void;
    disabled?: boolean;
    hidden?: boolean;
}
interface Props {
    status: ASSET_STATUS;
    stem: DomainAssetDto;
    thumbnail: string;
    isDefaultThumbnail: boolean;
}

export const CardMenu = ({status, stem, thumbnail, isDefaultThumbnail}: Props) => {
    const app = global.app as EngineRuntime;
    const {isAdmin, isSceneOwner, isCollaborator} = useCanEditAsset({assetOwnerId: stem.userId});
    const removeAssetsAndInstancesFromScene = useRemoveAssetsAndInstancesFromScene();
    const {dbUser} = useAuthorizationContext();
    const addPrefabToScene = useAddPrefabToScene();

    const [open, setOpen] = useState(false);
    const [isInfoPopupVisible, setIsInfoPopupVisible] = useState(false);
    const [isInfoPopupVersionPicker, setIsInfoPopupVersionPicker] = useState(false);
    const [menuPosition, setMenuPosition] = useState({top: 0, left: 0});
    const menuRef = React.useRef<HTMLDivElement>(null);
    const optionsRef = React.useRef<HTMLDivElement>(null);

    useOnClickOutside(optionsRef as React.RefObject<HTMLElement>, () => {
        if (open) {
            setOpen(false);
        }
    });

    useEffect(() => {
        if (open && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + 4,
                left: rect.right - 114, // 114px is the menu width
            });
        }
    }, [open]);

    // Close menu on scroll
    useEffect(() => {
        if (!open) return;

        const handleScroll = () => setOpen(false);
        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, [open]);

    const handleRemoveFromScene = useCallback(() => {
        removeAssetsAndInstancesFromScene([stem.id]).catch(error => {
            console.error(error);
            showToast({type: "error", title: "Failed to remove stem from scene."});
        });
    }, [removeAssetsAndInstancesFromScene, stem.id]);

    const copyStem = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(stem));
            showToast({type: "success", title: "Stem copied!"});
        } catch (err) {
            console.error("[Card Menu] Failed to copy object:", err);
            showToast({type: "error", title: "Failed to copy stem."});
        }
    };

    const getMenuOptions: () => IMenuOption[] = () => {
        const canEditScene = isAdmin || isSceneOwner || isCollaborator;
        const assetEditPermission = status === ASSET_STATUS.PRIVATE || status === ASSET_STATUS.PUBLISHED_AUTHOR;

        return [
            {label: "Add to Project", action: () => addPrefabToScene(stem.id)},
            {label: "Copy", action: copyStem, hidden: status === ASSET_STATUS.UNPUBLISHED},
            {
                label: "Edit",
                action: () => app.editor?.component?.openStemEditor(stem.id),
                hidden: !assetEditPermission,
            },
            {label: "Remix", action: () => console.log("Remix"), disabled: true, hidden: !canEditScene},
            {
                label: "Select Version",
                action: () => {
                    setIsInfoPopupVisible(true);
                    setIsInfoPopupVersionPicker(true);
                },
                hidden: !canEditScene,
            },
            {
                label: "Info",
                action: () => {
                    setIsInfoPopupVisible(true);
                    setIsInfoPopupVersionPicker(false);
                },
            },
            {
                label: "Publish",
                action: () => app.editor?.component?.openStemPublishPanel(stem),
                hidden: stem.userId !== dbUser?.id,
            },
            {label: "Delete", action: handleRemoveFromScene, hidden: !canEditScene},
        ];
    };

    return (
        <>
            <MenuButton
                ref={menuRef}
                className="reset-css"
                onClick={() => setOpen(prev => !prev)}
                $active={open}
            >
                <img
                    className="dots"
                    src={meniIcon}
                    alt=""
                />
            </MenuButton>
            {open &&
                createPortal(
                    <OptionsContainerPortal
                        ref={optionsRef}
                        style={{top: menuPosition.top, left: menuPosition.left}}
                    >
                        {getMenuOptions().map(({label, action, hidden, disabled}) => {
                            if (hidden) return;
                            return (
                                <StyledOption
                                    key={label}
                                    className="reset-css"
                                    onClick={action}
                                    disabled={disabled}
                                >
                                    {label}
                                </StyledOption>
                            );
                        })}
                    </OptionsContainerPortal>,
                    document.body,
                )}
            {isInfoPopupVisible &&
                createPortal(
                    <InfoCard
                        isVersionPicker={isInfoPopupVersionPicker}
                        isCardVisible={isInfoPopupVisible}
                        close={() => setIsInfoPopupVisible(false)}
                        item={stem}
                        thumbnail={thumbnail}
                        isDefaultThumbnail={isDefaultThumbnail}
                        style={{height: "auto"}}
                    />,
                    document.body,
                )}
        </>
    );
};
