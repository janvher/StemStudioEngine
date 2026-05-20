import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";
import {LIBRARY_HEIGHT} from "../../AssetsLibrary/AssetsLibrary.style";

export const LEFT_RIGHT_PADDING = "16px";

export const Wrapper = styled.div<{$absolute?: {bottom: string; right: string}; $size?: number; $disabled?: boolean}>`
    ${({$size}) =>
        $size &&
        `
width: ${$size}px;
height: ${$size}px;
`}

    ${({$absolute}) =>
        $absolute &&
        `
    position: absolute;
    bottom: ${$absolute.bottom};
    right: ${$absolute.right};
    `};

    svg {
        cursor: ${({$disabled}) => ($disabled ? "not-allowed" : "pointer")};
    }
`;

export const StyledCard = styled.div<{$selected?: boolean; $inLibrary: boolean}>`
    ${({$inLibrary}) =>
        $inLibrary
            ? `
position: absolute;
    top: 0;
    right: -8px;
        transform: translateX(100%);
`
            : `

position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
`}
    z-index: 99999;

    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;

    width: 264px;
    height: ${LIBRARY_HEIGHT};
    max-height: 100vh;
    border-radius: 16px;
    background: var(--theme-container-main-dark);

    p {
        padding: 0;
        margin: 0;
    }
`;

export const Content = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    width: 100%;
`;

export const CloseButton = styled.button`
    position: absolute;
    top: 12px;
    right: 12px;
    width: 16px;
    height: 16px;
    ${flexCenter};
    border-radius: 50%;
    background-color: var(--theme-grey-bg) !important;

    .xIcon {
        width: 12px;
        height: 12px;
    }
`;

export const MainInfo = styled.div`
    flex-shrink: 0;
    width: 100%;
    padding: 10px ${LEFT_RIGHT_PADDING} 8px;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    flex-direction: column;
    row-gap: 18px;
`;

export const FlexWrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    column-gap: 2px;
`;

export const PrimaryText = styled.div<{$textXS?: boolean}>`
    color: #fff;
    font-size: ${({$textXS}) => ($textXS ? "10px" : "12px")};
    line-height: 133%;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    column-gap: 2px;
    flex-shrink: 0;
    max-width: 100%;
    text-transform: capitalize;

    .textIcon {
        width: 16px;
        aspect-ratio: 1 / 1;
    }

    .typeIcon {
        width: 12px;
        aspect-ratio: 1 / 1;
    }
`;

export const PrimaryTextHelper = styled(PrimaryText)`
    font-size: 9px;
    margin-top: -4px;
`;

export const Description = styled.div`
    max-width: 100%;
    flex-shrink: 0;
    color: #d3d3da;
    font-size: 12px;
    line-height: 141%;
    padding: 8px ${LEFT_RIGHT_PADDING};
    max-height: 100px;

    .language-javascript {
        max-width: 100%;
        white-space: pre-wrap;
        word-break: break-word;
    }
`;

export const StyledPublishInfo = styled.div`
    flex-shrink: 0;
    width: 100%;
    padding: 4px ${LEFT_RIGHT_PADDING};
    border-top: 1px solid #252528;
    border-bottom: 1px solid #252528;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    row-gap: 4px;
`;

export const LinksInfo = styled(StyledPublishInfo)`
    border-top: none;
`;

export const LinkButton = styled.a`
    ${flexCenter};
    width: 40px;
    height: 40px;
    padding: 8px;

    img {
        max-width: 100%;
    }
`;
