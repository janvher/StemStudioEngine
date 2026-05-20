import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const Section = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const TabContent = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0;
`;

export const Wrapper = styled.div`
    ${flexCenter};
    position: relative;
`;

export const ExpandButton = styled.div<{$expanded: boolean}>`
    ${flexCenter};
    width: 16px;
    height: 16px;
    cursor: pointer;
    transform: ${({$expanded}) => $expanded ? "rotate(180deg)" : "rotate(0deg)"};
    transition: all 0.2s ease;

    img {
        width: 12px;
        height: 12px;
        filter: brightness(0.8);
        transition: filter 0.2s ease;
    }

    .bigArrow {
        width: 16px;
        height: 16px;
    }

    &:hover img {
        filter: brightness(1.2);
    }
`;

// New Professional Section Components

export const FormRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
    width: 100%;

    &:last-child {
        margin-bottom: 0;
    }
`;

export const Warning = styled.div`
    ${regularFont("s")};
    color: #db3b3b;
`;

export const CheckboxGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    width: 100%;
`;

export const TooltipRowWrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;
