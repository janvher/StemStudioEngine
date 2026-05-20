import styled from "styled-components";

export const ValidationTextArea = styled.textarea<{$valueCorrect?: boolean}>`
    border: 1px solid var(--theme-overlay-white-5);
    ${({$valueCorrect}) => $valueCorrect && "border: 2px solid var(--theme-color-success);"};
    ${({$valueCorrect}) => $valueCorrect === false && "border: 2px solid var(--theme-color-error);"};

    color: var(--theme-font-primary);
    outline: none;
    height: 150px;
    border-radius: 8px;
    width: 100%;
    padding: 12px 16px;
    background-color: var(--theme-card-bg);
    font-size: var(--theme-font-size-m);
    resize: vertical;
    box-sizing: border-box;
`;

export const InvalidEmailList = styled.div`
    color: var(--theme-color-error);
    font-size: var(--theme-font-size-sm);
`;

export const CheckboxContainer = styled.div`
    display: flex;
    align-items: center;
    column-gap: 8px;
    > label {
        cursor: pointer;
    }

    .panelCheckboxWrapper {
        width: auto;
    }
`;

export const Settings = styled.div`
    width: 50%;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const SubTabContainer = styled.div`
    display: flex;
    gap: 0;
    border-bottom: 1px solid #353952;
    margin-bottom: 16px;
`;

export const SubTab = styled.button<{$active: boolean}>`
    background: none;
    border: none;
    padding: 12px 20px;
    cursor: ${({$active}) => $active ? "default" : "pointer"};
    color: ${({$active}) => $active ? "#fff" : "var(--theme-font-secondary)"};
    font-size: var(--theme-font-size-base);
    font-weight: 500;
    position: relative;

    &:after {
        content: "";
        display: ${({$active}) => $active ? "block" : "none"};
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--theme-container-main-blue-border);
        height: 2px;
    }

    &:hover {
        color: #fff;
    }
`;

export const PaginationContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
`;

export const PageInfo = styled.span`
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-m);
`;

export const UserListContainer = styled.div`
    margin-top: 20px;
`;

export const UserListItem = styled.div`
    padding: 14px 16px;
    background-color: var(--theme-card-bg);
    border-bottom: 1px solid var(--theme-overlay-white-5);
    color: var(--theme-font-primary);
    user-select: text;
    font-size: var(--theme-font-size-m);

    &:first-child {
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
    }

    &:last-child {
        border-bottom: none;
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
    }
`;

export const UserListHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
`;

export const UserCount = styled.span`
    color: var(--theme-font-secondary);
    font-size: var(--theme-font-size-m);
`;
