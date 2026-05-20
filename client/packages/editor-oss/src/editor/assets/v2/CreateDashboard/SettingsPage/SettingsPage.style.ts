import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../assets/style";

export const Container = styled.div`
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    row-gap: 20px;
    width: 100%;
    padding-top: 20px;
    padding-bottom: 20px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    padding: 24px 24px 40px;

    .box {
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        flex-direction: column;
        row-gap: 16px;
        width: 100%;
        max-width: 840px;
        margin: 0 auto;
        flex-shrink: 0;
    }
`;

export const Heading = styled.div`
    width: 100%;
    margin-bottom: 4px;
    font-size: var(--theme-font-size-xl);
    font-weight: 600;
    color: var(--theme-font-primary);
`;

export const AccountBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;

    .wrapper {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
    }

    label {
        font-size: var(--theme-font-size-base);
        color: var(--theme-font-secondary);
    }

    .greyLabel {
        color: var(--theme-font-tertiary);
    }
`;

export const DeleteBox = styled.div`
    margin-bottom: 24px !important;
`;

export const LogoutBox = styled.div`
    margin-bottom: 24px !important;
    margin-top: 24px !important;
`;

export const LegalBox = styled.div`
    padding-top: 44px;
    border-top: 1px solid var(--theme-grey-bg);
    border-radius: 0;
    height: 151px;
    img {
        margin-left: 4px;
    }

    div {
        display: flex;
        gap: 15px;
    }
`;

export const InputWrapper = styled.div`
    position: relative;
    .icon {
        position: absolute;
        right: 70px;
        top: 50%;
        transform: translateY(-50%);
    }
    .saveButton {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
    }
`;

export const ValidationInput = styled.input<{$valueCorrect?: boolean}>`
    border: 1px solid rgba(255, 255, 255, 0.06);
    ${({$valueCorrect}) => $valueCorrect && "border: 2px solid var(--theme-color-success);"};
    ${({$valueCorrect}) => $valueCorrect === false && "border: 2px solid var(--theme-color-error);"};

    color: var(--theme-font-primary);
    outline: none;
    height: 44px;
    border-radius: 8px;
    width: 100%;
    padding: 10px 14px;
    background-color: var(--theme-card-bg);
    font-size: var(--theme-font-size-base);
`;

export const LicensesBox = styled.div`
    height: 198px;
`;

export const LinkButton = styled.div`
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: var(--theme-card-bg);
`;

export const DeleteAccountButton = styled.button`
    width: 180px;
    height: 40px;
    padding: 8px 24px;
    border-radius: 8px;
    border: none;
    background: none;
    border-top: 1px solid #f43f5f;
    background: #e11d48;
    margin-top: auto;
    font-size: var(--theme-font-size-m);
    font-weight: 500;
    color: #fff;
    ${flexCenter};
    column-gap: 4px;
    cursor: pointer;
`;

export const ErrorMessage = styled.div`
    ${regularFont("s")};
    color: var(--theme-font-unselected-secondary-color);
    position: absolute;
    bottom: -4px;
    transform: translateY(100%);
`;

export const BackButton = styled.button`
    width: 142px;
    height: 44px;
    border-radius: 8px;
    background: var(--theme-card-bg) !important;
    border: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 20px;

    font-size: var(--theme-font-size-base);
    font-weight: 500;
    line-height: 16px;
    text-align: center;
    color: var(--theme-font-primary);
`;

