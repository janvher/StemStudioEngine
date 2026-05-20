import {useNavigate} from "react-router-dom";

import {StyledFrazeButton} from "./FrazeButton.styled";
import {ROUTES} from "@web-shared/routes";
import searchIconBlue from "../../../assets/search-blue.svg";
import {saveSearchToLocalStorage} from "../../services";
import {SEARCH_GAME_QUERY} from "../../types";

interface Props {
    fraze: string;
}

export const FrazeButton = ({fraze}: Props) => {
    const navigate = useNavigate();
    const useFraze = () => {
        const queryKey = fraze.startsWith("#") ? SEARCH_GAME_QUERY.GAME_TAGS : SEARCH_GAME_QUERY.GAME_NAME;
        const sanitizedPhrase = fraze.startsWith("#") ? fraze.slice(1) : fraze;
        navigate(`${ROUTES.SEARCH_RESULTS}?${queryKey}=${sanitizedPhrase}`);

        saveSearchToLocalStorage(fraze);
    };

    return (
        <StyledFrazeButton onClick={useFraze}>
            <img src={searchIconBlue}
                alt="search"
            />
            <span className="text">{fraze}</span>
        </StyledFrazeButton>
    );
};
