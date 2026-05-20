import styled, {css} from "styled-components";

import {regularFont} from "../../../../../../../assets/style";

export const List = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 200px;
    max-height: 400px;
    padding: 12px;
    overflow: hidden auto;

    background: var(--theme-container-minor-dark);
    border: 1px solid #ffffff1a;
    border-radius: 16px;
    z-index: 10000;
`;

export const Title = styled.div`
    font-size: var(--theme-font-size-m);
    font-weight: var(--theme-font-semibold);
    line-height: 120%;
    color: var(--theme-font-primary-color);
    margin-bottom: 8px;
`;

export const SearchWrapper = styled.div`
    position: relative;
    margin-bottom: 8px;
`;

export const SearchIcon = styled.div`
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a1a1aa;
    pointer-events: none;
`;

export const SearchInput = styled.input`
    width: 100%;
    height: 32px;
    padding: 0 12px 0 32px;
    border: 1px solid #ffffff1a;
    border-radius: 8px;
    background: var(--theme-grey-bg);
    ${regularFont("s")};
    color: var(--theme-font-input-color);
    box-sizing: border-box;

    &::placeholder {
        color: #a1a1aa;
    }

    &:focus {
        outline: none;
        border-color: var(--theme-container-active-blue);
    }
`;

export const ListItem = styled.div<{$inactive?: boolean; $isAdminItem?: boolean}>`
    padding: 6px 8px;
    width: 100%;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    background: transparent !important;
    &:hover {
        background: var(--theme-container-milky) !important;
        font-weight: var(--theme-font-medium-plus);
    }
    ${({$isAdminItem}) =>
        $isAdminItem &&
        css`
            color: red;
        `}
    ${({$inactive}) =>
        $inactive &&
        css`
            opacity: 0.6;
            pointer-events: none;
        `}
`;

export const ItemDescription = styled.div`
    ${regularFont("s")};
    font-size: 9px;
    color: #a1a1aa;
    margin-top: 2px;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;

    & > span {
        display: inline-block;
    }

    &:hover > span {
        animation: marquee 24s linear infinite;
    }

    @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-100%); }
    }
`;

export const NoResults = styled.div`
    ${regularFont("s")};
    color: #a1a1aa;
    padding: 8px;
    text-align: center;
`;
