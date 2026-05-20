import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../../assets/style";

export const RangeWrapper = styled.div`
    width: 100%;
    ${flexCenter};
    flex-direction: column;
`;

export const Label = styled.div`
    width: 100%;
    ${regularFont("s")};
    color: #aeaeae;
    text-align: left;
`;

export const Title = styled.div<{$compact?: boolean}>`
    width: 100%;
    ${regularFont("s")};
    font-weight: var(--theme-font-bold);
    padding: ${({$compact}) => $compact ? "0 0 4px 0" : "9px"};
`;

export const Tabs = styled.div`
    width: 100%;
    ${flexCenter};
    padding: 2px 4px;
    background: var(--theme-grey-bg);
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
`;

export const SingleTab = styled.button<{$active: boolean}>`
    padding: 0;
    margin: 0;
    border: none;
    background: none;
    cursor: pointer;

    width: 62px;
    height: 28px;
    border-radius: 8px;
    ${flexCenter};
    ${regularFont("s")};

    ${({$active}) =>
        $active &&
        `
    font-weight: var(--theme-font-medium-plus);
    background: var(--theme-container-main-blue);
    `}
`;
