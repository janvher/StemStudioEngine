import React from "react";
import styled, {type CSSProperties} from "styled-components";

import {StyledRowWrapper} from "./StyledRowWrapper";
import {BasicCombobox, Item} from "../../common/BasicCombobox/BasicCombobox";
import {BasicComboboxNoPortal} from "../../common/BasicCombobox/BasicComboboxNoPortal";
import {MarqueeLabel} from "../../common/MarqueeLabel";
import {Tooltip} from "../../common/Tooltip";

interface Props {
    data: Item[];
    value?: Item;
    onChange: (selectedData: Item) => void;
    label: string;
    $margin?: string;
    showListOnTop?: boolean;
    disableTyping?: boolean;
    width?: string;
    noPortal?: boolean;
    style?: CSSProperties;
    labelTooltip?: React.ReactNode;
    anchorRef?: React.RefObject<HTMLElement>;
}

export const SelectRow = ({
    data,
    value,
    onChange,
    label,
    $margin,
    showListOnTop,
    width,
    disableTyping,
    noPortal,
    style,
    labelTooltip,
    anchorRef,
}: Props) => {
    return (
        <Wrapper
            $margin={$margin}
            $width={width}
            style={style}
            className="SelectRowWrapper"
        >
            {labelTooltip ?
                <Tooltip
                    content={labelTooltip}
                    stayOpenOnHover
                    maxWidth="360px"
                    placement="left-of-anchor"
                    anchorRef={anchorRef}
                    triggerFullWidth={false}
                    offsetX={-10}
                >
                    <MarqueeLabel className="text">{label}</MarqueeLabel>
                </Tooltip>
             :
                label && <MarqueeLabel className="text">{label}</MarqueeLabel>
            }
            {noPortal ? 
                <BasicComboboxNoPortal
                    showListOnTop={showListOnTop}
                    data={data}
                    value={value}
                    onChange={onChange}
                    disableTyping={disableTyping}
                />
             : 
                <BasicCombobox
                    showListOnTop={showListOnTop}
                    data={data}
                    value={value}
                    onChange={onChange}
                    disableTyping={disableTyping}
                />
            }
        </Wrapper>
    );
};

const Wrapper = styled(StyledRowWrapper)<{$margin?: string; $width?: string}>`
    ${({$margin}) => $margin ? `margin: ${$margin}` : `margin-bottom: 0px;`};

    .text {
        text-wrap: nowrap;
    }
    .StyledCombobox {
        width: ${({$width}) => $width ? $width : "120px"};
        min-width: ${({$width}) => $width ? $width : "120px"};
        max-width: ${({$width}) => $width ? $width : "120px"};
        flex-shrink: 0;
        margin-left: auto;
        .combobox-input {
            padding: 6px 24px 6px 6px;
        }
    }
`;
