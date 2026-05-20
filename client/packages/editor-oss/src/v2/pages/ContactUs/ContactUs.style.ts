import styled from "styled-components";

export const Container = styled.div`
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--theme-container-minor-dark);
    color: #fff;
    overflow-y: auto;
    overflow-x: hidden;

    a {
        color: #00a3ff;
    }
`;

export const Wrapper = styled.div`
    width: 100%;
    flex: 1;
    padding: 0 24px;
`;

export const Content = styled.div`
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 0;

    .title {
        font-size: 24px;
        font-weight: var(--theme-font-medium-plus);
        line-height: 120%;
        text-align: left;
        margin-bottom: 8px;
    }

    .subtitle {
        margin-bottom: 32px;
        font-size: 16px;
        color: #aaa;
    }
`;

export const Form = styled.form`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

export const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;

    .file-info {
        font-size: var(--theme-font-size-s);
        color: #aaa;
        margin-bottom: 4px;
    }

    .file-error {
        font-size: var(--theme-font-size-s);
        color: #ff4444;
        margin-top: 4px;
    }

    .file-name {
        font-size: var(--theme-font-size-s);
        color: #00a3ff;
        margin-top: 4px;
    }
`;

export const Label = styled.label`
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-medium-plus);
    color: #fff;
`;

export const Input = styled.input`
    padding: 12px 16px;
    font-size: 16px;
    background: var(--theme-container-dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #fff;
    transition: border-color 0.2s;

    &:focus {
        outline: none;
        border-color: #00a3ff;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

export const Select = styled.select`
    padding: 12px 16px;
    font-size: 16px;
    background: var(--theme-container-dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    transition: border-color 0.2s;

    &:focus {
        outline: none;
        border-color: #00a3ff;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    option {
        background: var(--theme-container-dark);
        color: #fff;
    }
`;

export const TextArea = styled.textarea`
    padding: 12px 16px;
    font-size: 16px;
    background: var(--theme-container-dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #fff;
    font-family: inherit;
    resize: vertical;
    min-height: 120px;
    transition: border-color 0.2s;

    &:focus {
        outline: none;
        border-color: #00a3ff;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &::placeholder {
        color: #666;
    }
`;

export const FileInput = styled.input`
    padding: 10px 0;
    font-size: var(--theme-font-size-s);
    color: #fff;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &::file-selector-button {
        padding: 8px 16px;
        margin-right: 16px;
        background: var(--theme-container-dark);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
            background: rgba(255, 255, 255, 0.05);
        }
    }
`;

export const Button = styled.button`
    padding: 14px 24px;
    font-size: 16px;
    font-weight: var(--theme-font-medium-plus);
    background: #00a3ff;
    border: none;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 8px;

    &:hover:not(:disabled) {
        background: #0088cc;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

export const SuccessMessage = styled.div`
    padding: 12px 16px;
    background: rgba(0, 200, 100, 0.2);
    border: 1px solid rgba(0, 200, 100, 0.4);
    border-radius: 4px;
    color: #00c864;
    font-size: var(--theme-font-size-s);
`;

export const ErrorMessage = styled.div`
    padding: 12px 16px;
    background: rgba(255, 68, 68, 0.2);
    border: 1px solid rgba(255, 68, 68, 0.4);
    border-radius: 4px;
    color: #ff4444;
    font-size: var(--theme-font-size-s);
`;
