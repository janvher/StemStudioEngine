import {InteractiveResult} from "@web-shared/agent/types/ACPTypes";
import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

export type MessageExtra = {
    SeqNum: number;
    AttachedObjects?: string[];
    InteractiveResult?: InteractiveResult;
};

export type CopilotHistoryData = {
    ID: string;
    SessionID: string;
    UserID: string;
    SceneID: string;
    Title: string;
    MessageExtras: MessageExtra[];
    UsedCredits: number;
    AddTime: string;
    UpdateTime: string;
};

export type CopilotHistoryListData = Omit<CopilotHistoryData, "MessageExtras">;

export type CopilotHistoryListResponse = {
    items: CopilotHistoryListData[];
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
};

export const getCopilotHistoryList = async (
    sceneID: string,
    page: number = 1,
    limit: number = 20,
): Promise<CopilotHistoryListResponse> => {
    try {
        const params = new URLSearchParams();
        params.append("SceneID", sceneID);
        params.append("page", page.toString());
        params.append("limit", limit.toString());

        const response = await Ajax.get({
            url: backendUrlFromPath(`/api/CopilotHistory/List?${params.toString()}`),
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to list copilot history.");
        }

        return response.data.Data;
    } catch (error: any) {
        console.error("Error listing copilot history:", error.message || error);
        throw new Error(error.message || "Failed to list copilot history.");
    }
};

export const getSessionExtras = async (id: string): Promise<CopilotHistoryData> => {
    try {
        const params = new URLSearchParams();
        params.append("ID", id);

        const response = await Ajax.get({
            url: backendUrlFromPath(`/api/CopilotHistory/Get?${params.toString()}`),
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to get copilot session extras.");
        }

        return response.data.Data;
    } catch (error: any) {
        console.error("Error getting copilot session extras:", error.message || error);
        throw new Error(error.message || "Failed to get copilot session extras.");
    }
};

export const createCopilotSession = async (
    sessionID: string,
    sceneID: string,
    title: string,
): Promise<void> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/CopilotHistory/Add`),
            data: {SessionID: sessionID, SceneID: sceneID, Title: title},
            msgBodyType: "urlEncoded",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to create copilot session.");
        }
    } catch (error: any) {
        console.error("Error creating copilot session:", error.message || error);
        throw new Error(error.message || "Failed to create copilot session.");
    }
};

export const addMessageExtra = async (
    sessionID: string,
    seqNum: number,
    attachedObjects?: string[],
    interactiveResult?: InteractiveResult,
): Promise<void> => {
    try {
        const data: Record<string, any> = {
            SessionID: sessionID,
            SeqNum: seqNum.toString(),
        };

        if (attachedObjects && attachedObjects.length > 0) {
            data.AttachedObjects = JSON.stringify(attachedObjects);
        }

        if (interactiveResult) {
            data.InteractiveResult = JSON.stringify(interactiveResult);
        }

        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/CopilotHistory/AddExtra`),
            data,
            msgBodyType: "urlEncoded",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to add message extra.");
        }
    } catch (error: any) {
        console.error("Error adding message extra:", error.message || error);
        throw new Error(error.message || "Failed to add message extra.");
    }
};

export const deleteCopilotHistory = async (id?: string, sessionID?: string): Promise<any> => {
    try {
        if (!id && !sessionID) {
            throw new Error("Either ID or SessionID is required.");
        }

        const data: Record<string, any> = {};
        if (id) data.ID = id;
        if (sessionID) data.SessionID = sessionID;

        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/CopilotHistory/Delete`),
            data: data,
            msgBodyType: "urlEncoded",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to delete copilot history.");
        }

        return response.data;
    } catch (error: any) {
        console.error("Error deleting copilot history:", error.message || error);
        throw new Error(error.message || "Failed to delete copilot history.");
    }
};

export const updateCopilotHistoryCredits = async (sessionID: string, delta: number): Promise<void> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/CopilotHistory/UpdateCredits`),
            data: {SessionID: sessionID, Delta: delta},
            msgBodyType: "urlEncoded",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to update copilot history credits.");
        }
    } catch (error: any) {
        console.error("Error updating copilot history credits:", error.message || error);
        throw new Error(error.message || "Failed to update copilot history credits.");
    }
};
