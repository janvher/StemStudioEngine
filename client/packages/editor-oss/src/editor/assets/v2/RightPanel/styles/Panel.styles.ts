import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const ContentItem = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 12px;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid #333;
    width: 100%;
    box-sizing: border-box;
    font-size: var(--theme-font-size-s);
    .content-item-input {
        box-sizing: border-box;
        border-radius: 0px;
    }
    .full-width {
        width: 100%;
    }

    .colorPickerWrapper {
        right: 264px;
        top: 50%;
        transform: translateY(-50%);
    }
`;
