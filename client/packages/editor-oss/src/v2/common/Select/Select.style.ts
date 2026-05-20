import {Combobox} from "@headlessui/react";
import styled from "styled-components";

import {flexCenter, regularFont} from "../../../assets/style";

export const StyledCombobox = styled.div<{$width?: string}>`
    display: flex;
    width: ${({$width}) => $width ? $width : "100%"};
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    pointer-events: all;
`;

export const SelectInput = styled(Combobox.Input)<{$height?: string; $fontSize?: string}>`
    width: 100%;
    height: ${({$height}) => $height ? $height : "32px"};
    border: none;
    border-radius: 8px;
    background-color: var(--theme-homepage-grey-bg-primary);
    ${regularFont("s")};
    font-size: ${({$fontSize}) => $fontSize ? $fontSize : "12px"};
    color: var(--theme-font-unselected-secondary-color);
    padding: 8px 24px 8px 12px;
    cursor: pointer;
    pointer-events: all;
`;

export const SelectButton = styled(Combobox.Button)`
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 16px;
    width: 16px;
    right: 8px;
    z-index: 5;
    background: transparent;
    color: #fff;
    cursor: pointer;
    outline: none;
    border: none;
    pointer-events: all;
    ${flexCenter};
`;

export const SelectOptions = styled(Combobox.Options)<{$showListOnTop?: boolean}>`
    position: absolute;
    ${({$showListOnTop}) => !$showListOnTop ? "top: 28px;" : "bottom: 100%;"}
    left: 0;
    width: 100%;
    background-color: var(--theme-homepage-grey-bg-primary);
    border-radius: 0px;
    z-index: 10;
    padding: 0;
    box-sizing: border-box;
    margin-top: 0;
    max-height: 200px;
    overflow: auto;
    pointer-events: all;
`;

export const SelectOption = styled(Combobox.Option)`
    width: 100%;
    min-height: 32px;
    border: none;
    background-color: transparent;
    font-size: var(--theme-font-size-s);
    font-weight: var(--theme-font-regular);
    color: var(--theme-font-unselected-secondary-color);
    line-height: 120%;
    padding: 6px 7px 6px 14px;
    list-style: none;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
    transition: all 0.3s ease-in-out;
    cursor: pointer;
    pointer-events: all;
    &:hover {
        background-color: #435a70;
    }
`;
