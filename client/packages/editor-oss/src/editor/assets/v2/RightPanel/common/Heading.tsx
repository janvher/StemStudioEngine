import styled from "styled-components";

import {regularFont} from "../../../../../assets/style";

interface Props {
    children: React.ReactNode;
    margin?: string;
}

export const Heading = ({children, margin}: Props) => {
    return <StyledHeading $margin={margin}>{children}</StyledHeading>;
};

const StyledHeading = styled.div<{$margin?: string}>`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    ${({$margin}) => `margin: ${$margin}`};
`;
