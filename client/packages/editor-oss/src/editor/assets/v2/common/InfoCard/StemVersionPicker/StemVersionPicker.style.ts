import styled from "styled-components";

import {flexCenter} from "../../../../../../assets/style";
import {LEFT_RIGHT_PADDING} from "../Info.style";

const StickyBottomHeight = "56px";

export const PickerContainer = styled.div`
    padding-bottom: calc(${StickyBottomHeight} + 8px);
    width: 100%;
`;

export const Wrapper = styled.div`
    padding: 8px ${LEFT_RIGHT_PADDING};
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    row-gap: 8px;
    width: 100%;
    border-top: 1px solid #252528;
`;

export const StickyBottom = styled.div`
    width: 100%;
    padding: 8px;
    height: ${StickyBottomHeight};
    ${flexCenter}
    flex-direction: column;
    row-gap: 4px;
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 2;

    background: var(--theme-grey-bg-secondary);
    border-radius: 0 0 16px 16px;

    .text {
        color: #fff;
        font-size: 9px;
    }
`;
