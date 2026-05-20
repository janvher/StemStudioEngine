import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const Container = styled.div`
    z-index: 3;
    width: 240px;
    height: 100%;

    background: var(--theme-grey-bg-tertiary);
    border-radius: 8px;
    color: var(--theme-font-main-selected-color);
    flex-shrink: 0;

    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
`;

export const Header = styled.header`
    position: relative;
    width: 100%;
    ${regularFont("s")};
    color: #fff;
    text-align: left;
    font-weight: var(--theme-font-medium-plus);
    padding: 12px 8px;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--theme-grey-bg);
    .deleteIcon {
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        cursor: pointer;
    }
`;

export const Content = styled.div`
    padding: 0 8px 12px;
    width: 100%;
`;
