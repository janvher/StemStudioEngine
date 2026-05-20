import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const ListItem = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    justify-content: center;
    font-size: ${regularFont("s")};
    color: #fff;
    position: relative;
    cursor: pointer;
    margin: 0 auto;
    overflow: hidden;
    &:hover {
        color: white;
    }
    img {
        border-radius: 16px;
        width: 100%;
        aspect-ratio: 16 / 9;
    }
`;

export const SceneDetailsWrapper = styled.div<{$flex?: boolean}>`
    width: 100%;
    position: relative;
    line-height: 100%;
    ${({$flex}) =>
        $flex &&
        `
    ${flexCenter};
    justify-content: flex-start;
    column-gap: 8px;
    `}

    .textContainer {
        flex-grow: 1;
        padding-right: 28px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
`;

export const SceneName = styled.span`
    display: inline-block;
    text-align: left;
    line-clamp: 1;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-medium);

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
`;

export const EditedText = styled.div`
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-color);
    line-height: 120%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
`;

export const SceneImage = styled.div<{$bgImage?: string}>`
    border-radius: 16px;
    width: 100%;
    height: 100%;
    aspect-ratio: 16 / 9;
    background-color: var(--theme-grey-bg);
    ${flexCenter};
    .default-img {
        width: 40%;
        max-width: 104px;
    }

    ${({$bgImage}) =>
        $bgImage &&
        `
                background-image: url('${$bgImage}');
                background-repeat: no-repeat;
                background-size: cover;
                background-position: center;

              `}
`;
