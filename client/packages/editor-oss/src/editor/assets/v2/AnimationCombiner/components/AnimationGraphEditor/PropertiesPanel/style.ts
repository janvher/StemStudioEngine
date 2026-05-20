import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";

export const PropertyGroup = styled.div`
    width: 100%;
    height: 100%;
`;

export const PropertyLabel = styled.div`
    min-width: 120px;
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
`;

export const PropertyValue = styled.div`
    font-size: 12px;
    color: var(--theme-font-main-selected-color);
    flex: 1;
`;

export const PaddingContainer = styled.div`
    width: 100%;
    height: calc(100% - 57px);
    padding: 8px;
    display: flex;
    flex-direction: column;
`;

export const Title = styled.div`
    ${regularFont("s")};
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin: 8px 0;
    column-gap: 4px;
`;

export const ConditionWrapper = styled.div`
    border-bottom: 1px solid var(--theme-container-divider);
    padding-bottom: 12px;
    margin-bottom: 8px;
`;

export const ButtonsWrapper = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
    margin-top: auto;
`;

export const DraggableParam = styled.div`
    background: var(--theme-container-minor-dark);
    border: 1px solid var(--theme-container-divider);
    border-radius: 6px;
    padding: 8px;
    cursor: grab;
    user-select: none;

    &:active {
        cursor: grabbing;
    }

    button img {
        pointer-events: none;
    }
`;
