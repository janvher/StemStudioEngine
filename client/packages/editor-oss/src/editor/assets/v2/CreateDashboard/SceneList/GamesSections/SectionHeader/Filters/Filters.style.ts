import styled from "styled-components";

import {flexCenter} from "../../../../../../../../assets/style";

export const FilterButton = styled.div`
    position: relative;
    cursor: pointer;
`;
export const FiltersList = styled.div`
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translate(-50%, 100%);
    z-index: 2;

    width: 184px;
    padding: 4px;

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;

    border-radius: 8px;
    border: 1px solid #2a2e42;
    background: var(--theme-grey-bg);
`;

export const CheckboxWrapper = styled.div`
    ${flexCenter};
    justify-content: space-between;
    width: 100%;
    padding: 8px;
`;

export const OptionLabel = styled.div`
    color: var(--theme-font-unselected-tertiary-color);
    text-align: center;
    font-size: 12px;
`;
