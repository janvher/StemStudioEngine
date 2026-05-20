import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const Wrapper = styled.div`
    padding: 0 0 12px 8px;
    width: 100%;
`;
export const AttributesGrid = styled.div`
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0;
    padding-right: 22px;
    padding-left: 32px;

    .StyledCombobox .combobox-input {
        padding: 6px 22px 6px 8px;
    }
`;

export const AttributesWrapper = styled.div`
    overflow-x: hidden;
    padding-right: 8px;
    margin-bottom: 8px;
`;

export const DeleteButton = styled.button`
    position: absolute;
    right: -4px;
    top: 20px;

    img {
        width: 24px;
        height: 24px;
    }
`;

export const Title = styled.div`
    width: 100%;
    ${regularFont("s")}
    font-weight: var(--theme-font-medium-plus);
`;

export const DragIconButton = styled.div`
    width: 24px;
    height: 24px;
    ${flexCenter};
    cursor: grab !important;
    padding: 4px;

    align-self: end;
    justify-self: center;

    position: absolute;
    left: 0;
    top: 20px;
    z-index: 2;

    img {
        width: 100%;
        height: 100%;
    }
`;
