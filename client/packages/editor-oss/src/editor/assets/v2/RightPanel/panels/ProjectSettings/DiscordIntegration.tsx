import type {Types} from "@discord/embedded-app-sdk";
type OAuthScopes = Types.OAuthScopes;
import {Dispatch, SetStateAction, useState, useEffect} from "react";
import {createPortal} from "react-dom";

import {FormRow} from "./ProjectSettings.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import Editor from "../../../../../../editor/Editor";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {StyledButton} from "../../../common/StyledButton";
import {DiscordKeysModal} from "../../../DiscordKeysModal/DiscordKeysModal";
import {MultiselectWithCheckboxes} from "../../common/MultiselectWithCheckboxes";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {PanelSectionTitle} from "../../RightPanel.style";

export interface DiscordIntegrationSettings {
    enabled: boolean;
    scopes: OAuthScopes[];
    isRequiredToPlay: boolean;
}

interface Props {
    discordIntegration: DiscordIntegrationSettings;
    setDiscordIntegration: Dispatch<SetStateAction<DiscordIntegrationSettings>>;
}

type ScopeItem = {
    value: OAuthScopes;
    label: string;
};

// Available Discord OAuth scopes with descriptions
export const AVAILABLE_SCOPES: ScopeItem[] = [
    {value: "identify", label: "Identify"},
    {value: "email", label: "Email"},
    {value: "guilds", label: "Guilds"},
    {value: "guilds.join", label: "Guilds Join"},
    {value: "guilds.members.read", label: "Guilds Members Read"},
    {value: "gdm.join", label: "GDM Join"},
    {value: "rpc", label: "RPC"},
    {value: "rpc.notifications.read", label: "RPC Notifications Read"},
    {value: "rpc.voice.read", label: "RPC Voice Read"},
    {value: "rpc.voice.write", label: "RPC Voice Write"},
    {value: "rpc.activities.write", label: "RPC Activities Write"},
    {value: "bot", label: "Bot"},
    {value: "webhook.incoming", label: "Webhook Incoming"},
    {value: "messages.read", label: "Messages Read"},
    {value: "applications.builds.upload", label: "Applications Builds Upload"},
    {value: "applications.builds.read", label: "Applications Builds Read"},
    {value: "applications.commands", label: "Applications Commands"},
    {value: "applications.commands.update" as OAuthScopes, label: "Applications Commands Update"},
    {
        value: "applications.commands.permissions.update" as OAuthScopes,
        label: "Applications Commands Permissions Update",
    },
    {value: "applications.store.update", label: "Applications Store Update"},
    {value: "applications.entitlements", label: "Applications Entitlements"},
    {value: "activities.read", label: "Activities Read"},
    {value: "activities.write", label: "Activities Write"},
    {value: "relationships.read", label: "Relationships Read"},
    {value: "voice" as OAuthScopes, label: "Voice"},
    {value: "dm_channels.read", label: "DM Channels Read"},
    {value: "role_connections.write" as OAuthScopes, label: "Role Connections Write"},
];

