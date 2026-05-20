import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const Wrapper = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 12px;
    box-sizing: border-box;
    width: 100%;
`;

export const Box = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    column-gap: 8px;
    width: 100%;
`;

export const BoxLabels = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-shrink: 0;
    width: 47px;
    .title {
        ${regularFont("s")}
        font-weight: var(--theme-font-medium);
        text-align: left;
    }
    .titleSecondary {
        ${regularFont("s")};
        text-align: left;
        color: var(--theme-font-unselected-color);
    }
`;

export const LockWrapper = styled.div`
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translate(-100%, -50%);
`;

export const BoxInputs = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    column-gap: 4px;
    width: 100%;
`;

export const InputWrapper = styled.div<{$isInResizableWrapper?: boolean}>`
    position: relative;

    input {
        padding: 6px 4px 6px 18px;
        width: 45px;
        background: #262626;
    }

    .dark-input {
        font-weight: var(--theme-font-bold);
        color: var(--theme-font-unselected-color);
    }

    ${({$isInResizableWrapper}) =>
        $isInResizableWrapper &&
        `
            width: 25%;
   .numericInputWrapper{
    input {
    width: 100%
    }
   }
   `};
`;
