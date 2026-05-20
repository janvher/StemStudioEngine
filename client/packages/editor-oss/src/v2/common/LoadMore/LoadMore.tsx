import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";

import {StyledButton} from "../../../editor/assets/v2/common/StyledButton";

interface Props {
    visibilityCounter: number;
    itemsToLoad: any[];
    setVisibleResults: Dispatch<SetStateAction<any[]>>;
    margin?: string;
}

export const LoadMore = ({visibilityCounter, itemsToLoad, setVisibleResults, margin}: Props) => {
    const {t} = useTranslation();
    const [visibleGamesCount, setVisibleGamesCount] = useState(visibilityCounter);
    const hasMoreGamesToLoad = visibleGamesCount < itemsToLoad.length;
    const loadMoreGames = () => {
        setVisibleGamesCount(prevCount => prevCount + visibilityCounter);
    };
    useEffect(() => {
        // Prevent unnecessary updates by only setting when the slice changes
        const newVisibleGames = itemsToLoad.slice(0, visibleGamesCount);
        setVisibleResults(prevResults => {
            if (prevResults.length !== newVisibleGames.length) {
                return newVisibleGames;
            }
            return prevResults;
        });
    }, [itemsToLoad, visibleGamesCount]);

    return (
        hasMoreGamesToLoad && 
            <StyledButton
                margin={margin}
                width="103px"
                height="40px"
                isGreyTertiary
                onClick={loadMoreGames}
                className="loadeMoreBtn"
            >
                {t("Load more")}
            </StyledButton>
        
    );
};
