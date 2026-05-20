import styled from "styled-components";

import {flexCenter} from "../../../../assets/style";
import {EDITOR_TOP_NAV_HALF_HEIGHT, PANEL_FULL_HEIGHT} from "@stem/editor-oss/types/editor";

export const LEFT_PANEL_WIDTH = 244;

export const Container = styled.div`
    box-sizing: border-box;
    position: fixed;
    z-index: 100;
    left: 12px;
    top: 50%;
    transform: translateY(calc(-50% + ${EDITOR_TOP_NAV_HALF_HEIGHT}));
    width: ${LEFT_PANEL_WIDTH}px;
    height: ${PANEL_FULL_HEIGHT};
    max-height: ${PANEL_FULL_HEIGHT};
    background: var(--theme-container-main-dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    color: var(--theme-font-main-selected-color);
    z-index: 100;
    overflow: hidden;

    div,
    span,
    button {
        box-sizing: border-box;
    }
`;

export const BorderedWrapper = styled.div<{
    height?: string;
    $isHeader?: boolean;
}>`
    display: flex;
    width: 100%;
    padding: 0 8px;
    height: ${({height}) => height || "40px"};
    min-height: ${({height}) => height || "40px"};
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--theme-container-divider);
    gap: 4px;
    font-weight: var(--theme-font-medium-plus);
    font-size: var(--theme-font-size-s);

    ${({$isHeader}) =>
        $isHeader &&
        `
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
  `}

    > div {
        > span {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            display: inline-block;
            max-width: 150px;
        }
    }

    .go-back-icon {
        padding: 2px;
    }

    .go-back-icon,
    .menuIcon {
        cursor: pointer;
        border-radius: 8px;
        transition: 0.3s;
        &:hover {
            background-color: #262626;
        }
    }

    .panelTitle,
    .tabTitle {
        font-weight: var(--theme-font-medium-plus);
        font-size: 16px;
        line-height: 16px;
        color: #f8fafc;
    }

    .tabTitle {
        font-size: 12px;
    }
`;

export const TabButton = styled.div<{$isActive?: boolean}>`
    width: 100%;
    height: 32px;
    border-radius: 8px;
    ${flexCenter};
    transition: all 0.2s;
    cursor: pointer;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-medium-plus);
    color: white;

    &:hover {
        background: var(--theme-container-divider);
    }

    ${({$isActive}) =>
        $isActive &&
        `
    background: var(--theme-container-divider);
  `}
`;
