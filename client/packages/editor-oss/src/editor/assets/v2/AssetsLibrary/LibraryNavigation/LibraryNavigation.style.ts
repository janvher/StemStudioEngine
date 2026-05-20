import styled from "styled-components";

import {regularFont} from "../../../../../assets/style";

export const LibraryTopInfo = styled.div`
    height: 24px;
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    column-gap: 4px;

    .path {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium-plus);
    }
`;

export const ArrowButton = styled.button`
    height: 24px;
    width: 24px;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
        width: 24px;
    }
`;
