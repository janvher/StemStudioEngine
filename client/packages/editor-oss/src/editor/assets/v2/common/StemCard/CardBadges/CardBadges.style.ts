import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const Wrapper = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    ${flexCenter};
    column-gap: 4px;
`;
export const StemIcon = styled.div`
    border-radius: 0 0 0 2px;
    background: #497e35;
    width: 20px;
    height: 20px;
    padding: 2px;
`;
export const StatusIcon = styled.div`
    position: relative;
    z-index: 1;
    width: 16px;
    height: 16px;

    .statusIcon {
        max-width: 100%;
    }
`;
export const StatusInfo = styled.div`
    position: absolute;
    top: 0;
    right: 0;
    transform: translateY(50%);
    z-index: 1;

    max-width: 200px;
    background: #181818d9;
    padding: 4px;

    font-size: 10px;
    line-height: 120%;
    color: #fff;
    pointer-events: none;
    z-index: 9999;
`;
