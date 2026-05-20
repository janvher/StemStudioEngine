import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

interface Props {
    children: React.ReactNode;
    margin?: string;
    nowrap?: boolean;
    justifyContent?: string;
}

export const SelectionOfButtons = ({children, margin, nowrap, justifyContent}: Props) => {
    return (
        <StyledSelectionOfButtons $margin={margin}
            $nowrap={nowrap}
            $justifyContent={justifyContent}
        >
            {children}
        </StyledSelectionOfButtons>
    );
};

const StyledSelectionOfButtons = styled.div<{
    $margin?: string;
    $nowrap?: boolean;
    $justifyContent?: string;
}>`
    width: 100%;
    ${({$margin}) => $margin ? `margin: ${$margin}` : `margin: 8px auto 4px;`};
    ${flexCenter};
    gap: 12px 6px;
    justify-content: ${({$justifyContent}) => $justifyContent ? ` ${$justifyContent};` : "flex-start"};
    flex-wrap: ${({$nowrap}) =>
        $nowrap
            ? `nowrap`
            : `wrap
`};
    button {
        height: 24px;
        padding: 4px;
        font-weight: var(--theme-font-regular);
    }
`;
