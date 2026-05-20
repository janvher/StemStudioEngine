import styled from "styled-components";

import {flexCenter} from "../../../../../../../assets/style";

export const Header = styled.header`
    width: 100%;
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
`;

export const Label = styled.div`
    ${flexCenter};
    column-gap: 16px;
    color: #e9e9e9;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    font-family: "Innovator Grotesk VF", "Lexend", sans-serif;

    .labelText {
        ${flexCenter};
        column-gap: 4px;
    }
`;

export const PaginationWrapper = styled.div<{$isBottom: boolean}>`
    ${flexCenter};
    column-gap: 12px;
    ${({$isBottom}) =>
        $isBottom &&
        `
    margin-top: 6px;
    margin-left: auto;
    `}
`;

export const Breadcrumb = styled.div`
    ${flexCenter};
    gap: 8px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    font-family: "Innovator Grotesk VF", "Lexend", sans-serif;

    .breadcrumb-link {
        color: #b2b2b9;
        cursor: pointer;
        transition: color 0.2s ease;
        &:hover { color: #e9e9e9; }
    }

    .breadcrumb-separator {
        color: #b2b2b9;
        font-weight: 400;
    }

    .breadcrumb-current {
        color: #e9e9e9;
    }
`;

export const StyledPaginationButton = styled.button`
    height: 50px;
    width: 227px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-size: 16px;
    line-height: 12px;
    font-weight: 600;
    font-family: "Lexend", sans-serif;
    color: #e9e9e9;
    text-align: right;
`;
