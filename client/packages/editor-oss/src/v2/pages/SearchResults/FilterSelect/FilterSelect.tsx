import { useEffect, useState } from "react";

import { IBasicGameInterface } from "../../types";

enum FILTER_LABELS {
    NEWEST = "Newest",
    RELEVANCE = "Relevance",
    TOP = "Top Games",
}

const FILTERS = [
    { key: "0", value: FILTER_LABELS.NEWEST },
    { key: "1", value: FILTER_LABELS.RELEVANCE },
    { key: "2", value: FILTER_LABELS.TOP },
];

interface Props {
    results: IBasicGameInterface[];
    setResults: React.Dispatch<React.SetStateAction<IBasicGameInterface[]>>;
}

export const FilterSelect = ({ results, setResults }: Props) => {
    const [searchSelectedFilter, setSearchSelectedFilter] = useState(FILTERS[0]!.value);

    const sortByNewest = () => {
        const sortedResults = [...results].sort(
            (a, b) => new Date(b.PublishedTime).getTime() - new Date(a.PublishedTime).getTime(),
        );
        setResults(sortedResults);
        sortedResults.forEach(element => { });
    };

    const sortByRelevance = () => {
        const sortedResults = [...results].sort((a, b) => {
            // Calculate relevance score based on PlayCount and Likes
            const relevanceA = a.PlayCount * 0.7 + a.Likes * 0.3; // Weight of 70% for PlayCount, 30% for Likes
            const relevanceB = b.PlayCount * 0.7 + b.Likes * 0.3;
            return relevanceB - relevanceA; // Sort by relevance in descending order
        });
        setResults(sortedResults);
    };

    // Based on Play Count
    const sortTopGames = () => {
        const sortedResults = [...results].sort((a, b) => b.PlayCount - a.PlayCount);
        setResults(sortedResults);
    };

    useEffect(() => {
        if (searchSelectedFilter === FILTER_LABELS.NEWEST) {
            sortByNewest();
        } else if (searchSelectedFilter === FILTER_LABELS.RELEVANCE) {
            sortByRelevance();
        } else if (searchSelectedFilter === FILTER_LABELS.TOP) {
            sortTopGames();
        }
    }, [searchSelectedFilter]);

    return (
        <></>
        // <Select
        //     width="120px"
        //     data={FILTERS}
        //     value={FILTERS.find(el => el.value === searchSelectedFilter)}
        //     onChange={selected => setSearchSelectedFilter(selected.value as FILTER_LABELS)}
        // />
    );
};
