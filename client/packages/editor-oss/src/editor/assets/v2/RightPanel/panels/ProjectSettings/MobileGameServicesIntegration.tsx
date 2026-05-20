import {Dispatch, SetStateAction, useState, useEffect} from "react";

import {FormRow, TooltipRowWrapper, Wrapper} from "./ProjectSettings.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import Editor from "../../../../../../editor/Editor";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import PlatformDetector, {GameServiceType} from "../../../../../../userManagement/utils/PlatformDetector";
import {Tooltip} from "../../../common";
import {TextInput} from "../../../common/TextInput";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {PanelSectionTitleSecondary} from "../../RightPanel.style";

export interface MobileGamesIntegrationSettings {
    enabled: boolean;
    leaderboards: string[];
    achievements: string[];
    cloudSave: boolean;
    gameCenterId: string;
    playGamesId: string;
}

interface Props {
    mobileGameServices: MobileGamesIntegrationSettings;
    setMobileGameServices: Dispatch<SetStateAction<MobileGamesIntegrationSettings>>;
}

interface PlatformInfo {
    available: boolean;
    serviceName: string;
    description: string;
    configHelp: string;
}

export const MobileGameServicesIntegration = ({mobileGameServices, setMobileGameServices}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor as Editor;

    const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
        available: false,
        serviceName: "None",
        description: "Not available",
        configHelp: "",
    });

    useEffect(() => {
        const detectPlatform = () => {
            const info = PlatformDetector.getPlatformInfo();
            const preferredService = info.preferredService;

            // In editor mode, always allow configuration regardless of platform
            let available = true;
            let serviceName = "Universal Configuration";
            let description = "Configure mobile game services for iOS and Android deployment";
            let configHelp = "Settings will be applied when the game runs on mobile devices";

            // Show platform-specific info when actually running on mobile
            if (preferredService === GameServiceType.GAME_CENTER) {
                serviceName = "Game Center";
                description = "Running on iOS - Game Center integration active";
                configHelp = "Configure leaderboards and achievements in App Store Connect";
            } else if (preferredService === GameServiceType.GOOGLE_PLAY) {
                serviceName = "Google Play Games";
                description = "Running on Android - Google Play Games integration active";
                configHelp = "Configure leaderboards and achievements in Google Play Console";
            }

            setPlatformInfo({available, serviceName, description, configHelp});
        };

        detectPlatform();
    }, []);

    const handleEnabledChange = () => {
        const newEnabled = !mobileGameServices.enabled;

        const newSettings = {...mobileGameServices, enabled: newEnabled};
        setMobileGameServices(newSettings);

        // Update scene userData
        if (!editor.scene.userData.mobileGameServices) {
            editor.scene.userData.mobileGameServices = {};
        }
        editor.scene.userData.mobileGameServices.enabled = newEnabled;

        if (newEnabled) {
            showToast({
                type: "success",
                title: "Mobile Game Services",
                body: "Mobile game services integration enabled!",
            });
        }
    };

    const handleGameCenterIdChange = (value: string) => {
        const newSettings = {...mobileGameServices, gameCenterId: value};
        setMobileGameServices(newSettings);

        // Update scene userData
        if (!editor.scene.userData.mobileGameServices) {
            editor.scene.userData.mobileGameServices = {};
        }
        editor.scene.userData.mobileGameServices.gameCenterId = value;
    };

    const handlePlayGamesIdChange = (value: string) => {
        const newSettings = {...mobileGameServices, playGamesId: value};
        setMobileGameServices(newSettings);

        // Update scene userData
        if (!editor.scene.userData.mobileGameServices) {
            editor.scene.userData.mobileGameServices = {};
        }
        editor.scene.userData.mobileGameServices.playGamesId = value;
    };

    return (
        <>
            <TooltipRowWrapper style={{height: "auto"}}>
                <PanelSectionTitleSecondary>Enable Mobile Game Services</PanelSectionTitleSecondary>
                <Wrapper>
                    <Tooltip
                        text="💡 CrazyGames integration will be active when the game runs on the CrazyGames platform"
                        width="175px"
                    />
                    {/* Enable/Disable Toggle */}
                    <PanelCheckbox
                        v2
                        text=""
                        checked={mobileGameServices.enabled}
                        isGray
                        regular
                        onChange={handleEnabledChange}
                    />
                </Wrapper>
            </TooltipRowWrapper>

            {mobileGameServices.enabled && 
                <>
                    {/* Temporarily hidden features: Cloud Save, Leaderboards, Achievements */}
                    {/* <PanelCheckbox
                        v2
                        text="Enable Cloud Save"
                        checked={mobileGameServices.cloudSave}
                        isGray
                        regular
                        onChange={handleCloudSaveChange}
                    /> */}

                    {/* Platform-specific Configuration */}
                    {platformInfo.serviceName === "Game Center" && 
                        <FormRow>
                            <PanelSectionTitleSecondary>Game Center Bundle ID</PanelSectionTitleSecondary>
                            <TextInput
                                value={mobileGameServices.gameCenterId}
                                setValue={handleGameCenterIdChange}
                                placeholder="com.yourcompany.yourgame"
                                height="24px"
                                width="100%"
                            />
                        </FormRow>
                    }

                    {platformInfo.serviceName === "Google Play Games" && 
                        <FormRow>
                            <PanelSectionTitleSecondary>Play Games App ID</PanelSectionTitleSecondary>
                            <TextInput
                                value={mobileGameServices.playGamesId}
                                setValue={handlePlayGamesIdChange}
                                placeholder="123456789012"
                                height="24px"
                                width="100%"
                            />
                        </FormRow>
                    }

                    {/* Temporarily hidden: Leaderboards Configuration */}
                    {/* <FormRow>
                        <PanelSectionTitle>Leaderboards</PanelSectionTitle>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                            <TextInput
                                value={newLeaderboard}
                                setValue={setNewLeaderboard}
                                placeholder="Leaderboard ID (e.g., main_leaderboard)"
                                height="24px"
                                width="100%"
                            />
                            <StyledButton
                                onClick={handleAddLeaderboard}
                                isBlue
                                style={{ fontSize: "12px", padding: "4px 12px" }}
                            >
                                Add
                            </StyledButton>
                        </div>
                        {mobileGameServices.leaderboards.length > 0 && (
                            <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                                {mobileGameServices.leaderboards.map((leaderboard, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "4px 8px",
                                            backgroundColor: "#f5f5f5",
                                            borderRadius: "4px",
                                            marginBottom: "4px",
                                            fontSize: "12px"
                                        }}
                                    >
                                        <span>{leaderboard}</span>
                                        <button
                                            onClick={() => handleRemoveLeaderboard(index)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#e74c3c",
                                                cursor: "pointer",
                                                fontSize: "12px"
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormRow> */}

                    {/* Temporarily hidden: Achievements Configuration */}
                    {/* <FormRow>
                        <PanelSectionTitle>Achievements</PanelSectionTitle>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                            <TextInput
                                value={newAchievement}
                                setValue={setNewAchievement}
                                placeholder="Achievement ID (e.g., first_win)"
                                height="24px"
                                width="100%"
                            />
                            <StyledButton
                                onClick={handleAddAchievement}
                                isBlue
                                style={{ fontSize: "12px", padding: "4px 12px" }}
                            >
                                Add
                            </StyledButton>
                        </div>
                        {mobileGameServices.achievements.length > 0 && (
                            <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                                {mobileGameServices.achievements.map((achievement, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "4px 8px",
                                            backgroundColor: "#f5f5f5",
                                            borderRadius: "4px",
                                            marginBottom: "4px",
                                            fontSize: "12px"
                                        }}
                                    >
                                        <span>{achievement}</span>
                                        <button
                                            onClick={() => handleRemoveAchievement(index)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#e74c3c",
                                                cursor: "pointer",
                                                fontSize: "12px"
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormRow> */}
                </>
            }
        </>
    );
};
