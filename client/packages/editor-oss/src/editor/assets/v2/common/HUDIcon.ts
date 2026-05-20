import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

export const IconComponent = styled.div<{
    $left?: boolean;
    $top?: boolean;
    $playcoin?: boolean;
    $playcoinValue?: string;
    $active: boolean;
}>`
    position: fixed;
    ${flexCenter};
    pointer-events: all;

    ${({$left}) => $left ? `left: 10px` : `right: 10px`};
    ${({$top}) => $top ? `top: 10px` : `bottom: 10px;`};
    ${({$playcoin, $playcoinValue}) =>
        $playcoin &&
        `
        right: 118px;

        &::after {
            content: "${$playcoinValue ? $playcoinValue : "1,000"}";
            ${flexCenter};
            box-shadow: 0px 0px 8px 8px #00000033 inset;
            width: 182px;
            height: 56px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translateY(-50%);
            z-index: -1;

            font-family: "Lilita One";
            font-size: 24px;
            font-weight: 400;
            line-height: 24px;
            letter-spacing: -0.011em;
            text-align: center;
            color: #fff;

    }
    `};

    z-index: 1;
    width: 112px;

    aspect-ratio: 112/112;
    border-radius: 16px;

    &:hover {
        background-color: #00000033;
    }
    ${({$active}) => $active && ` background-color: #00000033`};

    img {
        width: 96px;
        height: 96px;
    }

    @media (max-width: 767px) {
        width: 90px;
        height: 90px;
    }
`;
