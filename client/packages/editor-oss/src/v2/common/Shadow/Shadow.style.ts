import styled from "styled-components";

const isSafari = typeof window !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const Shadow = styled.div<{$left?: boolean; $bottom?: boolean}>`
    width: 60vw;
    height: 770px;
    background-color: rgba(166, 44, 241, 0.1);
    border-radius: 50% / 100%;
    position: absolute;
    ${({$left}) => $left ? "left: 71px" : "right: 71px"};
    ${({$bottom}) => $bottom ? "bottom: 0; transform: translateY(65%);" : "top: 71px;"};
    filter: blur(320px);
    z-index: 1;
    pointer-events: none;
    ${isSafari &&
    `
        filter: blur(100px);
    `}
`;
