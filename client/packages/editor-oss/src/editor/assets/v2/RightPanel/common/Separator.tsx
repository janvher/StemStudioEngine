import styled, {CSSProperties} from "styled-components";

export const Separator = ({
    margin,
    invisible,
    width,
    style,
}: {
    margin?: string;
    invisible?: boolean;
    width?: string;
    style?: CSSProperties;
}) => {
    return <StyledSeparator $margin={margin}
        $invisible={invisible}
        $width={width}
        style={style}
           />;
};

const StyledSeparator = styled.div<{$margin?: string; $width?: string; $invisible?: boolean}>`
    flex-shrink: 0;
    height: 1px;
    margin: ${({$margin}) => $margin || "12px 0"};
    background: var(--theme-container-divider);
    width: ${({$width}) => $width || "calc(100% + 16px)"};
    ${({$width}) => !$width && "transform: translate(-8px, 0)"};
    ${({$invisible}) => $invisible && `height: 0;`};
`;
