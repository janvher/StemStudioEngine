import styled from "styled-components";

import {getZIndexWithinHUD, HUD_Z_INDEX} from "../services";

export const InventoryContainer = styled.div`
    width: 553px;
    height: 328px;

    position: fixed;
    bottom: 142px;
    right: 10px;
    z-index: ${getZIndexWithinHUD(HUD_Z_INDEX.AlwaysOnTopBase, 99)};
    pointer-events: all;

    background: #d4cbb8;
    border: 1px solid #8b6653;
    border-radius: 16px;

    @media (max-width: 1023px) {
        width: 400px;
        height: 280px;
    }

    @media (max-width: 767px) {
        width: 300px;
        height: 240px;
        bottom: 102px;
    }
`;

export const ItemsContainer = styled.div`
    display: grid;
    gap: 8px;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(5, 1fr);
    padding: 16px;

    .highlighted-inventory-item {
        border: 4px solid rgb(0, 255, 195);
    }

    @media (max-width: 1023px) {
        grid-template-columns: repeat(4, 1fr);
    }

    @media (max-width: 767px) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

export const Label = styled.div<{$emptyState?: boolean}>`
    grid-column: 1/-1;
    padding: 16px;
    background: #8b6653;

    font-family: Lilita One;
    font-size: 20px;
    font-weight: 400;
    line-height: 20px;
    letter-spacing: -0.011em;
    text-align: left;
    color: #fff;
`;

export const InventoryItem = styled.div<{$bgImage?: string; $selected?: boolean}>`
    position: relative;

    width: 100%;
    height: auto;
    aspect-ratio: 112/112;
    border-radius: 16px;
    background: #efeae1;

    &:hover {
        border: 4px solid rgb(0, 255, 195);
    }
    ${({$selected}) => $selected && ` border: 4px solid rgb(0, 255, 195);`}

    ${({$bgImage}) =>
        $bgImage &&
        `
                background-image: url('${$bgImage}');
                background-repeat: no-repeat;
                background-size: 80%;
                background-position: center;

              `}
`;

export const Amount = styled.div`
    position: absolute;
    bottom: 8px;
    right: 8px;
    font-family: Lilita One;
    font-size: 40px;
    font-weight: 400;
    line-height: 40px;
    letter-spacing: -0.011em;
    color: #fff;
    -webkit-text-stroke: 3px #8b6653;
`;
