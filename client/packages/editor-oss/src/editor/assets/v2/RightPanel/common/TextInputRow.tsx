import React from "react";
import styled from "styled-components";

import {StyledRowWrapper} from "./StyledRowWrapper";
import {StyledTextarea} from "../../common/StyledTextarea";
import {TextInput} from "../../common/TextInput";
import {Tooltip} from "../../common/Tooltip";

interface Props {
    width?: string;
    height?: string;
    label: string;
    value: string;
    setValue: (value: string) => void;
    margin?: string;
    type?: "input" | "textarea";
    isColumn?: boolean;
    color?: string;
    placeholder?: string;
    labelTooltip?: React.ReactNode;
    anchorRef?: React.RefObject<HTMLElement>;
    onEnter?: () => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement, Element>) => void;
}

export const TextInputRow = ({
    label,
    value,
    setValue,
    width,
    height,
    margin,
    type,
    isColumn,
    color,
    placeholder,
    labelTooltip,
    anchorRef,
    onEnter,
    onBlur,
}: Props) => {
    const fallback = () => setValue(value);
    return (
        <Wrapper
            $margin={margin}
            $isColumn={isColumn}
            $color={color}
            $width={width}
        >
            {labelTooltip ? (
                <Tooltip
                    content={labelTooltip}
                    stayOpenOnHover
                    maxWidth="360px"
                    placement="left-of-anchor"
                    anchorRef={anchorRef}
                    triggerFullWidth={false}
                    offsetX={-10}
                >
                    <span className="text">{label}</span>
                </Tooltip>
            ) : (
                <span className="text">{label}</span>
            )}
            {type === "textarea" ? (
                <StyledTextarea
                    width={width}
                    value={value}
                    setValue={setValue}
                    height={height}
                    placeholder={placeholder}
                    onBlur={() => setValue(value)}
                />
            ) : (
                <TextInput
                    width={width}
                    value={value}
                    setValue={setValue}
                    onBlur={onBlur ?? fallback}
                    onEnter={onEnter ?? fallback}
                    height={height}
                    placeholder={placeholder}
                />
            )}
        </Wrapper>
    );
};

const Wrapper = styled(StyledRowWrapper)<{$width?: string}>`
    .text {
        text-wrap: nowrap;
        flex-shrink: 0;
    }
    .TextInput {
        width: ${({$width}) => ($width ? $width : "120px")};
        min-width: ${({$width}) => ($width ? $width : "120px")};
        max-width: ${({$width}) => ($width ? $width : "120px")};
        flex-shrink: 0;
        margin-left: auto;
    }
`;
