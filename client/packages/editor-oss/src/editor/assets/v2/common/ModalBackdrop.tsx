import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

export const ModalBackdrop = styled.div<{$zIndex?: number}>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: ${({$zIndex}) => $zIndex ?? 1000};
    ${flexCenter};
`;
