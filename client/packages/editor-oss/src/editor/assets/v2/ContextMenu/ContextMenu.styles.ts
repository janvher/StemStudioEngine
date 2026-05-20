import styled, {keyframes} from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Container = styled.div<{
    $isOpen: boolean;
    $isFixedToBottom?: boolean;
    $isWide?: boolean;
    $isCreateStep?: boolean;
    $isAIBox?: boolean;
    $customWidth?: string;
    $noPadding?: boolean;
}>`
    display: flex;
    flex-direction: column;
    padding: 8px;
    ${({$noPadding}) => $noPadding && `padding: 0;`}
    gap: 8px;
    width: 400px;
    position: fixed;

    background: #00000066;
    backdrop-filter: blur(30px);

    border-radius: 24px;
    z-index: 1000;
    border: none;
    pointer-events: all;

    ${({$isFixedToBottom}) =>
        $isFixedToBottom &&
        `
        bottom: 80px;
        width: 342px;
        left: 50%;
        transform: translateX(-50%);
        top: auto
    `}

    ${({$isWide}) =>
        $isWide &&
        `
        width: 60vw;
    `}
  
    ${({$isCreateStep, $isAIBox}) =>
        $isCreateStep &&
        `
        width: ${$isAIBox ? "400px" : "450px"};
    `}
    ${({$customWidth}) =>
        $customWidth &&
        `
        width: ${$customWidth};
    `}

    ${({$isOpen}) => !$isOpen && "display: none;"}

    .StyledCombobox .combobox-input {
        background: var(--theme-container-milky) !important;
    }
`;

export const Separator = styled.div<{$invisible?: boolean}>`
    position: relative;
    width: calc(100% + 16px);
    transform: translateX(-8px);
    height: 1px;
    background: var(--theme-container-divider);
    ${({$invisible}) => $invisible && "opacity: 0;"}
`;

export const Menu = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--theme-font-main-selected-color);
`;

export const MenuItem = styled.button`
    margin: 0;
    border: none;
    color: var(--theme-font-unselected-tertiary-color);
    height: 32px;
    padding: 8px;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    border-radius: 16px;
    background: transparent;
    transition: all 0.2s;

    font-size: var(--theme-font-size-s);
    line-height: 120%;
    color: var(--theme-font-main-selected-color);
    font-weight: var(--theme-font-medium-plus);
    text-align: left;

    img {
        transform: rotate(180deg);
        width: 16px;
        height: 16px;
    }

    .plusIcon {
        margin: 0 8px 0 auto;
        width: 20px;
        height: 20px;
    }

    &:hover {
        background: var(--theme-container-milky);
    }
`;

export const Prompt = styled.textarea<{$isFirst?: boolean; $isForm?: boolean}>`
    height: 120px;
    width: 100%;
    padding: 8px;
    border-radius: 8px;
    background: var(--theme-container-milky);
    color: #fff;
    font-size: 12px;
    resize: none;
    outline: none;
    border: none;
    ${({$isFirst}) => $isFirst && "margin-bottom: 125px;"}
    ${({$isForm}) => $isForm && "padding-bottom: 32px;"}
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);

    &::placeholder {
        color: #d3d3d3;
    }
`;

export const SubmitButton = styled.button<{
    $isSecondary?: boolean;
    $isDark?: boolean;
    $isInsideForm?: boolean;
    $isInGame?: boolean;
}>`
    outline: none;
    border: none;
    border-radius: 8px;
    width: 100%;
    height: 32px;
    color: var(--theme-font-main-selected-color);
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    background: #c7027f;
    text-align: center;
    cursor: pointer;
    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
    ${({$isSecondary}) =>
        $isSecondary &&
        `
        background: #5C5C5C;
    `}
    ${({$isDark}) =>
        $isDark &&
        `
        background: var(--theme-grey-bg);
    `}

    ${({$isInsideForm}) =>
        $isInsideForm &&
        `
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: auto;
        padding: 8px;
    `}
    ${({$isInGame}) =>
        $isInGame &&
        `
        border-radius: 16px;
        font-weight: var(--theme-font-medium-plus);
    `}
`;

export const AnotherPromptMessage = styled.div`
    color: #eed202;
    font-size: 12px;
    text-align: center;
`;

const spin = keyframes`
    from {transform:rotate(0deg);}
    to {transform:rotate(360deg);}
`;

export const LoadingWrapper = styled.div`
    width: 100%;
    height: 108px;
    ${flexCenter};
    flex-direction: column;
    gap: 12px;
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-main-selected-color);

    img {
        width: 40px;
        height: 40px;
        animation: ${spin} 1s linear infinite;
    }
