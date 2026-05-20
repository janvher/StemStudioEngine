import {useState, useCallback} from "react";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {CrazyGamesIntegrationSettings} from "../CrazyGamesIntegration";
import {DiscordIntegrationSettings} from "../DiscordIntegration";
import {EmailPasswordAuthSettings} from "../EmailPasswordAuth";
import {MobileGamesIntegrationSettings} from "../MobileGameServicesIntegration";
import {SteamIntegrationSettings} from "../SteamIntegration";

export interface IntegrationSettings {
    discordIntegration: DiscordIntegrationSettings;
    mobileGameServices: MobileGamesIntegrationSettings;
    steamIntegration: SteamIntegrationSettings;
    crazyGamesIntegration: CrazyGamesIntegrationSettings;
    emailPasswordAuth: EmailPasswordAuthSettings;
    playerSupport: {enabled: boolean};
    allowAnonymousFirebase: boolean;
}

export interface IntegrationSetters {
    setDiscordIntegration: React.Dispatch<React.SetStateAction<DiscordIntegrationSettings>>;
    setMobileGameServices: React.Dispatch<React.SetStateAction<MobileGamesIntegrationSettings>>;
    setSteamIntegration: React.Dispatch<React.SetStateAction<SteamIntegrationSettings>>;
    setCrazyGamesIntegration: React.Dispatch<React.SetStateAction<CrazyGamesIntegrationSettings>>;
    setEmailPasswordAuth: React.Dispatch<React.SetStateAction<EmailPasswordAuthSettings>>;
    setPlayerSupport: React.Dispatch<React.SetStateAction<{enabled: boolean}>>;
    setAllowAnonymousFirebase: React.Dispatch<React.SetStateAction<boolean>>;
}

const getDefaultDiscordIntegration = (): DiscordIntegrationSettings => {
    const app = (global as any).app as EngineRuntime;
    const savedSettings = app?.editor?.scene?.userData?.discordIntegration;
    return {
        enabled: savedSettings?.enabled || false,
        scopes: savedSettings?.scopes || [],
        isRequiredToPlay: savedSettings?.isRequiredToPlay || false,
    };
};

const getDefaultMobileGameServices = (): MobileGamesIntegrationSettings => {
    const app = (global as any).app as EngineRuntime;
    const savedSettings = app?.editor?.scene?.userData?.mobileGameServices;
    return {
        enabled: savedSettings?.enabled || false,
        leaderboards: savedSettings?.leaderboards || [],
        achievements: savedSettings?.achievements || [],
        cloudSave: savedSettings?.cloudSave || false,
        gameCenterId: savedSettings?.gameCenterId || "",
        playGamesId: savedSettings?.playGamesId || "",
    };
};

const getDefaultSteamIntegration = (): SteamIntegrationSettings => {
    const app = (global as any).app as EngineRuntime;
    const savedSettings = app?.editor?.scene?.userData?.steamIntegration;
    return {
        enabled: savedSettings?.enabled || false,
        appId: savedSettings?.appId || "",
    };
};

const getDefaultCrazyGamesIntegration = (): CrazyGamesIntegrationSettings => {
    const app = (global as any).app as EngineRuntime;
    const savedSettings = app?.editor?.scene?.userData?.crazyGamesIntegration;
    return {
        enabled: savedSettings?.enabled || false,
        gameId: savedSettings?.gameId || "",
        features: {
            leaderboards: savedSettings?.features?.leaderboards || false,
            achievements: savedSettings?.features?.achievements || false,
            socialFeatures: savedSettings?.features?.socialFeatures || false,
        },
    };
};

const getDefaultEmailPasswordAuth = (): EmailPasswordAuthSettings => {
    const app = (global as any).app as EngineRuntime;
    const savedSettings = app?.editor?.scene?.userData?.emailPasswordAuth;
    return {
        enabled: savedSettings?.enabled || false,
        allowRegistration: savedSettings?.allowRegistration !== false,
        requireEmailVerification: savedSettings?.requireEmailVerification || false,
    };
};

const getDefaultPlayerSupport = (): {enabled: boolean} => {
    const app = (global as any).app as EngineRuntime;
    const savedSettings = app?.editor?.scene?.userData?.playerSupport;
    return {
        enabled: savedSettings?.enabled !== false,
    };
};

