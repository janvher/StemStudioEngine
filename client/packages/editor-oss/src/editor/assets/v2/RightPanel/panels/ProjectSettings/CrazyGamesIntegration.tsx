import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {createPortal} from "react-dom";
import styled from "styled-components";

import {FormRow, TooltipRowWrapper, Wrapper} from "./ProjectSettings.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {flexCenter, regularFont} from "../../../../../../assets/style";
import Editor from "../../../../../../editor/Editor";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import PlatformDetector, {PlatformType} from "../../../../../../userManagement/utils/PlatformDetector";
import {Tooltip} from "../../../common";
import {StyledButton} from "../../../common/StyledButton";
import {TextInput} from "../../../common/TextInput";
import closeIcon from "../../../icons/close-panel.svg";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {PanelSectionTitle, PanelSectionTitleSecondary} from "../../RightPanel.style";

// Styled components matching Discord modal
const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #09090b99;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

const ModalContent = styled.div`
    background-color: var(--theme-dialog-bg);
    border-radius: var(--theme-dialog-border-radius);
    border: none;
    box-shadow: var(--theme-dialog-shadow);
    width: 500px;
    max-width: 90%;
    min-height: 300px;
`;

const ModalHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid var(--theme-container-divider);
    ${flexCenter};
    justify-content: space-between;
`;

const ModalTitle = styled.h3`
    ${regularFont("s")}
    font-weight: var(--theme-font-medium-plus);
    color: white;
    margin: 0;
`;

const HeaderCloseButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
        background: var(--theme-grey-bg);
    }

    img {
        width: 13px;
        height: auto;
    }
`;

const ModalBody = styled.div`
    padding: 20px;
    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 16px;
`;

const Property = styled.div`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
`;

const Label = styled.label`
    display: block;
    ${regularFont("s")};
    color: #a1a1aa;
    font-weight: var(--theme-font-medium-plus);
`;

const HelpText = styled.p`
    font-size: 11px;
    color: #5b6178;
    margin: 0;

    a {
        color: var(--theme-container-active-blue);
        text-decoration: none;
        &:hover {
            text-decoration: underline;
        }
    }
`;

const ErrorMessage = styled.div`
    width: 100%;
    padding: 8px 12px;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    ${regularFont("s")};
`;

const ButtonsWrapper = styled.div`
    ${flexCenter};
    column-gap: 12px;
    width: 100%;
    margin-top: 8px;
`;

const CloseButton = styled.button`
    ${flexCenter};
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    height: 36px;
    padding: 0 16px;
    background-color: transparent;
    color: #a1a1aa;
    border: 1px solid var(--theme-grey-bg);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background-color: var(--theme-grey-bg);
        color: white;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const SaveButton = styled.button`
    ${flexCenter};
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    height: 36px;
    padding: 0 16px;
    background-color: var(--theme-container-active-blue);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background-color: #2563eb;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

export interface CrazyGamesIntegrationSettings {
    enabled: boolean;
    gameId: string;
    features?: {
        leaderboards?: boolean;
        achievements?: boolean;
        socialFeatures?: boolean;
    };
}

interface Props {
    crazyGamesIntegration: CrazyGamesIntegrationSettings;
    setCrazyGamesIntegration: Dispatch<SetStateAction<CrazyGamesIntegrationSettings>>;
}

