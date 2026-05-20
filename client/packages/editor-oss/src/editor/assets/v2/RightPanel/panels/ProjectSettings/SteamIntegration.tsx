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

export interface SteamIntegrationSettings {
    enabled: boolean;
    appId: string;
}

interface Props {
    steamIntegration: SteamIntegrationSettings;
    setSteamIntegration: Dispatch<SetStateAction<SteamIntegrationSettings>>;
}

export const SteamIntegration = ({steamIntegration, setSteamIntegration}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor as Editor;
    const authManager = app.authManager;
    const container = document.getElementById("container");
    const platformInfo = PlatformDetector.getPlatformInfo();

    const [keysConfigured, setKeysConfigured] = useState(false);
    const [isCheckingKeys, setIsCheckingKeys] = useState(false);
    const [showKeysModal, setShowKeysModal] = useState(false);

    // Steam integration should be configurable in editor (browser) but only active during gameplay in Electron
    const isElectron = platformInfo.type === PlatformType.ELECTRON;

    useEffect(() => {
        const checkKeys = async () => {
            if (!editor.sceneID) return;

            setIsCheckingKeys(true);
            try {
                const configured = await authManager.steamCheckKeys(editor.sceneID);
                setKeysConfigured(configured);
            } catch (error) {
                console.error("Error checking Steam keys:", error);
                setKeysConfigured(false);
            } finally {
                setIsCheckingKeys(false);
            }
        };

        void checkKeys();
    }, [authManager, editor.sceneID]);

    const handleEnabledChange = async () => {
        const newEnabled = !steamIntegration.enabled;

        if (newEnabled && !keysConfigured) {
            setShowKeysModal(true);
        } else if (!newEnabled && keysConfigured) {
            // When disabling Steam integration, delete the keys
            try {
                if (editor.sceneID) {
                    await authManager.steamDeleteKeys(editor.sceneID);
                }
                setKeysConfigured(false);
                const newSettings = {
                    ...steamIntegration,
                    enabled: false,
                    appId: "",
                };
                setSteamIntegration(newSettings);

                // Update scene userData
                if (!editor.scene.userData.steamIntegration) {
                    editor.scene.userData.steamIntegration = {};
                }
                editor.scene.userData.steamIntegration.enabled = false;
                editor.scene.userData.steamIntegration.appId = "";
                app.call("objectChanged", editor, editor.scene);
            } catch (error) {
                console.error("Error deleting Steam keys:", error);
                showToast({
                    type: "error",
                    body: "Failed to disable Steam integration. Please try again.",
                });
            }
        } else {
            const newSettings = {
                ...steamIntegration,
                enabled: newEnabled,
            };
            setSteamIntegration(newSettings);

            // Update scene userData
            if (!editor.scene.userData.steamIntegration) {
                editor.scene.userData.steamIntegration = {};
            }
            editor.scene.userData.steamIntegration.enabled = newEnabled;
            editor.scene.userData.steamIntegration.appId = newSettings.appId;
            app.call("objectChanged", editor, editor.scene);
        }
    };

    const handleAppIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newAppId = event.target.value;
        const newSettings = {...steamIntegration, appId: newAppId};
        setSteamIntegration(newSettings);

        // Update scene userData
        if (!editor.scene.userData.steamIntegration) {
            editor.scene.userData.steamIntegration = {};
        }
        editor.scene.userData.steamIntegration.appId = newAppId;
        app.call("objectChanged", editor, editor.scene);
    };

    const handleKeysModalClose = (keysSaved: boolean) => {
        setShowKeysModal(false);

        if (keysSaved) {
            setKeysConfigured(true);
            const newSettings = {...steamIntegration, enabled: true};
            setSteamIntegration(newSettings);

            // Update scene userData
            if (!editor.scene.userData.steamIntegration) {
                editor.scene.userData.steamIntegration = {};
            }
            editor.scene.userData.steamIntegration.enabled = true;
        } else if (!keysConfigured) {
            // If keys weren't saved and weren't configured before, disable integration
            const newSettings = {...steamIntegration, enabled: false};
            setSteamIntegration(newSettings);

            if (!editor.scene.userData.steamIntegration) {
                editor.scene.userData.steamIntegration = {};
            }
            editor.scene.userData.steamIntegration.enabled = false;
        }
        app.call("objectChanged", editor, editor.scene);
    };

    const handleConfigureKeys = () => {
        setShowKeysModal(true);
    };

    return (
        <>
            <TooltipRowWrapper style={{height: "24px"}}>
                <PanelSectionTitleSecondary>Enable Steam Integration</PanelSectionTitleSecondary>
                <Wrapper>
                    {!isElectron && 
                        <Tooltip
                            text="💡 Steam integration will be active when the game runs in the desktop version (Electron)"
                            width="175px"
                        />
                    }
                    <PanelCheckbox
                        v2
                        text=""
                        checked={steamIntegration.enabled}
                        isGray
                        regular
                        onChange={handleEnabledChange}
                        disabled={isCheckingKeys}
                    />
                </Wrapper>
            </TooltipRowWrapper>
            {steamIntegration.enabled && 
                <FormRow>
                    <PanelSectionTitle>Steam App ID</PanelSectionTitle>
                    <TextInput
                        value={steamIntegration.appId}
                        onChange={handleAppIdChange}
                        placeholder="Enter Steam App ID (e.g., 480)"
                    />
                </FormRow>
            }

            {keysConfigured &&
                <StyledButton onClick={handleConfigureKeys}
                    isBlue
                >
                    Configure Steam Keys
                </StyledButton>
            }

            {showKeysModal && container && editor.sceneID && 
                <>
                    {createPortal(
                        <SteamKeysModal sceneId={editor.sceneID}
                            onClose={handleKeysModalClose}
                        />,
                        container,
                    )}
                </>
            }
        </>
    );
};

