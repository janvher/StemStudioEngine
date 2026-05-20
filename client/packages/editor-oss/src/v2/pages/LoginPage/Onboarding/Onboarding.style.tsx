import styled from "styled-components";

import {regularFont} from "../../../../assets/style";
import {TextInput} from "../../../../editor/assets/v2/common/TextInput";
import {StyledLoginBox} from "../LoginBox/LoginBox.style";

export const OnboardingBox = styled(StyledLoginBox)`
    width: 608px;
    row-gap: 40px;

    .top {
        align-items: center;
    }

    .pageName {
        text-align: center;
    }
`;

export const InputWrapper = styled.div`
    position: relative;

    .icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
    }
`;

export const ErrorMessage = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-red);
    margin-top: -8px;
`;

export const UsernameInput = styled(TextInput)<{$valueCorrect?: boolean}>`
    width: 100%;
    border-radius: 20px !important;
    border: 1px solid var(--theme-grey-bg-secondary);

    font-size: var(--theme-font-size-s) !important;
    font-weight: var(--theme-font-medium);
    color: var(--theme-font-main-selected-color);

    &::placeholder {
        font-weight: var(--theme-font-medium);
    }

    ${({$valueCorrect}) => $valueCorrect && "border: 2px solid #34D399;"};
    ${({$valueCorrect}) => $valueCorrect === false && "border: 2px solid #FB7185; color: var(--theme-font-red);"};
`;

export const OnboardigSettings = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: stretch;
    row-gap: 16px;
    width: 100%;
    padding: 0 32px 32px;

    .description {
        ${regularFont("s")};
        color: #fff;
    }
`;