export const DiscordIntegration = ({discordIntegration, setDiscordIntegration}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor as Editor;
    const authManager = app.authManager;
    const container = document.getElementById("container");

    const [showKeysModal, setShowKeysModal] = useState(false);
    const [keysConfigured, setKeysConfigured] = useState(false);
    const [isCheckingKeys, setIsCheckingKeys] = useState(false);

    useEffect(() => {
        const checkKeys = async () => {
            if (!editor.sceneID) return;

            setIsCheckingKeys(true);
            try {
                const configured = await authManager.discordCheckKeys(editor.sceneID);
                setKeysConfigured(configured);
            } catch (error) {
                console.error("Error checking Discord keys:", error);
                setKeysConfigured(false);
            } finally {
                setIsCheckingKeys(false);
            }
        };

        void checkKeys();
    }, [authManager, editor.sceneID]);

    const handleEnabledChange = async () => {
        const newEnabled = !discordIntegration.enabled;

        if (newEnabled && !keysConfigured) {
            setShowKeysModal(true);
        } else if (!newEnabled && keysConfigured) {
            // When disabling Discord integration, delete the keys
            try {
                if (editor.sceneID) {
                    await authManager.discordDeleteKeys(editor.sceneID);
                }
                setKeysConfigured(false);
                const newSettings = {
                    ...discordIntegration,
                    enabled: false,
                    isRequiredToPlay: false,
                    scopes: [],
                };
                setDiscordIntegration(newSettings);

                // Update scene userData
                if (!editor.scene.userData.discordIntegration) {
                    editor.scene.userData.discordIntegration = {};
                }
                editor.scene.userData.discordIntegration.enabled = false;
                editor.scene.userData.discordIntegration.isRequiredToPlay = false;
                editor.scene.userData.discordIntegration.scopes = [];
                app.call("objectChanged", editor, editor.scene);
            } catch (error) {
                console.error("Error deleting Discord keys:", error);
                showToast({
                    type: "error",
                    body: "Failed to disable Discord integration. Please try again.",
                });
            }
        } else {
            // When disabling Discord integration (no keys configured), also disable "Required to Play"
            const newSettings = {
                ...discordIntegration,
                enabled: newEnabled,
                isRequiredToPlay: newEnabled ? discordIntegration.isRequiredToPlay : false,
            };
            setDiscordIntegration(newSettings);

            // Update scene userData
            if (!editor.scene.userData.discordIntegration) {
                editor.scene.userData.discordIntegration = {};
            }
            editor.scene.userData.discordIntegration.enabled = newEnabled;
            editor.scene.userData.discordIntegration.isRequiredToPlay = newSettings.isRequiredToPlay;
            app.call("objectChanged", editor, editor.scene);
        }
    };

    const handleScopeChange = (scope: OAuthScopes) => {
        const isCurrentlyChecked = discordIntegration.scopes.includes(scope);
        const newScopes = isCurrentlyChecked
            ? discordIntegration.scopes.filter(s => s !== scope)
            : [...discordIntegration.scopes, scope];

        const newSettings = {...discordIntegration, scopes: newScopes};
        setDiscordIntegration(newSettings);

        // Update scene userData
        if (!editor.scene.userData.discordIntegration) {
            editor.scene.userData.discordIntegration = {};
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        editor.scene.userData.discordIntegration.scopes = newScopes;
        app.call("objectChanged", editor, editor.scene);
    };

    const handleRequiredToPlayChange = () => {
        const newRequired = !discordIntegration.isRequiredToPlay;
        const newSettings = {...discordIntegration, isRequiredToPlay: newRequired};
        setDiscordIntegration(newSettings);

        // Update scene userData
        if (!editor.scene.userData.discordIntegration) {
            editor.scene.userData.discordIntegration = {};
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        editor.scene.userData.discordIntegration.isRequiredToPlay = newRequired;
        app.call("objectChanged", editor, editor.scene);
    };

    const handleKeysModalClose = (keysSaved: boolean) => {
        setShowKeysModal(false);

        if (keysSaved) {
            setKeysConfigured(true);
            const newSettings = {...discordIntegration, enabled: true};
            setDiscordIntegration(newSettings);

            // Update scene userData
            if (!editor.scene.userData.discordIntegration) {
                editor.scene.userData.discordIntegration = {};
            }
            editor.scene.userData.discordIntegration.enabled = true;
        } else if (!keysConfigured) {
            // If keys weren't saved and weren't configured before, disable integration and "Required to Play"
            const newSettings = {...discordIntegration, enabled: false, isRequiredToPlay: false};
            setDiscordIntegration(newSettings);

            if (!editor.scene.userData.discordIntegration) {
                editor.scene.userData.discordIntegration = {};
            }
            editor.scene.userData.discordIntegration.enabled = false;
            editor.scene.userData.discordIntegration.isRequiredToPlay = false;
        }
        app.call("objectChanged", editor, editor.scene);
    };

    const handleConfigureKeys = () => {
        setShowKeysModal(true);
    };

    return (
        <>
            <PanelCheckbox
                v2
                text="Enable Discord Integration"
                checked={discordIntegration.enabled}
                isGray
                regular
                onChange={handleEnabledChange}
                disabled={isCheckingKeys}
            />

            <PanelCheckbox
                v2
                text="Required to Play"
                checked={discordIntegration.isRequiredToPlay}
                isGray
                regular
                onChange={handleRequiredToPlayChange}
                disabled={!discordIntegration.enabled}
            />

            {keysConfigured &&
                <StyledButton onClick={handleConfigureKeys}
                    isBlue
                >
                    Configure Discord Keys
                </StyledButton>
            }

            {discordIntegration.enabled && 
                <FormRow>
                    <PanelSectionTitle>OAuth Scopes</PanelSectionTitle>
                    <MultiselectWithCheckboxes
                        selectedItems={AVAILABLE_SCOPES.filter(s => discordIntegration.scopes.includes(s.value))}
                        onChange={item => handleScopeChange(item.value as OAuthScopes)}
                        data={AVAILABLE_SCOPES}
                        placeholder="Select required scopes"
                    />
                </FormRow>
            }

            {showKeysModal && container && editor.sceneID && 
                <>
                    {createPortal(
                        <DiscordKeysModal sceneId={editor.sceneID}
                            onClose={handleKeysModalClose}
                        />,
                        container,
                    )}
                </>
            }
        </>
    );
};
