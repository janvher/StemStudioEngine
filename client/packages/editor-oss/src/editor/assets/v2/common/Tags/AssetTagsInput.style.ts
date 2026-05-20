import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";
import {TextInput} from "../TextInput";

export const Property = styled.div`
    position: relative;
    width: 100%;
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;

    .inputIcon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
    }

    .enterIcon {
        aspect-ratio: unset;
        width: 35px;
    }
`;

export const Label = styled.label`
    display: block;
    ${regularFont("s")};
    color: #aeaeae;
`;

export const Input = styled(TextInput)<{$mobile?: boolean}>`
    width: 100%;
    height: 24px;
    color: white;
    background-color: var(--theme-grey-bg);
    padding-right: ${({$mobile}) => $mobile ? "28px" : "48px;"};
`;
