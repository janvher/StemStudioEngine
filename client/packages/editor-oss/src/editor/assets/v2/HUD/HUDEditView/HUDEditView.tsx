/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {useCallback, useEffect, useMemo, useRef} from "react";

import {GameHUD} from "./GameHUD/GameHUD";
import {GameStartMenu} from "./GameStartMenu/GameStartMenu";
import {HUDContainer, HUDContainerButtonsLayer, Menu} from "./HUDEditView.style";
import {HUDPopup} from "./HUDPopup/HUDPopup";
import {InGameMenu} from "./InGameMenu/InGameMenu";
import {MobileGameControlsHUD} from "./MobileGameControlsHUD/MobileGameControlsHUD";
import {HUD_TABS} from "./types";
import {AssetType} from "@stem/network/api/asset";
import {saveScene} from "@stem/network/api/scene";
import {UIKitHUDPreview} from "../../../../../behaviors/hud/uikit/editor/UIKitHUDPreview";
import {
    useAssetsTabContext,
    useHUDContext,
    useHUDGameContext,
    useHUDInGameMenuContext,
    useHUDStartGameMenuContext,
} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {useListEditorAssets} from "../../../../asset-management/hooks/assets";
import {FileData} from "../../types/file";

interface Props {
    onClose: () => void;
}

const menuButtonClass = "screen-selection-btn reset-css";

export const HUDEditView = ({onClose}: Props) => {
    const app = global.app;
    const isUIKitMode = app?.editor?.hudRenderer === "uikit";
    const behaviorUIManager = app?.editor?.behaviorUIManager;

    const {gameLayout, setGameLayout} = useHUDGameContext();
    const {isPopupOpen, activeScreen, setActiveScreen, soundAssets, setSoundAssets, setSoundOptions} = useHUDContext();
    const {startGameMenuLayout, setStartGameMenuLayout} = useHUDStartGameMenuContext();
    const {inGameMenuLayout, setInGameMenuLayout} = useHUDInGameMenuContext();
    const {audioDataForSceneID: legacySoundData} = useAssetsTabContext();
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<UIKitHUDPreview | null>(null);
    const {data: soundsData} = useListEditorAssets({
        types: [AssetType.Audio],
    });

    const sounds = useMemo<any[]>(() => {
        return (
            soundsData?.assets.map(sound => ({
                ID: sound.id,
                Name: sound.name,
                Type: sound.type,
                UpdateTime: sound.updateTime,
                headRevisionId: sound.headRevisionId,
                UserID: sound.userId,
                CreateTime: sound.createTime,
                NewApi: true,
            })) || []
        );
    }, [soundsData]);

    useEffect(() => {
        const initialAssets: FileData[] = [...(legacySoundData || []), ...(sounds || [])];
        setSoundAssets(initialAssets);
    }, [legacySoundData, sounds]);

    useEffect(() => {
        if (soundAssets) {
            setSoundOptions([
                {key: "0", value: "none"},
                ...soundAssets.map((option: any, index: number) => {
                    return {
                        key: `${index + 1}`,
                        value: option.Name,
                    };
                }),
            ]);
        }
    }, [soundAssets]);
    // const handleBgImage = () => {
    //     if (activeScreen === HUD_TABS.GAME_START_MENU) {
    //         return startGameMenuLayout?.[START_MENU_IDS.MENU_BG] as string;
    //     } else if (activeScreen === HUD_TABS.IN_GAME_MENU) {
    //         return inGameMenuLayout?.[IN_GAME_MENU_IDS.MENU_BG] as string;
    //     } else return;
    // };

    // Initialize UIKit preview (only in uikit mode)
    useEffect(() => {
        if (!isUIKitMode) return;
        if (previewCanvasRef.current && !previewRef.current) {
            previewRef.current = new UIKitHUDPreview(previewCanvasRef.current);
        }
        return () => {
            previewRef.current?.dispose();
            previewRef.current = null;
        };
    }, [isUIKitMode]);

    // Update preview when screen or layout data changes (only in uikit mode)
    const updatePreview = useCallback(() => {
        if (!isUIKitMode || !previewRef.current || !activeScreen) return;
        previewRef.current.updateScreen(activeScreen, {
            startMenu: startGameMenuLayout ?? undefined,
            inGameMenu: inGameMenuLayout ?? undefined,
            gameHUD: gameLayout ?? undefined,
        });
    }, [isUIKitMode, activeScreen, startGameMenuLayout, inGameMenuLayout, gameLayout]);

    useEffect(() => {
        updatePreview();
    }, [updatePreview]);

    const handleSave = () => {
        if (!app || !app.editor) return;

        app.editor.scene.userData.gameUI = {
            ...app?.editor.scene.userData.gameUI,
            gameHUD: gameLayout || {},
        };

        if (inGameMenuLayout) {
            app.editor.scene.userData.gameUI = {
                ...app?.editor.scene.userData.gameUI,
                inGameMenu: inGameMenuLayout,
            };
        }
        if (startGameMenuLayout) {
            app.editor.scene.userData.gameUI = {
                ...app?.editor.scene.userData.gameUI,
                gameStartMenu: startGameMenuLayout,
            };
        }

        void saveScene();
        onClose();
    };

    const handleClose = async () => {
        await behaviorUIManager?.cancelUIChanges();
        setInGameMenuLayout({
            ...app?.editor?.scene.userData.gameUI?.inGameMenu,
        });
        setStartGameMenuLayout({
            ...app?.editor?.scene.userData.gameUI?.gameStartMenu,
        });
        setGameLayout({
            ...app?.editor?.scene.userData.gameUI?.gameHUD,
        });
        onClose();
    };

    return (
        <HUDContainer $isStartMenu={activeScreen === HUD_TABS.GAME_START_MENU}>
            <Menu>
                <div className="options">
                    {Object.values(HUD_TABS).map(tab => (
                        <button
                            key={tab}
                            className={`${menuButtonClass} ${activeScreen === tab && "btn-active"}`}
                            onClick={() => {
                                if (activeScreen === HUD_TABS.MOBILE_GAME_CONTROLS) {
                                    ElementsUtils.confirm({
                                        title: "Save changes?",
                                        content:
                                            "Do you want to save changes made to Mobile Game Controls before switching tabs?",
                                        okText: "Save",
                                        cancelText: "Discard",
                                        onOK: () => setActiveScreen(tab),
                                        onCancel: async () => {
                                            await behaviorUIManager?.cancelUIChanges();
                                            setActiveScreen(tab);
                                        },
                                    });
                                } else {
                                    setActiveScreen(tab);
                                }
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div>
                    <button
                        className="reset-css done-btn margin-btn"
                        onClick={handleSave}
                    >
                        Save
                    </button>
                    <button
                        className="reset-css done-btn"
                        onClick={handleClose}
                    >
                        Cancel
                    </button>
                </div>
            </Menu>
            <HUDContainerButtonsLayer>
                {isUIKitMode && (
                    <canvas
                        ref={previewCanvasRef}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: 0,
                        }}
                    />
                )}
                {activeScreen === HUD_TABS.GAME_START_MENU && <GameStartMenu />}
                {activeScreen === HUD_TABS.IN_GAME_MENU && <InGameMenu />}
                {activeScreen === HUD_TABS.GAME_HUD && <GameHUD />}
                {activeScreen === HUD_TABS.MOBILE_GAME_CONTROLS && <MobileGameControlsHUD />}
                {isPopupOpen && <HUDPopup />}
            </HUDContainerButtonsLayer>
        </HUDContainer>
    );
};
