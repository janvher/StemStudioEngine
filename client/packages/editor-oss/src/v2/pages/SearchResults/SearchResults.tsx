import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {matchPath, useLocation} from "react-router-dom";

import {FilterSelect} from "./FilterSelect/FilterSelect";
import {RecentSearches} from "./RecentSearches/RecentSearches";
import {InnerPadding, SearchContainer, TitleRow} from "./SearchResults.style";
import {getGamesByQuery} from "@stem/network/api/getGames";
import {ROUTES} from "@web-shared/routes";
import {GamesWrapper} from "../../common/GamesWrapper/GamesWrapper.style";
import {LoadMore} from "../../common/LoadMore/LoadMore";
import {SearchRow} from "../../common/SearchRow/SearchRow";
import {Footer} from "../../Footer/Footer";
import {SingleGame} from "../Home/SingleGame/SingleGame";
import {getQueryParams} from "../services";
import {IBasicGameInterface, SEARCH_GAME_QUERY} from "../types";

const RESULTS_VISIBILITY_COUNTER = 20;

export const SearchResults = () => {
    const {t} = useTranslation();
    const [results, setResults] = useState<IBasicGameInterface[]>([]);
    const [initSearchValue, setInitSearchValue] = useState("");
    const [queryParams, setQueryParams] = useState<Partial<Record<SEARCH_GAME_QUERY, string>>>();

    const location = useLocation();
    const isSearchResultsMatch = matchPath(location.pathname, ROUTES.SEARCH_RESULTS);

    useEffect(() => {
        setQueryParams(getQueryParams());
    }, [location.search]);

    useEffect(() => {
        const getResults = async () => {
            if (!queryParams) return console.error("Missing query params");
            if (isSearchResultsMatch) setInitSearchValue(queryParams.name || "");
            const gamesResults = await getGamesByQuery(queryParams);
            if (gamesResults) {
                setResults(gamesResults);
            } else {
                setResults([]);
            }
        };
        if (queryParams) getResults();
    }, [queryParams]);

    return (
        <SearchContainer>
            {/* <Header /> */}
            <InnerPadding>
                {!isSearchResultsMatch ? 
                    <TitleRow>
                        {queryParams?.tags ? t("{{tag}} Games", {tag: queryParams.tags}) : t("Top Games")}
                        <FilterSelect results={results}
                            setResults={setResults}
                        />
                    </TitleRow>
                 : 
                    <>
                        <SearchRow initValue={initSearchValue} />
                        <RecentSearches queryParams={queryParams}
                            results={results}
                            setResults={setResults}
                        />
                    </>
                }

                <GamesWrapper>
                    {results?.length === 0 ? 
                        <div className="norResults">{t("No games found.")}</div>
                     : 
                        results?.map(game => <SingleGame item={game}
                            key={game.ID}
                                             />)
                    }
                    <LoadMore
                        visibilityCounter={RESULTS_VISIBILITY_COUNTER}
                        itemsToLoad={results}
                        setVisibleResults={setResults}
                    />
                </GamesWrapper>
            </InnerPadding>
            <Footer />
        </SearchContainer>
    );
};
