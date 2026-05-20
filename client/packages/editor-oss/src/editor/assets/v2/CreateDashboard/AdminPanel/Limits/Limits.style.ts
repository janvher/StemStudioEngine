import styled from "styled-components";

export const Row = styled.div`
    display: flex;
    gap: 24px;
    align-items: center;
    margin-bottom: 6px;

    label {
        width: 160px;
        flex-shrink: 0;
    }

    .StyledCombobox .combobox-input {
        height: 40px;
    }

    .StyledCombobox .combobox-button {
        top: 50%;
        transform: translateY(-50%);
    }

    .NumericInput {
        text-align: right;
        padding: 12px;
    }
`;
