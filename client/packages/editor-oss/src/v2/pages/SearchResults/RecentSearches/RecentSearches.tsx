import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useMediaQuery} from "usehooks-ts";

import {Side, Wrapper} from "./RecentSearches.style";
import {saveSearchToLocalStorage} from "../../services";
import {IBasicGameInterface, SEARCH_GAME_QUERY} from "../../types";
import {FilterSelect} from "../FilterSelect/FilterSelect";
import {FrazeButton} from "../FrazeButton/FrazeButton";

interface Props {
    queryParams: Partial<Record<SEARCH_GAME_QUERY, string>> | undefined;
    results: IBasicGameInterface[];
    setResults: React.Dispatch<React.SetStateAction<IBasicGameInterface[]>>;
}

export const RecentSearches = ({queryParams, results, setResults}: Props) => {
    const {t} = useTranslation();
    const isMobile = useMediaQuery("(max-width: 767px)");
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const storedSearchHistory = localStorage.getItem("searchHistory");
        if (storedSearchHistory) {
            setRecentSearches(JSON.parse(storedSearchHistory));
        }
    }, []);

    useEffect(() => {
        if (queryParams) {
            const tag = queryParams.tags ? `#${queryParams.tags}` : null;
            const name = queryParams.name || null;
            let searchResults;
            if (tag) {
                searchResults = saveSearchToLocalStorage(tag);
            }
            if (name) {
                searchResults = saveSearchToLocalStorage(name);
            }
            if (searchResults) setRecentSearches(searchResults);
        }
    }, [queryParams]);

    const clearHistory = () => {
        localStorage.removeItem("searchHistory");
        setRecentSearches([]);
    };

    return (
        <Wrapper>
            {!isMobile && 
                <Side>
                    {recentSearches?.length > 0 && <div className="recentSearchesLabel">{t("Recent Searches")}</div>}
                    {recentSearches.map((fraze, index) => 
                        <FrazeButton key={fraze + index}
                            fraze={fraze}
                        />,
                    )}
                </Side>
            }
            <Side>
                {recentSearches?.length > 0 && !isMobile && 
                    <div className="clearHistoryLabel"
                        onClick={clearHistory}
                    >
                        {t("Clear Search History")}
                    </div>
                }
                <FilterSelect results={results}
                    setResults={setResults}
                />
            </Side>
        </Wrapper>
    );
};
