import styled, {css} from "styled-components";

const baseOption = css`
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: "Lexend", sans-serif;
    cursor: pointer;
    transition: background 0.15s ease;
    text-align: left;
`;

export const FilterOption = styled.div`
    ${baseOption}
    color: #b2b2b9;

    &:hover {
        background: #2a2e42;
        color: #e9e9e9;
    }
`;

export const ActiveFilterOption = styled.div`
    ${baseOption}
    color: #e9e9e9;
    background: #2a2e42;
    font-weight: 600;
`;
