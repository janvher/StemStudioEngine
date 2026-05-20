import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";

import {Row, SearchButton, StyledInput} from "./SearchRow.style";
import {ROUTES} from "@web-shared/routes";
import search from "../../assets/search.svg";
import {SEARCH_GAME_QUERY} from "../../pages/types";

interface Props {
    initValue?: string;
}

export const SearchRow = ({initValue}: Props) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [value, setValue] = useState("");

    useEffect(() => {
        initValue && setValue(initValue);
    }, [initValue]);

    const handleSearch = () => {
        if (!!value && value.trim()) {
            navigate(`${ROUTES.SEARCH_RESULTS}?${SEARCH_GAME_QUERY.GAME_NAME}=${value}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <Row>
            <StyledInput
                type="text"
                placeholder={t("Search games, experiences, and more...")}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <SearchButton onClick={handleSearch}
                disabled={!value}
            >
                <img src={search}
                    alt="search"
                />
            </SearchButton>
        </Row>
    );
};
