import styled from "styled-components";

import {flexCenter} from "../../../../../../assets/style";

export const MappingWrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--theme-overlay-white-8);

    &:last-of-type {
        border-bottom: none;
    }
`;

export const URLRow = styled.div`
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-end;
    justify-content: space-between;
    width: 100%;
    column-gap: 20px;
    position: relative;
`;

export const Field = styled.div`
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex-direction: column;
    width: 50%;
    row-gap: 8px;

    input {
        width: 100%;
        height: 44px;
        font-size: var(--theme-font-size-base) !important;
        color: var(--theme-font-primary);
    }
`;

export const EditWrapper = styled.div`
    ${flexCenter};
    column-gap: 4px;

    position: absolute;
    bottom: 0;
    right: -10px;
    z-index: 2;

    button {
        width: 25px;
        height: 25px;
    }

    img {
        width: 15px;
    }
`;

export const IconBtn = styled.button<{$isEditing?: boolean}>`
    width: 40px;
    height: 40px;
    background-color: var(--theme-grey-bg) !important;
    border-radius: 8px;
    ${flexCenter};

    ${({$isEditing}) =>
        $isEditing &&
        `opacity: 0;
        cursor: default;
        &:disabled {
            cursor: default !important;
        }`}
`;

export const CredentialSection = styled.div`
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-end;
    column-gap: 20px;
    padding-top: 12px;
    width: 100%;
`;

export const CredentialBadge = styled.span`
    display: inline-block;
    font-size: var(--theme-font-size-sm);
    padding: 4px 10px;
    border-radius: 4px;
    background-color: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    white-space: nowrap;
    margin-left: 8px;
`;

export const StyledSelect = styled.select`
    width: 100%;
    height: 44px;
    font-size: var(--theme-font-size-base);
    color: var(--theme-font-primary);
    background-color: var(--theme-card-bg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0 10px;
    outline: none;
    cursor: pointer;

    option {
        background-color: #1e2235;
        color: #C8D0E8;
    }
`;
