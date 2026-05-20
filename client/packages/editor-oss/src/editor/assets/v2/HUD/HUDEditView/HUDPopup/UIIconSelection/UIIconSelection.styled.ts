import styled from "styled-components";

import {regularFont} from "../../../../../../../assets/style";

export const Label = styled.div`
    display: block;
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
    margin-bottom: 5px;
`;

export const IconBox = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    min-height: 121px;
    overflow: hidden;
    background: #232323;
`;

export const IconsWrapper = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 8px;
    width: 100%;
`;

export const IconButton = styled.button<{selected: boolean}>`
    border: 1px solid ${({selected}) => selected ? "#fff" : "transparent"} !important;
    width: 20px;
    height: 20px;
    img {
        width: 100%;
        height: 100%;
    }
`;