`;

export const StepsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-main-selected-color);
    width: 100%;
    padding: 8px 0px 0px;
`;

export const Step = styled.div`
    display: flex;
    gap: 8px;
    flex-direction: column;
    padding-bottom: 8px;
`;

export const StepInput = styled.input`
    width: 100%;
    padding: 4px;
    border-radius: 4px;
    background: var(--theme-container-milky);
    color: var(--theme-font-unselected-tertiary-color);
    font-size: 12px;
    resize: none;
    outline: none;
    border: none;
`;

export const StepDetails = styled.div`
    display: flex;
    gap: 8px;
    flex-direction: column;
`;

export const ImagesWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
`;

export const ResultImage = styled.div<{$isSelected: boolean}>`
    width: 46px;
    height: 46px;
    border-radius: 8px;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    img {
        width: 100%;
        height: 100%;
    }
    &::after {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 12px;
        border: 2px solid transparent;
        pointer-events: none;
        ${({$isSelected}) => $isSelected && "border: 2px solid #fff;"}
    }
`;

export const StepDetailsItem = styled.div`
    display: flex;
    flex-direction: column;
    font-size: 12px;
    color: var(--theme-font-unselected-tertiary-color);
    gap: 4px;
`;

export const InputWrapper = styled.div`
    width: 100%;
    position: relative;
`;

export const EmptyInput = styled(InputWrapper)`
    height: 21px;
    background: var(--theme-container-milky);
    border-radius: 4px;
    padding: 4px;
    color: var(--theme-font-unselected-tertiary-color);
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
`;

export const InputButton = styled.div`
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
`;

export const BehaviorsMenu = styled.div`
    position: absolute;
    bottom: 0;
    left: calc(100% + 16px);
    padding: 8px;
    background: #171717;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 0px;
    width: 216px;
    max-height: 336px;
    overflow-y: auto;
`;

export const BehaviorsMenuItem = styled.div<{$isSelected: boolean}>`
    width: 100%;
    font-size: 12px;
    color: var(--theme-font-unselected-tertiary-color);
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s;
    ${({$isSelected}) =>
        $isSelected &&
        `
        opacity: 0.8;
        pointer-events: none;
    `}

    &:hover {
        background: #262626;
        color: #fff;
        font-weight: var(--theme-font-medium-plus);
    }
`;

export const ModelContainer = styled.div`
    height: 200px;
    width: 100%;
    ${flexCenter};
    border-radius: 8px;
`;

export const CloseBtn = styled.img`
    position: absolute;
    right: 8px;
    top: 8px;
    cursor: pointer;
    width: 24px;
    height: 24px;
`;

export const LoadingHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-unselected-tertiary-color);
    img {
        animation: ${spin} 1s linear infinite;
    }
`;

export const LoadingDescription = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    color: var(--theme-font-unselected-tertiary-color);
    background: var(--theme-container-milky);
    border-radius: 8px;
    padding: 4px 8px;
`;

export const LoadingItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const FollowUpMessage = styled.div`
    font-size: 12px;
    color: var(--theme-font-unselected-tertiary-color);
`;

export const EditorWrapper = styled.div`
    height: 75vh;
`;

export const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 0 auto;
    width: 100%;
    position: relative;
`;

export const AiMessages = styled.div`
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--theme-container-milky);
    color: #fff;
    font-size: 12px;
    font-weight: var(--theme-font-medium-plus);
    border-radius: 8px;
    margin-bottom: 8px;
    position: relative;
`;

export const AiMessage = styled.div`
    white-space: pre-wrap;
`;

export const ImageUploadCard = styled.div<{$hasImage?: boolean}>`
    width: 100%;
    height: 100px;
    background: var(--theme-grey-bg);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.2s;

    ${({$hasImage}) =>
        !$hasImage &&
        `
        &:hover {
            background: var(--theme-container-milky);
        }
    `}
`;

export const ImageUploadIcon = styled.img`
    width: 24px;
    height: 24px;
    opacity: 0.7;
`;

export const ImageUploadText = styled.span`
    font-size: 12px;
    color: var(--theme-font-unselected-tertiary-color);
    font-weight: var(--theme-font-medium-plus);
`;

export const ImagePreview = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const ImageRemoveButton = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all 0.2s;

    &:hover {
        background: #c7027f;
    }

    img {
        width: 12px;
        height: 12px;
    }
`;