const SteamKeysModal = ({sceneId, onClose}: {sceneId: string; onClose: (saved: boolean) => void}) => {
    const app = global.app as EngineRuntime;
    const authManager = app.authManager;
    const [steamAppId, setSteamAppId] = useState("");
    const [steamApiKey, setSteamApiKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Try to load existing app ID
        const loadAppId = async () => {
            try {
                const appId = await authManager.steamGetAppID(sceneId);
                if (appId) {
                    setSteamAppId(appId);
                }
            } catch {
                // App ID not configured yet, that's fine
            }
        };
        loadAppId();
    }, [authManager, sceneId]);

    const handleSave = async () => {
        if (!steamAppId.trim()) {
            setError("Steam App ID is required");
            return;
        }
        if (!steamApiKey.trim()) {
            setError("Steam API Key is required");
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            await authManager.steamSaveKeys(sceneId, steamAppId.trim(), steamApiKey.trim());
            showToast({
                type: "success",
                title: "Steam keys saved successfully",
                body: "Your Steam integration is now configured.",
            });
            onClose(true);
        } catch (error: any) {
            console.error("Error saving Steam keys:", error);
            setError(error?.message || "Failed to save Steam keys. Please try again.");
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
                    <ModalTitle>Configure Steam Integration</ModalTitle>
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
                        <Label>Steam App ID</Label>
                        <TextInput
                            value={steamAppId}
                            setValue={setSteamAppId}
                            placeholder="e.g., 480"
                            width="100%"
                            height="36px"
                            disabled={isSaving}
                        />
                        <HelpText>Your Steam application ID from your Steamworks partner site</HelpText>
                    </Property>
                    <Property>
                        <Label>Steam Web API Key</Label>
                        <TextInput
                            value={steamApiKey}
                            setValue={setSteamApiKey}
                            placeholder="Enter your Steam Web API Key"
                            width="100%"
                            height="36px"
                            type="password"
                            disabled={isSaving}
                        />
                        <HelpText>
                            Get your key from:{" "}
                            <a href="https://steamcommunity.com/dev/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                steamcommunity.com/dev/apikey
                            </a>
                        </HelpText>
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
                            disabled={!steamAppId.trim() || !steamApiKey.trim() || isSaving}
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </SaveButton>
                    </ButtonsWrapper>
                </ModalBody>
            </ModalContent>
        </ModalOverlay>
    );
};
