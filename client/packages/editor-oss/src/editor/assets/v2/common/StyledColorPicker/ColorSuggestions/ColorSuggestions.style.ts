import styled from "styled-components";

import {flexCenter} from "../../../../../../assets/style";

export const SuggestedColors = styled.div`
    ${flexCenter};
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
    justify-content: flex-start;
    border-bottom: 1px solid #ffffff1a;
    height: 280px;
`;

export const Color = styled.button<{$bgColor: string; $active: boolean}>`
    margin: 0;
    padding: 0;
    border: 0;
    background: ${({$bgColor}) => $bgColor};
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    border: 1px solid var(--theme-grey-bg);
    ${({$active}) => $active && "box-shadow: 0 0 0 2px white"};
`;
