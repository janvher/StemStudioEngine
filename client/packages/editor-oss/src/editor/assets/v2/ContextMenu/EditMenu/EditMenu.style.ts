import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";
import {GenerateWithAIButton} from "../common/GenerateButton";

export const Wrapper = styled.div`
    display: flex;
    width: 168px;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    position: relative;

    .behaviorList {
        transform: translate(-100%, 0%);
        right: unset;
        left: -8px;
        background: #00000066;
        backdrop-filter: blur(30px);
        border-radius: 24px;
        border: none;
        pointer-events: all;

        .list-item {
            background: var(--theme-container-milky);
            color: #fff;
            margin-top: 8px;
            border-radius: 16px;
            pointer-events: all;
        }
    }

    .left {
        transform: translate(-100%, 0%);
        right: unset;
        left: -8px;
    }

    .right {
        transform: translate(100%, 0%);
        right: -8px;
        left: unset;
    }
`;

export const NavWrapper = styled.div`
    width: 100%;
    padding: 8px 0;
    border-bottom: 1px solid #fafafa33;
    border-top: 1px solid #fafafa33;
`;

export const ButtonWrapper = styled.div`
    width: 100%;
    padding: 8px;
`;

export const Nav = styled.div`
    ${flexCenter};
    width: 100%;
    gap: 5px;
    flex-wrap: nowrap;
`;

export const NavButton = styled.button`
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    border: none;
    cursor: pointer;
    ${flexCenter};
    background: #fafafa1a;
    width: 32px;
    height: 32px;
    border-radius: 16px;
    transition: 0.2s ease;

    .icon {
        transition: inherit;
    }

    &:hover {
        background: var(--theme-container-milky-hover);
    }
`;

export const AddBehaviorButton = styled(GenerateWithAIButton)`
    width: 100%;
    background: var(--theme-container-milky);
    transition: 0.3s ease;
    justify-content: center;
    &:hover {
        background: var(--theme-container-milky-hover);
    }
`;
