import styled from "styled-components";

import {flexCenter, regularFont} from "../../../assets/style";

export const FormField = styled.div`
    display: flex;
    flex-direction: column;
    row-gap: 6px;
    width: 100%;

    label {
        ${regularFont("s")};
        color: #fff;
        font-weight: 500;
    }
`;

export const Select = styled.select`
    height: 40px;
    border-radius: 8px;
    width: 100%;
    padding: 8px 12px;
    background-color: var(--theme-grey-bg-secondary);
    color: var(--theme-font-unselected-secondary-color);
    border: none;
    outline: none;
    font-size: var(--theme-font-size-s);
    box-sizing: border-box;
    cursor: pointer;

    option {
        background-color: var(--theme-container-main-dark);
    }
`;

export const RowFields = styled.div`
    display: flex;
    gap: 12px;
    width: 100%;
`;

export const RegisterForm = styled.form`
    ${flexCenter};
    flex-direction: column;
    row-gap: 16px;
    width: 100%;
`;

export const SuccessMessage = styled.div`
    ${flexCenter};
    flex-direction: column;
    row-gap: 12px;
    text-align: center;
    padding: 20px 0;

    .title {
        font-size: 18px;
        font-weight: var(--theme-font-medium-plus);
        color: #fff;
    }

    .subtitle {
        ${regularFont("s")};
        color: var(--theme-font-unselected-color);
    }
`;
