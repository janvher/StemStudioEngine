import styled from "styled-components";

import {regularFont} from "../../assets/style";

export const FOOTER_MARGIN_TOP = "40px";
export const FOOTER_MOBILE_QUERY = "(max-width: 767px), (orientation: landscape) and (max-height: 500px)";

const FOOTER_MOBILE_MEDIA_QUERY =
    "only screen and (max-width: 767px), only screen and (orientation: landscape) and (max-height: 500px)";

export const StyledFooter = styled.footer`
    position: relative;
    z-index: 1;
    overflow: visible;
    width: 100%;
    min-height: 320px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-top: 1px solid var(--theme-homepage-grey-bg-primary);
    font-size: 12px;
    padding: 40px;
    margin-top: ${FOOTER_MARGIN_TOP};
    background-color: var(--theme-container-main-dark);
    box-sizing: border-box;

    .copyright {
        color: var(--theme-homepage-placeholder-color);
    }

    @media ${FOOTER_MOBILE_MEDIA_QUERY} {
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        row-gap: 20px;
        min-height: 300px;
    }
`;

export const ShadowContainer = styled.div`
    position: absolute;
    z-index: 2;
    top: -250px;
    left: 0;
    right: 0;
    width: 100%;
    bottom: 0;
    overflow: hidden;
    pointer-events: none;
`;

export const LeftColumn = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 3;
`;

export const MidColumn = styled.div<{$mobileGrid?: boolean}>`
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    column-gap: 48px;
    position: relative;
    z-index: 3;

    @media ${FOOTER_MOBILE_MEDIA_QUERY} {
        height: auto;
        width: 100%;
        max-width: 480px;
        margin: 0 auto;
        column-gap: 20px;
        row-gap: 18px;
        justify-content: flex-start;
        flex-wrap: wrap;

        ${({$mobileGrid}) =>
            $mobileGrid &&
            `
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            align-items: start;
            column-gap: 18px;
        `}
    }

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        max-width: 640px;
    }
`;

export const InsideColumn = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    row-gap: 16px;
    position: relative;
    z-index: 3;

    .option,
    .label {
        ${regularFont("s")};

        @media ${FOOTER_MOBILE_MEDIA_QUERY} {
            ${regularFont("s")};
        }
    }

    .option {
        color: var(--theme-homepage-placeholder-color);
        text-decoration: none;
        transition: 0.3s;
        &:hover {
            color: #fff;
        }
    }
    .disabled {
        cursor: not-allowed;
    }
`;

export const MobileColumn = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    row-gap: 20px;

    ${InsideColumn} {
        height: auto;
        row-gap: 10px;
    }
`;

export const RightColumn = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    position: relative;
    z-index: 3;
`;

// mobile
export const MobileRow = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 3;
`;
