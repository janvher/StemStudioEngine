import {Dispatch, SetStateAction} from "react";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import Editor from "../../../../../../editor/Editor";
import global from "@stem/editor-oss/global";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {PanelSectionTitleSecondary} from "../../RightPanel.style";

export interface EmailPasswordAuthSettings {
    enabled: boolean;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
}

interface Props {
    emailPasswordAuth: EmailPasswordAuthSettings;
    setEmailPasswordAuth: Dispatch<SetStateAction<EmailPasswordAuthSettings>>;
}

export const EmailPasswordAuth = ({emailPasswordAuth, setEmailPasswordAuth}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor as Editor;

    const handleEnabledChange = () => {
        const newEnabled = !emailPasswordAuth.enabled;
        const newSettings = {
            ...emailPasswordAuth,
            enabled: newEnabled,
        };
        setEmailPasswordAuth(newSettings);

        // Update scene userData
        if (!editor.scene.userData.emailPasswordAuth) {
            editor.scene.userData.emailPasswordAuth = {};
        }
        editor.scene.userData.emailPasswordAuth.enabled = newEnabled;
        editor.scene.userData.emailPasswordAuth.allowRegistration = newSettings.allowRegistration;
        editor.scene.userData.emailPasswordAuth.requireEmailVerification = newSettings.requireEmailVerification;

        app.call("objectChanged", editor, editor.scene);
    };

    const handleAllowRegistrationChange = () => {
        const newAllowRegistration = !emailPasswordAuth.allowRegistration;
        const newSettings = {
            ...emailPasswordAuth,
            allowRegistration: newAllowRegistration,
        };
        setEmailPasswordAuth(newSettings);

        // Update scene userData
        if (!editor.scene.userData.emailPasswordAuth) {
            editor.scene.userData.emailPasswordAuth = {};
        }
        editor.scene.userData.emailPasswordAuth.allowRegistration = newAllowRegistration;

        app.call("objectChanged", editor, editor.scene);
    };

    const handleRequireEmailVerificationChange = () => {
        const newRequireEmailVerification = !emailPasswordAuth.requireEmailVerification;
        const newSettings = {
            ...emailPasswordAuth,
            requireEmailVerification: newRequireEmailVerification,
        };
        setEmailPasswordAuth(newSettings);

        // Update scene userData
        if (!editor.scene.userData.emailPasswordAuth) {
            editor.scene.userData.emailPasswordAuth = {};
        }
        editor.scene.userData.emailPasswordAuth.requireEmailVerification = newRequireEmailVerification;

        app.call("objectChanged", editor, editor.scene);
    };

    return (
        <>
            <PanelCheckbox
                v2
                text="Enable Email/Password Authentication"
                checked={emailPasswordAuth.enabled}
                isGray
                regular
                onChange={handleEnabledChange}
            />

            {emailPasswordAuth.enabled && 
                <>
                    <div
                        style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "4px",
                            marginBottom: "12px",
                            padding: "8px",
                            backgroundColor: "#f9f9f9",
                            borderRadius: "4px",
                            border: "1px solid #e0e0e0",
                        }}
                    >
                        ℹ️ Players will be able to create accounts and sign in using their email address and password.
                        This provides a platform-independent authentication method.
                    </div>

                    <div style={{marginLeft: "16px"}}>
                        <PanelCheckbox
                            v2
                            text="Allow New User Registration"
                            checked={emailPasswordAuth.allowRegistration}
                            isGray
                            regular
                            onChange={handleAllowRegistrationChange}
                        />

                        <div
                            style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "4px",
                                marginBottom: "8px",
                                marginLeft: "24px",
                            }}
                        >
                            When enabled, new players can create accounts. When disabled, only existing users can sign
                            in.
                        </div>

                        <PanelCheckbox
                            v2
                            text="Require Email Verification"
                            checked={emailPasswordAuth.requireEmailVerification}
                            isGray
                            regular
                            onChange={handleRequireEmailVerificationChange}
                            disabled={!emailPasswordAuth.allowRegistration}
                        />

                        <div
                            style={{
                                fontSize: "12px",
                                color: emailPasswordAuth.allowRegistration ? "#666" : "#999",
                                marginTop: "4px",
                                marginLeft: "24px",
                            }}
                        >
                            {emailPasswordAuth.allowRegistration
                                ? "When enabled, users must verify their email address before they can sign in."
                                : "Email verification requires user registration to be enabled."}
                        </div>
                    </div>

                    <div
                        style={{
                            fontSize: "12px",
                            color: "#888",
                            marginTop: "12px",
                            padding: "8px",
                            backgroundColor: "#fff9e6",
                            borderRadius: "4px",
                            border: "1px solid #ffe066",
                        }}
                    >
                        <strong>Account Linking:</strong> Players who start as guests can later upgrade their accounts
                        to email/password authentication, preserving their progress and data.
                    </div>

                    <div
                        style={{
                            fontSize: "12px",
                            color: "#888",
                            marginTop: "8px",
                            padding: "8px",
                            backgroundColor: "#f0f8ff",
                            borderRadius: "4px",
                            border: "1px solid #b8daff",
                        }}
                    >
                        <strong>Cross-Platform:</strong> Email/password authentication works across all platforms and
                        provides a consistent experience for users.
                    </div>
                </>
            }
        </>
    );
};
