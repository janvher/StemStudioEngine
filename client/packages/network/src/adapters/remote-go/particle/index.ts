import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

import {IS_OSS} from "../../../buildMode";

export type ParticleBackendData = {
    ID: string;
    Name: string;
    CreateTime: string;
    UpdateTime: string;
    Thumbnail: string;
    UserID?: string;
};

export type ParticleDetailBackendData = ParticleBackendData & {
    Data: string;
};

export const saveParticle = async (id: string, name: string, data: string): Promise<any> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/Particle/Save`),
            data: {
                ID: id,
                Name: name,
                Data: data,
            },
            msgBodyType: "urlEncoded",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to save particle.");
        }

        return response.data.Data;
    } catch (error: any) {
        console.error("Error saving particle:", error.message || error);
        throw new Error(error.message || "Failed to save particle.");
    }
};

export const editParticle = async (id: string, name: string, thumbnail?: string, category?: string): Promise<any> => {
    try {
        const data: Record<string, string> = {
            ID: id,
            Name: name,
        };

        if (thumbnail) {
            data.Thumbnail = thumbnail;
        }

        if (category) {
            data.Category = category;
        }

        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/Particle/Edit`),
            data,
            msgBodyType: "urlEncoded",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to edit particle.");
        }

        return response.data.Data;
    } catch (error: any) {
        console.error("Error editing particle:", error.message || error);
        throw new Error(error.message || "Failed to edit particle.");
    }
};

export const getParticle = async (id: string): Promise<ParticleBackendData & {Data: string}> => {
    try {
        const response = await Ajax.get({
            url: backendUrlFromPath(`/api/Particle/Get?ID=${id}`),
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to get particle.");
        }

        return response.data.Data;
    } catch (error: any) {
        console.error("Error getting particle:", error.message || error);
        throw new Error(error.message || "Failed to get particle.");
    }
};

export const getParticlesList = async (): Promise<ParticleBackendData[]> => {
    if (IS_OSS) return [];
    try {
        const response = await Ajax.get({
            url: backendUrlFromPath(`/api/Particle/List`),
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to list particles.");
        }

        return response.data.Data;
    } catch (error: any) {
        console.error("Error listing particles:", error.message || error);
        throw new Error(error.message || "Failed to list particles.");
    }
};

export const deleteParticle = async (id: string): Promise<any> => {
    try {
        const response = await Ajax.post({
            url: backendUrlFromPath(`/api/Particle/Delete`),
            data: {
                ID: id,
            },
            msgBodyType: "urlEncoded",
        });

        if (response?.data.Code !== 200) {
            throw new Error(response?.data.Msg || "Failed to delete particle.");
        }

        return response.data;
    } catch (error: any) {
        console.error("Error deleting particle:", error.message || error);
        throw new Error(error.message || "Failed to delete particle.");
    }
};
