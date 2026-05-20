import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";

const NAV_HEIGHT = "56px";

export const Container = styled.div`
    position: fixed;
    z-index: 101;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 662px;
    height: 480px;
    background-color: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
`;

export const Nav = styled.div`
    color: white;
    width: 100%;
    height: ${NAV_HEIGHT};
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--theme-container-divider);
`;

export const FlexWrapper = styled.div<{$gap?: string}>`
    ${flexCenter};
    ${({$gap}) => $gap && `gap: ${$gap}`};
`;

export const MainFlexWrapper = styled.div`
    color: white;
    ${flexCenter};
    width: 100%;
    height: calc(100% - ${NAV_HEIGHT});
    justify-content: flex-start;
    align-items: flex-start;
    padding: 12px;
    flex-direction: column;
    overflow-y: auto;
    gap: 8px;
`;

export const CollaboratorsList = styled.div`
    width: 100%;
    max-height: 320px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
`;

export const CollaboratorItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--theme-grey-bg);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: var(--theme-font-size-s);
`;

export const RemoveButton = styled.button`
    background: transparent;
    border: none;
    color: #ef4444;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    border-radius: 4px;
    &:hover {
        background: #1e2235;
    }
`;

export const AddCollaboratorForm = styled.form`
    display: flex;
    gap: 8px;
    width: 100%;
    input {
        flex: 1;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid var(--theme-container-stroke-color);
        background: transparent;
        color: inherit;
        font-size: var(--theme-font-size-s);
    }
    button {
        padding: 6px 16px;
        border-radius: 8px;
        border: none;
        background: #22c55e;
        color: #fff;
        font-weight: var(--theme-font-medium-plus);
        cursor: pointer;
        &:disabled {
            background: #353952;
            cursor: not-allowed;
        }
    }
`;

export const ErrorMsg = styled.div`
    color: #ef4444;
    font-size: 13px;
    margin-bottom: 8px;
`;

export const EmptyMsg = styled.div`
    color: #8B93A7;
    font-size: 13px;
    text-align: center;
    margin-top: 12px;
`;
