import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { StyledRowWrapper } from "./StyledRowWrapper";
import { MarqueeLabel } from "../../common/MarqueeLabel";
import { NumericInput } from "../../common/NumericInput";
import { Tooltip } from "../../common/Tooltip";

interface Props {
    width?: string;
    min?: number;
    max?: number;
    label: string;
    value: number;
    setValue: (value: number) => void;
    onBlur?: (value: number) => void;
    disabled?: boolean;
    $margin?: string;
    unit?: string;
    rightAlign?: boolean;
    padding?: string;
    dragStep?: number;
    tooltipText?: string;
    enableDragging?: boolean;
    decimalPlaces?: number;
    labelTooltip?: React.ReactNode;
    anchorRef?: React.RefObject<HTMLElement>;
}

export const NumericInputRow = ({
    label,
    value,
    setValue,
    onBlur,
    width,
    min,
    max,
    disabled,
    $margin,
    unit,
    rightAlign,
    padding,
    dragStep,
    enableDragging,
    decimalPlaces,
    labelTooltip,
    anchorRef,
}: Props) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isInResizableWrapper, setIsInResizableWrapper] = useState(false);

    useEffect(() => {
        if (wrapperRef.current) {
            const found = wrapperRef.current.closest(".resizable_wrapper");
            setIsInResizableWrapper(!!found);
        }
    }, []);

    return (
        <Wrapper ref={wrapperRef}
            $isInResizableWrapper={isInResizableWrapper}
            $margin={$margin}
            $width={width}
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
                <MarqueeLabel className="text">{label}</MarqueeLabel>
            }
            <NumericInput
                width={width}
                value={value}
                setValue={setValue}
                onBlur={onBlur}
                min={min}
                max={max}
                disabled={disabled}
                unit={unit}
                rightAlign={rightAlign}
                padding={padding}
                dragStep={dragStep}
                enableDragging={enableDragging}
                decimalPlaces={decimalPlaces}
            />
        </Wrapper>
    );
};

const Wrapper = styled(StyledRowWrapper)<{$isInResizableWrapper?: boolean; $width?: string}>`
    .text {
        text-wrap: nowrap;
    }
    .numericInputWrapper {
        width: ${({$width}) => $width ? $width : "120px"};
        min-width: ${({$width}) => $width ? $width : "120px"};
        max-width: ${({$width}) => $width ? $width : "120px"};
        flex-shrink: 0;
        margin-left: auto;
        input {
            width: 100%;
        }
    }

    ${({$isInResizableWrapper}) =>
        $isInResizableWrapper &&
        `
        .numericInputWrapper {
            width: 28%;
            min-width: unset;
            max-width: unset;
        }
    `};
`;
