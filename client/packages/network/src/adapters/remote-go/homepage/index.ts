import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

import {IS_OSS} from "../../../buildMode";

export type HomepageSuggestion = {
    id?: string;
    label: string;
    prompt: string;
};

export type HomepageContent = {
    gamesCreated: number;
    suggestions: HomepageSuggestion[];
};

export const getHomepageContent = async (): Promise<HomepageContent> => {
    if (IS_OSS) return {gamesCreated: 0, suggestions: []};
    const response = await Ajax.get({
        url: backendUrlFromPath("/api/Homepage/Content"),
        needAuthorization: false,
    });

    if (response?.data?.Code !== 200) {
        throw new Error(response?.data?.Msg || "Failed to load homepage content.");
    }

    return response.data.Data;
};
