import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Container = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--theme-container-main-dark);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    color: var(--theme-font-main-selected-color);

    .common-text {
        font-size: var(--theme-font-size-s);
        font-weight: var(--theme-font-regular);
        color: var(--theme-font-unselected-color);
        line-height: 120%;
        text-align: left;
    }

    .white-bold {
        font-weight: var(--theme-font-medium);
        color: var(--theme-font-main-selected-color);
    }
`;

export const BorderedWrapper = styled.div<{
    height?: string;
    $isHeader?: boolean;
}>`
    display: flex;
    width: 100%;
    padding: 8px;
    height: ${({height}) => height || "auto"};
    min-height: ${({height}) => height || "48px"};
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
`;

export const Label = styled.div<{$regular?: boolean; $isGray?: boolean; $withIcon?: boolean; $disabled?: boolean}>`
    ${regularFont("s")};
    font-weight: ${({$regular}) => $regular ? "var(--theme-font-regular)" : "var(--theme-font-medium-plus)"};
    margin-bottom: 8px;
    color: ${({$isGray}) => $isGray ? "var(--theme-font-unselected-color)" : "var(--theme-font-main-selected-color)"};

    ${({$withIcon}) =>
        $withIcon &&
        `
    ${flexCenter};
    justify-content: space-between;
    width: 100%;
    .icon {
        width: 18px;
        cursor: pointer;
    }
    `}
`;

export const PanelContentWrapper = styled.div<{$isBehaviorOpen: boolean}>`
    width: 100%;
    // padding bottom should be same as top + editor button height
    padding: 12px 8px;
    height: 100%;
`;

export const PanelSectionTitle = styled.div<{$margin?: string}>`
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    text-align: left;
    ${({$margin}) => $margin && `margin: ${$margin}`}
`;

export const PanelSectionTitleSecondary = styled(PanelSectionTitle)`
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-color);
`;

export const Instruction = styled.div`
    width: 100%;
    height: 63px;
    margin: 0 auto;
    border-radius: 8px;
    background: var(--theme-editor-box-bg);
    padding: 10px 11px;
    .text {
        ${regularFont("s")};
        color: var(--theme-font-unselected-tertiary-color);
    }
    .text:first-child {
        margin-bottom: 12px;
    }
`;

export const SectionWrapper = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    flex-direction: column;
    row-gap: 12px;
`;
