import styled from "styled-components";

export const Section = styled.div<{
    $gap?: string;
    $align?: string;
    $direction?: string;
    $height?: string;
    $width?: string;
    $justify?: string;
}>`
    align-items: ${({$align}) => $align || `flex-start`};
    display: inline-flex;
    flex-direction: ${({$direction}) => $direction || `column`};
    gap: ${({$gap}) => $gap || `4px`};
    justify-content: ${({$justify}) => $justify || `center`};
    width: ${({$width}) => $width || `100%`};
    position: relative;
    height: ${({$height}) => $height || `auto`};
`;
