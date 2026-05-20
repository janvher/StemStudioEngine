import styled from "styled-components";

import {flexCenter, regularFont} from "../../../assets/style";

export const Row = styled.div`
    ${flexCenter};
    width: 100%;
    column-gap: 16px;
    margin-bottom: 12px;
`;

export const SearchButton = styled.button`
    width: 64px;
    height: 64px;
    padding: 8px 12px;
    border-radius: 8px;
    border: none;
    background: var(--theme-homepage-main-blue);
    flex-shrink: 0;
    cursor: pointer;
    @media only screen and (max-width: 767px) {
        width: 56px;
        height: 56px;
    }
    @media only screen and (max-width: 480px) {
        width: 44px;
        height: 44px;
    }
`;

export const StyledInput = styled.input`
    flex-grow: 1;
    height: 64px;
    border: none;
    border-radius: 8px;
    background: #27272a66;
    border: 1px solid #3f3f4666;
    ${regularFont("s")};
    padding: 20px 24px;
    &::placeholder {
        color: var(--theme-homepage-placeholder-color);
    }
    @media only screen and (max-width: 767px) {
        height: 56px;
        ${regularFont("s")};
    }
    @media only screen and (max-width: 480px) {
        height: 44px;
        padding: 12px 16px;
    }
`;
