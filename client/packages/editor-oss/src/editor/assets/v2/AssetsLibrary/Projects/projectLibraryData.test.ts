import {describe, expect, it, vi} from "vitest";

import {
    PROJECT_LIBRARY_PAGE_LIMIT,
    combineUniqueScenes,
    fetchAllProjectScenePages,
    sortScenesByRecentUpdate,
} from "./projectLibraryData";
import type {FetchScenesParams, PaginatedScenesResponse} from "@stem/network/api/scene";
import type {FileData} from "../../types/file";

const createScene = (overrides: Partial<FileData>): FileData => ({
    ID: overrides.ID || "scene-id",
    publishRevisionId: "",
    AssetID: null,
    UserID: "user-id",
    Name: overrides.Name || "Scene",
    Description: "",
    PlayCount: 0,
    RemixCount: 0,
    Tags: "",
    Thumbnail: "",
    Url: "",
    UpdateTime: overrides.UpdateTime || "2026-05-08T00:00:00.000Z",
    IsSandbox: false,
    IsPublished: false,
    ...overrides,
});

const createPage = (overrides: Partial<PaginatedScenesResponse>): PaginatedScenesResponse => ({
    Scenes: [],
    TotalCount: 0,
    Page: 1,
    Limit: PROJECT_LIBRARY_PAGE_LIMIT,
    HasMore: false,
    ...overrides,
});

describe("projectLibraryData", () => {
    it("fetches every scene page until the API reports no more pages", async () => {
        const fetcher = vi.fn<(params?: FetchScenesParams) => Promise<PaginatedScenesResponse>>()
            .mockResolvedValueOnce(createPage({
                Scenes: [createScene({ID: "first"})],
                TotalCount: 2,
                Page: 1,
                HasMore: true,
            }))
            .mockResolvedValueOnce(createPage({
                Scenes: [createScene({ID: "second"})],
                TotalCount: 2,
                Page: 2,
                HasMore: false,
            }));

        await expect(fetchAllProjectScenePages(fetcher)).resolves.toEqual([
            expect.objectContaining({ID: "first"}),
            expect.objectContaining({ID: "second"}),
        ]);
        expect(fetcher).toHaveBeenNthCalledWith(1, {page: 1, limit: PROJECT_LIBRARY_PAGE_LIMIT});
        expect(fetcher).toHaveBeenNthCalledWith(2, {page: 2, limit: PROJECT_LIBRARY_PAGE_LIMIT});
    });

    it("deduplicates owned and collaborative scenes by ID", () => {
        const owned = createScene({ID: "owned"});
        const shared = createScene({ID: "shared"});

        expect(combineUniqueScenes([owned], [shared, owned]).map(scene => scene.ID)).toEqual(["owned", "shared"]);
    });

    it("sorts scenes by most recent update", () => {
        const scenes = [
            createScene({ID: "old", UpdateTime: "2026-05-06T00:00:00.000Z"}),
            createScene({ID: "new", UpdateTime: "2026-05-08T00:00:00.000Z"}),
            createScene({ID: "middle", UpdateTime: "2026-05-07T00:00:00.000Z"}),
        ];

        expect(sortScenesByRecentUpdate(scenes).map(scene => scene.ID)).toEqual(["new", "middle", "old"]);
    });
});
