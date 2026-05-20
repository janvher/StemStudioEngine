type PaginatedProjectSection = {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
};

export const getNextProjectPageFetcher = (sections: PaginatedProjectSection[]) => {
    if (sections.some(section => section.isFetchingNextPage)) return null;

    return sections.find(section => section.hasNextPage)?.fetchNextPage ?? null;
};