export const useIntegrationSettings = () => {
    const app = (global as any).app as EngineRuntime;
    const editor = app.editor;

    const [discordIntegration, setDiscordIntegration] = useState<DiscordIntegrationSettings>(getDefaultDiscordIntegration);
    const [mobileGameServices, setMobileGameServices] = useState<MobileGamesIntegrationSettings>(getDefaultMobileGameServices);
    const [steamIntegration, setSteamIntegration] = useState<SteamIntegrationSettings>(getDefaultSteamIntegration);
    const [crazyGamesIntegration, setCrazyGamesIntegration] = useState<CrazyGamesIntegrationSettings>(getDefaultCrazyGamesIntegration);
    const [emailPasswordAuth, setEmailPasswordAuth] = useState<EmailPasswordAuthSettings>(getDefaultEmailPasswordAuth);
    const [playerSupport, setPlayerSupport] = useState<{enabled: boolean}>(getDefaultPlayerSupport);
    const [allowAnonymousFirebase, setAllowAnonymousFirebase] = useState(!!editor?.allowAnonymousFirebase);

    const disableAllIntegrations = useCallback(() => {
        if (!editor) return;

        // Disable guest players
        editor.allowAnonymousFirebase = false;
        setAllowAnonymousFirebase(false);

        // Disable Discord integration
        const disabledDiscord: DiscordIntegrationSettings = {
            enabled: false,
            scopes: [],
            isRequiredToPlay: false,
        };
        editor.scene.userData.discordIntegration = disabledDiscord;
        setDiscordIntegration(disabledDiscord);

        // Disable Mobile game services
        const disabledMobile: MobileGamesIntegrationSettings = {
            enabled: false,
            leaderboards: [],
            achievements: [],
            cloudSave: false,
            gameCenterId: "",
            playGamesId: "",
        };
        editor.scene.userData.mobileGameServices = disabledMobile;
        setMobileGameServices(disabledMobile);

        // Disable Steam integration
        const disabledSteam: SteamIntegrationSettings = {
            enabled: false,
            appId: "",
        };
        editor.scene.userData.steamIntegration = disabledSteam;
        setSteamIntegration(disabledSteam);

        // Disable CrazyGames integration
        const disabledCrazyGames: CrazyGamesIntegrationSettings = {
            enabled: false,
            gameId: "",
            features: {
                leaderboards: false,
                achievements: false,
                socialFeatures: false,
            },
        };
        editor.scene.userData.crazyGamesIntegration = disabledCrazyGames;
        setCrazyGamesIntegration(disabledCrazyGames);

        // Disable Email/Password authentication
        const disabledEmailPassword: EmailPasswordAuthSettings = {
            enabled: false,
            allowRegistration: false,
            requireEmailVerification: false,
        };
        editor.scene.userData.emailPasswordAuth = disabledEmailPassword;
        setEmailPasswordAuth(disabledEmailPassword);
    }, [editor]);

    const loadIntegrationSettings = useCallback(() => {
        if (!editor) return;

        // Load Discord integration settings
        const discordData = editor.scene?.userData?.discordIntegration;
        if (discordData) {
            setDiscordIntegration({
                enabled: !!discordData.enabled,
                scopes: discordData.scopes || [],
                isRequiredToPlay: !!discordData.isRequiredToPlay,
            });
        }

        // Load Mobile game services settings
        const mobileData = editor.scene?.userData?.mobileGameServices;
        if (mobileData) {
            setMobileGameServices({
                enabled: !!mobileData.enabled,
                leaderboards: mobileData.leaderboards || [],
                achievements: mobileData.achievements || [],
                cloudSave: !!mobileData.cloudSave,
                gameCenterId: mobileData.gameCenterId || "",
                playGamesId: mobileData.playGamesId || "",
            });
        }

        // Load Steam integration settings
        const steamData = editor.scene?.userData?.steamIntegration;
        if (steamData) {
            setSteamIntegration({
                enabled: !!steamData.enabled,
                appId: steamData.appId || "",
            });
        }

        // Load CrazyGames integration settings
        const crazyGamesData = editor.scene?.userData?.crazyGamesIntegration;
        if (crazyGamesData) {
            setCrazyGamesIntegration({
                enabled: !!crazyGamesData.enabled,
                gameId: crazyGamesData.gameId || "",
                features: {
                    leaderboards: !!crazyGamesData.features?.leaderboards,
                    achievements: !!crazyGamesData.features?.achievements,
                    socialFeatures: !!crazyGamesData.features?.socialFeatures,
                },
            });
        }

        // Load Email/Password authentication settings
        const emailPasswordData = editor.scene?.userData?.emailPasswordAuth;
        if (emailPasswordData !== undefined) {
            setEmailPasswordAuth({
                enabled: !!emailPasswordData.enabled,
                allowRegistration: emailPasswordData.allowRegistration !== false,
                requireEmailVerification: !!emailPasswordData.requireEmailVerification,
            });
        }

        // Load Player support settings
        const playerSupportData = editor.scene?.userData?.playerSupport;
        if (playerSupportData !== undefined) {
            setPlayerSupport({
                enabled: !!playerSupportData.enabled,
            });
        }

        setAllowAnonymousFirebase(!!editor.allowAnonymousFirebase);
    }, [editor]);

    return {
        // State
        discordIntegration,
        mobileGameServices,
        steamIntegration,
        crazyGamesIntegration,
        emailPasswordAuth,
        playerSupport,
        allowAnonymousFirebase,
        // Setters
        setDiscordIntegration,
        setMobileGameServices,
        setSteamIntegration,
        setCrazyGamesIntegration,
        setEmailPasswordAuth,
        setPlayerSupport,
        setAllowAnonymousFirebase,
        // Actions
        disableAllIntegrations,
        loadIntegrationSettings,
    };
};
