import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

import {IS_OSS} from "../../../buildMode";

export type AccountType = "regular" | "influencer" | "admin";

export type AiCreditsConfig = {
    DefaultAmount: number;
    CreditsRefreshRate: number;
};

export type UserData = {
    ID: string;
    Email: string;
    AiCredits: number;
    AvatarID?: string;
    isAdmin?: boolean;
    isWhitelisted?: boolean;
    AccountType?: AccountType;
};

// Get user data
export const getUser = async (): Promise<UserData> => {
    if (IS_OSS) {
        return {
            ID: "local",
            Email: "local@stemstudio.invalid",
            AiCredits: 0,
        };
    }
    try {
        const response = await Ajax.get({
            url: backendUrlFromPath("/api/User/Get"),
        });
        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to get user.");
        }
        return response.data.Data;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error getting user:", message);
        throw new Error(message || "Failed to get user.");
    }
};

// Get AI credits configuration (default amount and refresh rate)
export const getAiCreditsConfig = async (): Promise<AiCreditsConfig> => {
    if (IS_OSS) return {DefaultAmount: 0, CreditsRefreshRate: 0};
    try {
        const response = await Ajax.get({
            url: backendUrlFromPath("/api/User/AiCreditsConfig"),
            needAuthorization: false,
        });
        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to get AI credits config.");
        }
        console.log("AI Credits Config:", response.data.Data);
        return response.data.Data;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error getting AI credits config:", message);
        throw new Error(message || "Failed to get AI credits config.");
    }
};


// Admin: set users limits
export const setUserLimits = async (userEmails: string[], updateAll: boolean, aiCredits: number): Promise<void> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath("/api/User/Admin/SetLimits"),
            data: JSON.stringify({
                userEmails,
                updateAll,
                aiCredits,
            }),
            msgBodyType: "json",
        });
        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to set user limits.");
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error setting user limits:", message);
        throw new Error(message || "Failed to set user limits.");
    }
};

// Admin: increase users limits
export const increaseUserLimits = async (
    userEmails: string[],
    updateAll: boolean,
    aiCredits: number,
): Promise<void> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath("/api/User/Admin/IncreaseLimits"),
            data: JSON.stringify({
                userEmails,
                updateAll,
                aiCredits,
            }),
            msgBodyType: "json",
        });
        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to increase user limits.");
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error increasing user limits:", message);
        throw new Error(message || "Failed to increase user limits.");
    }
};

// Admin: decrease users limits
export const decreaseUserLimits = async (
    userEmails: string[],
    updateAll: boolean,
    aiCredits: number,
): Promise<void> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath("/api/User/Admin/DecreaseLimits"),
            data: JSON.stringify({
                userEmails,
                updateAll,
                aiCredits,
            }),
            msgBodyType: "json",
        });
        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to decrease user limits.");
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error decreasing user limits:", message);
        throw new Error(message || "Failed to decrease user limits.");
    }
};

// Admin: set user account type (promote/demote to influencer)
export const setUserAccountType = async (
    userEmails: string[],
    accountType: AccountType,
    updateLimits: boolean = true,
): Promise<{modifiedCount: number}> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath("/api/User/Admin/SetAccountType"),
            data: JSON.stringify({
                userEmails,
                accountType,
                updateLimits,
            }),
            msgBodyType: "json",
        });
        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to set account type.");
        }
        return response.data.Data;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error setting account type:", message);
        throw new Error(message || "Failed to set account type.");
    }
};

// Admin: get users by account type
export const getUsersByAccountType = async (accountType: AccountType = "influencer"): Promise<UserData[]> => {
    try {
        const response = await Ajax.get({
            url: backendUrlFromPath(`/api/User/Admin/GetByAccountType?accountType=${accountType}`),
        });
        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to get users.");
        }
        return response.data.Data;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error getting users by account type:", message);
        throw new Error(message || "Failed to get users by account type.");
    }
};
