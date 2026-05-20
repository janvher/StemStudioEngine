import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const ColorPickerWrapper = styled.div`
    position: fixed;
    z-index: 1001;
    right: 264px;
    top: 50%;
    transform: translateY(-50%);
    width: 236px;
    background: var(--theme-grey-bg-tertiary);
    ${flexCenter};
    flex-direction: column;
    border-radius: 16px;
    overflow: hidden;

    .pickerContainer {
        padding: 12px;
        width: 100%;
        box-sizing: border-box;
    }

`;

export const Label = styled.div<{$pointer?: boolean}>`
    width: 100%;
    height: 40px;
    ${flexCenter};
    ${({$pointer}) => $pointer && `cursor: pointer`};
    justify-content: space-between;
    padding: 12px;
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    background: var(--theme-grey-bg-tertiary);
    border-bottom: 1px solid var(--theme-grey-bg);
`;
