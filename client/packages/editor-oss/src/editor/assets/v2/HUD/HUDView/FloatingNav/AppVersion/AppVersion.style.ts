import styled from "styled-components";

import {getZIndexWithinHUD, HUD_Z_INDEX} from "../../services";

export const Bottom = styled.nav`
    position: fixed;
    z-index: ${getZIndexWithinHUD(HUD_Z_INDEX.HUDBase, 99)};
    bottom: 12px;
    right: 12px;
    margin-right: 20px;
    padding-right: 3px;
    padding-bottom: 3px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    pointer-events: none;
`;

export const WatermarkLogo = styled.img`
    width: min(160px, 24vw);
    height: auto;
    opacity: 0.9;
    user-select: none;
    pointer-events: none;
    -webkit-user-drag: none;

    @media (max-width: 768px) {
        width: 67px;
    }

    @media (max-width: 768px) and (orientation: portrait) {
        width: 50px;
    }

    @media (max-width: 430px) and (orientation: portrait) {
        width: 39px;
    }
`;
