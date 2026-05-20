import {describe, expect, it, vi} from "vitest";

import {getNextProjectPageFetcher} from "./projectPagination";

const createSection = (overrides?: Partial<{
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
}>) => ({
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...overrides,
});

describe("projectPagination", () => {
    it("returns the first section that still has a next page", () => {
        const myProjects = createSection({hasNextPage: true});
        const sharedProjects = createSection({hasNextPage: true});

        expect(getNextProjectPageFetcher([myProjects, sharedProjects])).toBe(myProjects.fetchNextPage);
    });

    it("waits for active pagination requests to finish before fetching again", () => {
        const myProjects = createSection({hasNextPage: true, isFetchingNextPage: true});
        const sharedProjects = createSection({hasNextPage: true});

        expect(getNextProjectPageFetcher([myProjects, sharedProjects])).toBeNull();
    });
});
