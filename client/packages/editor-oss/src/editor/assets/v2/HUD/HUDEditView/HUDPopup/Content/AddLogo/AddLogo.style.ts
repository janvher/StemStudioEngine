import styled from "styled-components";

import {regularFont} from "../../../../../../../../assets/style";

export const Wrapper = styled.div`
    width: 100%;
    pointer-events: all;
    .title {
        ${regularFont("s")};
        text-align: left;
        color: var(--theme-font-unselected-tertiary-color);
        margin-bottom: 8px;
    }
`;
