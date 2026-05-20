import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #09090b99;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

export const ModalContent = styled.div`
    background-color: var(--theme-dialog-bg);
    border: none;
    box-shadow: var(--theme-dialog-shadow);
    width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-radius: var(--theme-dialog-border-radius);
    overflow: hidden;
`;

export const ModalHeader = styled.div`
    padding: 12px;
    height: 57px;
    border-bottom: 1px solid var(--theme-container-divider);
    ${regularFont("s")}
    font-weight: var(--theme-font-medium-plus);
    ${flexCenter};
    justify-content: space-between;

    .heading {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium-plus);
    }
`;

export const HeaderButtons = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const ScrollableBody = styled.div`
    overflow-y: auto;
    padding: 20px;
    flex: 1;
`;

export const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
`;

export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const SectionTitle = styled.h3`
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    color: #ffffff;
    margin: 0;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

export const Row = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    div {
        width: fit-content;
    }
`;

export const Label = styled.label`
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: var(--theme-font-medium-plus);
`;

export const Input = styled.input`
    width: 100%;
    height: 24px;
    padding: 6px 7px 6px 14px;
    border: none;
    background: var(--theme-grey-bg);
    border-radius: 4px;
    color: #ffffff;
    font-size: 12px;
    outline: none;
    transition: all 0.2s;

    &:focus {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.08);
    }

    &::placeholder {
        color: rgba(255, 255, 255, 0.3);
    }
`;

export const TextArea = styled.textarea`
    width: 100%;
    min-height: 80px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #ffffff;
    font-size: 12px;
    outline: none;
    resize: vertical;
    font-family: inherit;
    transition: all 0.2s;

    &:focus {
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.08);
    }

    &::placeholder {
        color: rgba(255, 255, 255, 0.3);
    }
`;

export const ButtonsRow = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px;
`;

export const CareersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const CareerItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
`;

export const CareerInfo = styled.div`
    flex: 1;
    display: flex;
    gap: 4px;
`;

export const CareerName = styled.span`
    font-size: 12px;
    color: #ffffff;
    font-weight: var(--theme-font-medium-plus);
`;

export const CareerRating = styled.span`
    font-size: var(--theme-font-size-extra-small);
    color: rgba(255, 255, 255, 0.6);
`;

export const DeleteButton = styled.button`
    background: transparent;
    border: none;
    color: rgba(255, 100, 100, 0.8);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 100, 100, 0.1);
        color: rgba(255, 100, 100, 1);
    }
`;

export const ImportSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 4px;
`;

export const ImportText = styled.p`
    font-size: var(--theme-font-size-extra-small);
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
`;

export const NumberInput = styled(Input)`
    width: 100px;
`;

export const CareerInputRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-end;
`;

export const CareerInputWrapper = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;
