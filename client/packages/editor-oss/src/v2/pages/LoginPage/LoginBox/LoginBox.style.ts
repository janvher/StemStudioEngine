import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

export const StyledLoginBox = styled.div`
    width: 480px;
    max-width: 95%;
    background-color: var(--theme-grey-bg);
    border: 1px solid var(--theme-grey-bg);
    border-radius: 16px;
    ${flexCenter};
    flex-direction: column;
    row-gap: 24px;
    z-index: 1;

    @media only screen and (orientation: landscape) and (max-height: 500px) {
        padding: 24px;
        row-gap: 16px;
        max-width: min(95%, 420px);
    }
`;

export const Top = styled.div`
    ${flexCenter};
    margin: 0 auto;
    column-gap: 8px;
    width: 100%;
    padding: 16px;

    color: #fff;
    font-size: 24px;
    font-weight: 600;
    line-height: 150%;
    white-space: nowrap;

    border-bottom: 1px solid #f8fafccc;

    .stemLogo {
        height: 34px;
        width: auto;
        max-width: 220px;
        flex-shrink: 0;
    }

    @media only screen and (max-width: 480px) {
        font-size: 20px;
        white-space: normal;
        text-align: center;

        .stemLogo {
            height: 30px;
            max-width: 190px;
        }
    }
`;

export const Bottom = styled.div`
    width: 100%;
    padding: 32px;

    ${flexCenter};
    flex-direction: column;
    row-gap: 24px;
`;

export const Or = styled.div`
    width: 100%;
    color: #fff;
    text-align: center;
    font-size: 16px;
    font-weight: 500;
    line-height: 125%;
    text-transform: uppercase;
`;

export const Footer = styled.div`
    ${flexCenter};
    width: 100%;
    justify-content: space-between;

    .erthLogo {
        width: 127px;
    }
`;