export const CrazyGamesIntegration = ({crazyGamesIntegration, setCrazyGamesIntegration}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor as Editor;
    const authManager = app.authManager;
    const container = document.getElementById("container");
    const platformInfo = PlatformDetector.getPlatformInfo();

    const [keysConfigured, setKeysConfigured] = useState(false);
    const [isCheckingKeys, setIsCheckingKeys] = useState(false);
    const [showKeysModal, setShowKeysModal] = useState(false);

    // CrazyGames integration should be configurable in editor but only active during gameplay in CrazyGames environment
    const isCrazyGames = platformInfo.type === PlatformType.CRAZYGAMES;

    useEffect(() => {
        const checkKeys = async () => {
            if (!editor.sceneID) return;

            setIsCheckingKeys(true);
            try {
                const configured = await authManager.crazyGamesCheckKeys(editor.sceneID);
                setKeysConfigured(configured);
            } catch (error) {
                console.error("Error checking CrazyGames keys:", error);
                setKeysConfigured(false);
            } finally {
                setIsCheckingKeys(false);
            }
        };

        void checkKeys();
    }, [authManager, editor.sceneID]);

    const handleEnabledChange = async () => {
        const newEnabled = !crazyGamesIntegration.enabled;

        if (newEnabled && !keysConfigured) {
            setShowKeysModal(true);
        } else if (!newEnabled && keysConfigured) {
            // When disabling CrazyGames integration, delete the keys
            try {
                if (editor.sceneID) {
                    await authManager.crazyGamesDeleteKeys(editor.sceneID);
                }
                setKeysConfigured(false);
                const newSettings = {
                    ...crazyGamesIntegration,
                    enabled: false,
                    gameId: "",
                    features: {},
                };
                setCrazyGamesIntegration(newSettings);

                // Update scene userData
                if (!editor.scene.userData.crazyGamesIntegration) {
                    editor.scene.userData.crazyGamesIntegration = {};
                }
                editor.scene.userData.crazyGamesIntegration.enabled = false;
                editor.scene.userData.crazyGamesIntegration.gameId = "";
                editor.scene.userData.crazyGamesIntegration.features = {};
                app.call("objectChanged", editor, editor.scene);
            } catch (error) {
                console.error("Error deleting CrazyGames keys:", error);
                showToast({
                    type: "error",
                    body: "Failed to disable CrazyGames integration. Please try again.",
                });
            }
        } else {
            const newSettings = {
                ...crazyGamesIntegration,
                enabled: newEnabled,
            };
            setCrazyGamesIntegration(newSettings);

            // Update scene userData
            if (!editor.scene.userData.crazyGamesIntegration) {
                editor.scene.userData.crazyGamesIntegration = {};
            }
            editor.scene.userData.crazyGamesIntegration.enabled = newEnabled;
            editor.scene.userData.crazyGamesIntegration.gameId = newSettings.gameId;
            editor.scene.userData.crazyGamesIntegration.features = newSettings.features;
            app.call("objectChanged", editor, editor.scene);
        }
    };

    const handleGameIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newGameId = event.target.value;
        const newSettings = {...crazyGamesIntegration, gameId: newGameId};
        setCrazyGamesIntegration(newSettings);

        // Update scene userData
        if (!editor.scene.userData.crazyGamesIntegration) {
            editor.scene.userData.crazyGamesIntegration = {};
        }
        editor.scene.userData.crazyGamesIntegration.gameId = newGameId;
        app.call("objectChanged", editor, editor.scene);
    };

    const handleFeatureChange = (
        feature: keyof NonNullable<CrazyGamesIntegrationSettings["features"]>,
        enabled: boolean,
    ) => {
        const newFeatures = {
            ...crazyGamesIntegration.features,
            [feature]: enabled,
        };
        const newSettings = {...crazyGamesIntegration, features: newFeatures};
        setCrazyGamesIntegration(newSettings);

        // Update scene userData
        if (!editor.scene.userData.crazyGamesIntegration) {
            editor.scene.userData.crazyGamesIntegration = {};
        }
        editor.scene.userData.crazyGamesIntegration.features = newFeatures;
        app.call("objectChanged", editor, editor.scene);
    };

    const handleKeysModalClose = (keysSaved: boolean) => {
        setShowKeysModal(false);

        if (keysSaved) {
            setKeysConfigured(true);
            const newSettings = {...crazyGamesIntegration, enabled: true};
            setCrazyGamesIntegration(newSettings);

            // Update scene userData
            if (!editor.scene.userData.crazyGamesIntegration) {
                editor.scene.userData.crazyGamesIntegration = {};
            }
            editor.scene.userData.crazyGamesIntegration.enabled = true;
        } else if (!keysConfigured) {
            // If keys weren't saved and weren't configured before, disable integration
            const newSettings = {...crazyGamesIntegration, enabled: false};
            setCrazyGamesIntegration(newSettings);

            if (!editor.scene.userData.crazyGamesIntegration) {
                editor.scene.userData.crazyGamesIntegration = {};
            }
            editor.scene.userData.crazyGamesIntegration.enabled = false;
        }
        app.call("objectChanged", editor, editor.scene);
    };

    const handleConfigureKeys = () => {
        setShowKeysModal(true);
    };

    return (
        <>
            <TooltipRowWrapper style={{height: "auto"}}>
                <PanelSectionTitleSecondary>Enable CrazyGames Integration</PanelSectionTitleSecondary>
                <Wrapper>
                    {!isCrazyGames && 
                        <Tooltip
                            text="💡 CrazyGames integration will be active when the game runs on the CrazyGames platform"
                            width="175px"
                        />
                    }
                    <PanelCheckbox
                        v2
                        text=""
                        checked={crazyGamesIntegration.enabled}
                        isGray
                        regular
                        onChange={handleEnabledChange}
                        disabled={isCheckingKeys}
                    />
                </Wrapper>
            </TooltipRowWrapper>

            {crazyGamesIntegration.enabled && 
                <>
                    <FormRow>
                        <PanelSectionTitle>Game ID</PanelSectionTitle>
                        <TextInput
                            value={crazyGamesIntegration.gameId}
                            onChange={handleGameIdChange}
                            placeholder="Enter CrazyGames Game ID"
                        />
                    </FormRow>

                    <div style={{marginTop: "16px"}}>
                        <PanelSectionTitle>Features</PanelSectionTitle>

                        <PanelCheckbox
                            v2
                            text="Enable Leaderboards"
                            checked={crazyGamesIntegration.features?.leaderboards || false}
                            isGray
                            regular
                            onChange={event => {
                                const checked = event.target.checked;
                                handleFeatureChange("leaderboards", checked);
                            }}
                        />

                        <PanelCheckbox
                            v2
                            text="Enable Achievements"
                            checked={crazyGamesIntegration.features?.achievements || false}
                            isGray
                            regular
                            onChange={event => {
                                const checked = event.target.checked;
                                handleFeatureChange("achievements", checked);
                            }}
                        />

                        <PanelCheckbox
                            v2
                            text="Enable Social Features"
                            checked={crazyGamesIntegration.features?.socialFeatures || false}
                            isGray
                            regular
                            onChange={event => {
                                const checked = event.target.checked;
                                handleFeatureChange("socialFeatures", checked);
                            }}
                        />
                    </div>
                </>
            }

            {keysConfigured &&
                <StyledButton onClick={handleConfigureKeys}
                    isBlue
                >
                    Configure CrazyGames Keys
                </StyledButton>
            }

            {showKeysModal && container && editor.sceneID && 
                <>
                    {createPortal(
                        <CrazyGamesKeysModal sceneId={editor.sceneID}
                            onClose={handleKeysModalClose}
                        />,
                        container,
                    )}
                </>
            }
        </>
    );
};

