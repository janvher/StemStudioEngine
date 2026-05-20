import styled from "styled-components";

export const Container = styled.div<{$playMode?: boolean}>`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    > div:nth-child(2) {
        border-top: none;
    }

    .BehaviorTextInput {
        height: 28px;
        border-radius: 0;
        box-sizing: border-box;
        width: 100%;
        background: #232323;
    }

    ${({$playMode}) =>
        $playMode &&
        `
max-height: 200px;
width: 240px;
* {
color: #FAFAFA !important;
}

input:not([type="range"]) {
    background: var(--theme-container-milky) !important;
}

input:not(:checked)+.slider {
    background-color: var(--theme-container-milky) !important;
}
input:not(:checked)+.slider:before {
    background-color: #FAFAFA !important;
}

.behaviorsContainer {
    padding: 8px;
    overflow-x: hidden;
    overflow-y: auto;
    scroll-behavior: smooth;
    scrollbar-width: none;
    &::-webkit-scrollbar {
        display: none;
    }
}
`}
`;

export const Header = styled.div<{$playMode?: boolean}>`
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 0 11px 8px;
    margin: 0;
    width: 100%;
    color: #f8fafc;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-medium-plus);
    border-bottom: 1px solid var(--theme-grey-bg);
    margin-bottom: 8px;

    span {
        cursor: pointer;
    }

    .icon {
        width: 14px;
        height: 14px;
        margin-right: 8px;
        cursor: pointer;
    }

    img {
        cursor: pointer;
    }

    ${({$playMode}) =>
        $playMode &&
        `
    justify-content: space-between;
    padding: 8px;
    border-bottom: 1px solid #fafafa33;
    `}
`;

export const IconWrapper = styled.div<{$playMode?: boolean}>`
    display: flex;
    align-items: center;
    gap: 8px;
    ${({$playMode}) =>
        !$playMode &&
        `
    margin-left: auto;
    `}
`;

export const CheckboxWrapper = styled.div<{$disabled?: boolean}>`
    border-top: 1px solid var(--theme-container-secondary-dark);
    background: #232323;
    padding: 8px 17px 8px;
    display: flex;
    align-items: center;
    margin: 0 8px;
    width: calc(100% - 16px);
    box-sizing: border-box;
    gap: 8px;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-color);
    .common-checkbox {
        margin: 0;
    }
    ${({$disabled}) => $disabled && `opacity: 0.5;`}
`;

export const DefaultWrapper = styled.div`
    background: transparent;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
`;

export const AddIconWrapper = styled.div`
    position: absolute;
    top: 0px;
    right: 0px;
    display: flex;
    align-items: center;
`;

export const ActionButtons = styled.div`
    position: absolute;
    bottom: 0px;
    left: 0px;
    right: 0px;
    width: 100%;
    z-index: 2;
`;
