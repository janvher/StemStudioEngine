import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const AvatarsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: start;
    justify-content: start;
    grid-gap: 16px;
    width: 100%;
    max-width: 100%;
`;

export const SingleAvatar = styled.div<{$active: boolean}>`
    width: 100%;
    height: 100%;
    border-radius: 20px;
    background: var(--theme-grey-bg);
    ${flexCenter};
    ${regularFont("s")};
    color: var(--theme-font-unselected-color);
    border: 2px solid transparent;
    ${({$active}) => $active && `border-color: #FFFFFF`};
    aspect-ratio: 1 / 1;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
    overflow: hidden;
    position: relative;

    &:hover {
        transform: scale(1.02);
    }
`;

export const Thumb = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
`;
