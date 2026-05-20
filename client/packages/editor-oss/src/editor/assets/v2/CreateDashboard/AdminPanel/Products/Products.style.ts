import styled from "styled-components";

import {regularFont} from "../../../../../../assets/style";

export const ProductsTableWrap = styled.div`
    border: 1px solid var(--theme-overlay-white-5);
    border-radius: 12px;
    overflow-x: auto;
    background: var(--theme-card-bg);
`;

export const ProductsTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    min-width: 760px;

    thead {
        background: var(--theme-container-main-dark);
    }

    th,
    td {
        padding: 12px;
        border-bottom: 1px solid var(--theme-overlay-white-5);
        text-align: left;
        vertical-align: middle;
        ${regularFont("s")};
        color: var(--theme-font-primary);
    }

    th {
        color: var(--theme-font-secondary);
        font-size: var(--theme-font-size-s);
        font-weight: 600;
    }

    tbody tr:last-child td {
        border-bottom: none;
    }
`;

export const ProductCard = styled.div`
    margin-top: 16px;
    background-color: var(--theme-card-bg);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--theme-font-primary);
    font-size: var(--theme-font-size-m);
    border: 1px solid var(--theme-overlay-white-5);
    box-shadow: inset 0 1px 0 var(--theme-overlay-white-3), 0 1px 3px var(--theme-overlay-black-20);
`;

export const FormHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const FieldRow = styled.div`
    display: flex;
    gap: 16px;
    align-items: center;

    label {
        width: 180px;
        flex-shrink: 0;
        font-size: var(--theme-font-size-m);
        color: var(--theme-font-secondary);
    }

    input[type="text"],
    input:not([type]),
    textarea {
        flex: 1;
        color: var(--theme-font-primary);
        background-color: var(--theme-container-main-dark);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 10px 14px;
        font-size: var(--theme-font-size-m);
        outline: none;
        box-sizing: border-box;
    }

    .NumericInput {
        text-align: right;
        padding: 12px;
    }

    .panelCheckboxWrapper {
        width: fit-content;
        min-width: 0;
        margin: 0;
    }
`;

export const InlineActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const MockModeControl = styled.div`
    .panelCheckboxWrapper {
        width: auto !important;
        justify-content: flex-start !important;
        gap: 4px;
        margin-bottom: 0;
    }

    .checkboxLabelWrapper {
        flex: 0 1 auto !important;
        min-width: 0;
    }
`;

export const CompactCheckboxRow = styled(FieldRow)`
    .panelCheckboxWrapper {
        width: auto !important;
        justify-content: flex-start !important;
        gap: 4px;
        margin-bottom: 0;
    }

    .checkboxLabelWrapper {
        flex: 0 1 auto !important;
        min-width: 0;
    }
`;

export const ProductImagePreview = styled.img`
    width: 68px;
    height: 68px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid var(--theme-overlay-white-8);
    background: var(--theme-container-main-dark);
`;

export const ProductNameCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const ProductIdText = styled.span`
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-xs);
`;

export const StatusBadge = styled.span<{$active: boolean}>`
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: var(--theme-font-size-sm);
    font-weight: 500;
    background-color: ${({$active}) => ($active ? "var(--theme-color-success-bg)" : "var(--theme-color-error-bg)")};
    color: ${({$active}) => ($active ? "var(--theme-color-success)" : "var(--theme-color-error)")};
`;