const CrazyGamesKeysModal = ({sceneId, onClose}: {sceneId: string; onClose: (saved: boolean) => void}) => {
    const app = global.app as EngineRuntime;
    const authManager = app.authManager;
    const [gameId, setGameId] = useState("");
    const [gameSecret, setGameSecret] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Try to load existing game ID
        const loadGameId = async () => {
            try {
                const id = await authManager.crazyGamesGetGameID(sceneId);
                if (id) {
                    setGameId(id);
                }
            } catch (error) {
                // Game ID not configured yet, that's fine
            }
        };
        loadGameId();
    }, [authManager, sceneId]);

    const handleSave = async () => {
        if (!gameId.trim()) {
            setError("Game ID is required");
            return;
        }
        if (!gameSecret.trim()) {
            setError("Game Secret is required");
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            await authManager.crazyGamesSaveKeys(gameId.trim(), gameSecret.trim(), sceneId);
            showToast({
                type: "success",
                title: "CrazyGames keys saved successfully",
                body: "Your CrazyGames integration is now configured.",
            });
            onClose(true);
        } catch (error: any) {
            console.error("Error saving CrazyGames keys:", error);
            setError(error.message || "Failed to save CrazyGames keys. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        onClose(false);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <ModalOverlay onClick={handleOverlayClick}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Configure CrazyGames Integration</ModalTitle>
                    <HeaderCloseButton onClick={handleClose}
                        className="reset-css"
                    >
                        <img src={closeIcon}
                            alt="close"
                        />
                    </HeaderCloseButton>
                </ModalHeader>
                <ModalBody>
                    <Property>
                        <Label>Game ID</Label>
                        <TextInput
                            value={gameId}
                            setValue={setGameId}
                            placeholder="e.g., my-awesome-game"
                            width="100%"
                            height="36px"
                            disabled={isSaving}
                        />
                        <HelpText>Your game ID from the CrazyGames Developer Portal</HelpText>
                    </Property>
                    <Property>
                        <Label>Game Secret</Label>
                        <TextInput
                            value={gameSecret}
                            setValue={setGameSecret}
                            placeholder="Enter your Game Secret"
                            width="100%"
                            height="36px"
                            type="password"
                            disabled={isSaving}
                        />
                        <HelpText>Your game secret from the CrazyGames Developer Portal</HelpText>
                    </Property>
                    {error && <ErrorMessage>{error}</ErrorMessage>}
                    <ButtonsWrapper>
                        <CloseButton onClick={handleClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </CloseButton>
                        <SaveButton
                            onClick={handleSave}
                            disabled={!gameId.trim() || !gameSecret.trim() || isSaving}
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </SaveButton>
                    </ButtonsWrapper>
                </ModalBody>
            </ModalContent>
        </ModalOverlay>
    );
};
