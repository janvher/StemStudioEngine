import type {FetchScenesParams, PaginatedScenesResponse} from "@stem/network/api/scene";
import type {FileData} from "../../types/file";

export const PROJECT_LIBRARY_PAGE_LIMIT = 50;

export type ProjectSceneFetcher = (params?: FetchScenesParams) => Promise<PaginatedScenesResponse>;

export const sortScenesByRecentUpdate = (scenes: FileData[]) =>
    [...scenes].sort((a, b) => new Date(b.UpdateTime).getTime() - new Date(a.UpdateTime).getTime());

export const combineUniqueScenes = (...sceneLists: FileData[][]): FileData[] => {
    const byId = new Map<string, FileData>();

    sceneLists.flat().forEach(scene => {
        if (!byId.has(scene.ID)) {
            byId.set(scene.ID, scene);
        }
    });

    return Array.from(byId.values());
};

export const fetchAllProjectScenePages = async (
    fetcher: ProjectSceneFetcher,
    pageLimit = PROJECT_LIBRARY_PAGE_LIMIT,
): Promise<FileData[]> => {
    const scenes: FileData[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const response = await fetcher({page, limit: pageLimit});
        const pageScenes = response?.Scenes || [];
        scenes.push(...pageScenes);

        hasMore = Boolean(response?.HasMore) && pageScenes.length > 0;
        page = (response?.Page || page) + 1;
    }

    return scenes;
};
