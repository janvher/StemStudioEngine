import styled from "styled-components";

import {regularFont} from "../../../../../../assets/style";

export const Shortcut = ({shortcut}: {shortcut: string}) => {
    return <StyledShortcut>{shortcut}</StyledShortcut>;
};

const StyledShortcut = styled.span`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium);
    color: var(--theme-font-disabled);
    margin-left: auto;
`;
