import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

import {IS_OSS} from "../../../buildMode";

export const getTemplateIds = async (): Promise<string[]> => {
    if (IS_OSS) return [];
    try {
        const response = await Ajax.get({
            url: backendUrlFromPath(`/api/Config/Templates`),
            needAuthorization: false,
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to fetch template IDs.");
        }

        return response.data.Data?.sceneIds || [];
    } catch (error: any) {
        console.error("Error fetching template IDs:", error.message || error);
        throw new Error(error.message || "Failed to fetch template IDs.");
    }
};

export const setTemplateIds = async (sceneIds: string[]): Promise<string[]> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/Config/Admin/Templates`),
            data: JSON.stringify({sceneIds}),
            msgBodyType: "json",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to update template IDs.");
        }

        return response.data.Data?.sceneIds || [];
    } catch (error: any) {
        console.error("Error updating template IDs:", error.message || error);
        throw new Error(error.message || "Failed to update template IDs.");
    }
};
