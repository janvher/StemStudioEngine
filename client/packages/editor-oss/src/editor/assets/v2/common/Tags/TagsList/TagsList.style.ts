import styled from "styled-components";

import {safeText} from "../../../../../../assets/style";
import {MENU_SIZE} from "../../StemCard/CardMenu/CardMenu.style";

export const Tag = styled.div<{
    $first: boolean;
    $active: boolean;
    $readOnly: boolean;
    $template?: boolean;
    $customColor?: string;
}>`
    position: relative;
    height: 15px;
    max-width: 50%;
    padding: 0 3px;
    font-size: 10px;
    color: #f8fafccc;
    ${({$readOnly}) => !$readOnly && `cursor: pointer;`};

    display: flex;
    align-items: center;
    justify-content: flex-start;
    column-gap: 2px;

    background: ${({$active}) => ($active ? "#326878" : "#1f444f")};
    ${({$customColor}) => $customColor && `background: ${$customColor}; color: #fff;`};
    border-radius: 4px;
    ${({$template}) =>
        $template &&
        `
     background: transparent;
     border-radius: 4px;
     border: 1px dashed  #f8fafccc;
     background: #3268784d;
     `};

    ${safeText};
`;

export const TagIcon = styled.img`
    cursor: pointer;
    width: 14px;
    aspect-ratio: 1 / 1;
`;

export const TagsContainer = styled.div<{$fullWidth?: boolean; $oneLine?: boolean}>`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
    ${({$fullWidth}) =>
        $fullWidth
            ? `width: 100%`
            : `
    width: auto;
    max-width: calc(100% - ${MENU_SIZE} - 2px); /* card - menu - gap */
    `};

    overflow: hidden;

    ${({$oneLine}) =>
        $oneLine &&
        `
        flex-wrap: nowrap;
        white-space: nowrap;
        overflow: hidden;
        height: 15px;
    `}
`;
