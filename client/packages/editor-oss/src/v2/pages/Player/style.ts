import styled from "styled-components";

import {flexCenter} from "../../../assets/style";

export const StyledNav = styled.nav`
    position: fixed;
    z-index: 101;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 72px;
    background: #171a26;

    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 16px;
`;

export const LeftSide = styled.div`
    font-weight: 400;
    font-size: var(--theme-font-size-s);
    color: #f8fafc;
    ${flexCenter};
    column-gap: 20px;

    .logo {
        width: 104px;
    }
`;

export const IconButton = styled.div`
    width: 36px;
    height: 36px;
    padding: 0 8px;
    border-radius: 4px;
    ${flexCenter};

    cursor: pointer;
    transition: 0.3s;
    background: #474c67;
    &:hover {
        background-color: #393e54;
    }

    .homeIcon {
        padding: 2px;
        width: 20px;
    }
`;

export const Middle = styled.div`
    ${flexCenter};
    padding: 2px;
    border-radius: 8px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    .sceneName {
        color: #fff;
        text-align: center;
        font-size: 16px;
    }
`;
export const Right = styled.div`
    ${flexCenter};
    column-gap: 8px;
`;
