import styled from "styled-components";

import {flexCenter} from "../../../../../../assets/style";

export const Grid = styled.div<{$bgImg?: string; $isStartMenu?: boolean}>`
    height: 100%;
    width: 100%;
    max-width: 100vw;
    display: grid;
    grid-template-columns: 423px 1fr;
    align-items: start;
    justify-items: stretch;
    padding: 0;
    position: relative;
    z-index: 2;
    overflow: hidden auto;
    pointer-events: all;
    background: #1a1a1a;
    border-radius: 0;
    pointer-events: all;

    ${({$bgImg, $isStartMenu}) =>
        $bgImg &&
        `
        background-color: #1d1b1b;
        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: url('${$bgImg}');
            background-repeat: no-repeat;
            background-size: cover;
            background-position: center;
            // ${!$isStartMenu ? "opacity: 0.1;" : "opacity: 1;"}
            z-index: -1;
        }
    `}

    @media only screen and (max-width: 767px) {
        grid-template-columns: 1fr;
        button {
            max-width: 300px;
        }
    }
`;

export const ButtonsColumn = styled.div<{
    $panelBg?: string;
    $menuBgColumn?: boolean;
    $isCenter?: boolean;
}>`
    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 24px;
    width: 100%;
    height: 100%;
    padding: calc(32px + 52px) 0; // 52 is height of floating nav + margin

    @media only screen and (max-width: 1919px) {
        padding: calc(16px + 52px) 0;
    }

    .marginTop {
        margin: auto auto 0 37px !important;
    }

    .bigButton {
        margin-bottom: 18px;
    }

    background: ${({$panelBg}) => $panelBg || "transparent"};

    ${({$menuBgColumn}) =>
        $menuBgColumn &&
        `
  ${flexCenter};
  grid-column: 2 / span 2;
`};
`;

export const PanelColorWrapper = styled.div`
    width: 285px;
    position: relative;
    .colorPickerWrapper {
        position: absolute;
        right: 0;
        top: unset;
        bottom: 0;
        transform: translateX(100%);
    }
    .text {
        color: #fff !important;
    }

    .StyledCombobox,
    .StyledCombobox .combobox-input {
        width: 172px !important;
    }
`;
