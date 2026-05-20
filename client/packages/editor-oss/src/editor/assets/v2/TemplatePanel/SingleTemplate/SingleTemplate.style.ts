import styled from "styled-components";

import {flexCenter} from "../../../../../assets/style";

export const ListItem = styled.div<{$active: boolean}>`
    position: relative;
    width: 100%;
    margin: 0 auto;
    border-radius: 8px;
    overflow: hidden;
    background: var(--theme-grey-bg);

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;

    line-height: 120%;
    color: white;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    cursor: pointer;
    border: 3px solid transparent;

    ${({$active}) =>
        $active &&
        `border: 3px solid var(--theme-container-main-blue-border);
`}

    &:hover {
        color: white;
    }
`;

export const SceneImage = styled.div<{$bgImage?: string; $noLabel: boolean}>`
    width: 100%;
    aspect-ratio: 16 / 9;
    ${flexCenter};

    ${({$bgImage}) =>
        $bgImage
            ? `
                background-image: url('${$bgImage}');
                background-repeat: no-repeat;
                background-size: cover;
                background-position: center;

              `
            : `background-color: var(--theme-grey-bg)`};

    ${({$noLabel}) =>
        !$noLabel &&
        `
            &::after {
                content: attr(data-label);
                position: absolute;
                top: 8px;
                right: 8px;
                padding: 6px 8px;
                background: var(--theme-grey-bg-secondary);
        
                font-size: 12px;
                color: #fff;
                text-transform: uppercase;
                font-weight: var(--theme-font-bold);
        
                border-radius: 36px;
                pointer-events: none;
            }
            `};
`;

export const Stats = styled.div`
    width: 100%;
    ${flexCenter};
    justify-content: center;
    padding: 4px 16px;
    gap: 16px;
    background: #323232;
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
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    justify-content: flex-start;
`;

export const SceneName = styled.span`
    display: inline-block;
    text-align: left;
    line-clamp: 1;
    font-size: 16px;
    font-weight: 700;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
`;

export const Description = styled.div`
    width: 100%;
    color: var(--theme-font-unselected-color);
    font-size: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

export const ButtonWrapper = styled.div`
    width: 100%;
    padding: 0 12px 12px;
    margin-top: auto;
`;
