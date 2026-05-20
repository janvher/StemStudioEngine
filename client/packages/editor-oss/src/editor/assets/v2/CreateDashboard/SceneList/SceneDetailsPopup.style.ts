import styled from "styled-components";

import {flexCenter, absoluteCenter, safeTextByLines} from "../../../../../assets/style";
import {StyledButton} from "../../common/StyledButton";

export const PositionWrapper = styled.div`
    ${absoluteCenter};
    z-index: 2;
`;

export const ListItem = styled.div`
    position: relative;
    width: 380px;
    // width: auto;
    // max-width: 440px;
    min-height: 512px;
    max-height: 560px;
    margin: 0 auto;
    border-radius: 16px;
    overflow: hidden;
    background: var(--theme-dialog-bg);

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;

    line-height: 120%;
    color: white;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);

    &:hover {
        color: white;
    }
`;

export const SceneImage = styled.div`
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background-color: var(--theme-grey-bg);
    ${flexCenter};
`;

export const Stats = styled.div`
    width: 100%;
    ${flexCenter};
    justify-content: center;
    padding: 4px 16px;
    gap: 63px;
    background: var(--theme-grey-bg);
    color: #fff;
`;

export const StatsItem = styled.div`
    ${flexCenter};
    gap: 2px;

    img {
        width: 16px;
    }
`;

export const Content = styled.div`
    width: 100%;
    padding: 10px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    justify-content: flex-start;
`;

export const SceneInfoGrid = styled.div`
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 24px;
    gap: 7px 14px;

    .shareButton {
        grid-column: 2 / 3;
        grid-row: 1 / span 2;
    }
`;

export const SceneName = styled.span`
    display: inline-block;
    text-align: left;
    line-clamp: 1;
    font-size: var(--theme-font-size-l);
    font-weight: 600;

    ${safeTextByLines(2)};
    text-align: left;
    line-height: 120%;
`;

export const AuthorData = styled.div`
    width: 100%;
    font-size: 12px;
    color: var(--theme-font-unselected-color);
    ${flexCenter};
    justify-content: space-between;

    .updateTime {
        text-align: right;
    }
`;
export const Description = styled.div`
    width: 100%;
    color: var(--theme-font-unselected-color);
    font-size: 12px;
    line-height: 166%;
    height: 72px;
    margin-top: 3px;
`;

export const ButtonWrapper = styled.div`
    width: 100%;
    padding: 0 16px 16px;
    margin-top: auto;
`;

export const FlexWrapper = styled.div`
    width: 100%;
    ${flexCenter};
    column-gap: 12px;
`;

export const CloseButton = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    ${flexCenter};
`;

export const Button = styled(StyledButton)`
    height: 36px;
    font-size: var(--theme-font-size-m);
    font-weight: 600;
`;
