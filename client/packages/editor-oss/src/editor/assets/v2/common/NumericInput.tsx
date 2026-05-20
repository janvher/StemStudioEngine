import React, {useEffect, useRef, useState} from "react";
import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";
import {isInputActive} from "../utils/isInputActive";

interface Props {
    value: number;
    setValue: (value: number) => void;
    className?: string;
    onBlur?: (value: number) => void;
    disabled?: boolean;
    min?: number;
    max?: number;
    width?: string;
    height?: string;
    decimalPlaces?: number;
    unit?: string;
    padding?: string;
    rightAlign?: boolean;
    dragStep?: number;
    enableDragging?: boolean;
    onDragValueChange?: (value: number) => void;
    id?: string;
}

export const NumericInput = ({
    value,
    setValue,
    className,
    onBlur,
    disabled,
    min,
    max,
    width,
    height,
    decimalPlaces,
    unit,
    padding,
    rightAlign,
    dragStep = 0.1,
    enableDragging = true,
    onDragValueChange,
    id,
}: Props) => {
    const [inputValue, setInputValue] = useState<string>(value?.toString() || "0");
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [startMouseX, setStartMouseX] = useState<number | null>(null);
    const [initialValue, setInitialValue] = useState<number>(value);
    const [isDraggingInProgress, setIsDraggingInProgress] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const unitRef = useRef<HTMLSpanElement>(null);
    const [unitWidth, setUnitWidth] = useState(0);

    useEffect(() => {
        if (unitRef.current) {
            setUnitWidth(unitRef.current.offsetWidth);
        } else {
            setUnitWidth(0);
        }
    }, [unit]);

    const setSafeValue = () => {
        if (inputValue === "" || isNaN(Number(inputValue))) {
            const newValue = min || 0;
            if (value !== newValue) {
                setValue(newValue);
            }
            setInputValue(min ? min.toString() : "0");
        } else {
            const inputValueNum = Number(inputValue);
            if (max !== undefined && inputValueNum > max) {
                if (value !== max) {
                    setValue(max);
                }
                setInputValue(max.toString());
            } else if (min !== undefined && inputValueNum <= min) {
                if (value !== min) {
                    setValue(min);
                }
                setInputValue(min.toString());
            } else {
                if (value !== inputValueNum) {
                    setValue(inputValueNum);
                }
                setInputValue(inputValue);
            }
        }
    };

    const handleBlur = () => {
        let value;
        setSafeValue();
        value = Number(inputValue);

        onBlur?.(value);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;
        newValue = newValue.replace(/,/g, ".");

        const regex = /^-?(\d+([.,]\d{0,})?)?$/;

        if (
            newValue.includes(".") &&
            (decimalPlaces || decimalPlaces === 0) &&
            (newValue.split(".")[1]?.length || 0) > decimalPlaces
        ) {
            e.preventDefault();
            return;
        }

        if (regex.test(newValue)) {
            setInputValue(newValue);

            if (
                newValue !== "" &&
                !isNaN(Number(newValue)) &&
                !newValue.endsWith(".") &&
                newValue !== "-" &&
                newValue !== "-0"
            ) {
                setValue(Number(newValue));
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
        }

        let step = e.shiftKey ? 10 : 1;
        let currentValue = Number(inputValue) || 0;

        let newValue = currentValue;

        if (e.key === "ArrowUp") {
            newValue += step;
        } else if (e.key === "ArrowDown") {
            newValue -= step;
        } else {
            return;
        }

        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;

        setValue(newValue);
        setInputValue(newValue.toString());

        e.preventDefault();
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
        if (disabled || !enableDragging) return;

        if (document.activeElement !== inputRef.current) {
            e.preventDefault();

            setIsDragging(true);
            setStartMouseX(e.clientX);
            setInitialValue(value);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || startMouseX === null || document.activeElement === inputRef.current) return;

        if (Math.abs(e.clientX - startMouseX) < 2) return;

        if (isInputActive()) {
            (document.activeElement as HTMLInputElement).blur();
        }

        document.body.style.cursor = "ew-resize";
        setIsDraggingInProgress(true);

        const difference = e.clientX - startMouseX;
        const changeAmount = difference * dragStep;

        let newValue = initialValue + changeAmount;

        const factor = Math.pow(10, decimalPlaces || 4);
        newValue = Math.round((newValue + Number.EPSILON) * factor) / factor;

        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;

        setValue(newValue);
        setInputValue(newValue.toString());

        onDragValueChange?.(newValue);
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (isDragging) {
            setIsDraggingInProgress(false);
            setIsDragging(false);
            setStartMouseX(null);

            document.body.style.cursor = "default";
        }

        if (e?.x === startMouseX) {
            const input = inputRef.current;
            if (input) {
                input.focus();
                input.selectionStart = 0;
                input.selectionEnd = input.value.length;
            }
        }
    };
    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, startMouseX, initialValue]);

    useEffect(() => {
        setInputValue(value?.toString() || "0");
    }, [value]);

    return (
        <Wrapper className="numericInputWrapper">
            <StyledInput
                ref={inputRef}
                $width={width}
                $height={height}
                $paddingRight={unitWidth ? `${unitWidth + 9}px` : undefined}
                className={`${className} NumericInput`}
                type="text"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onMouseDown={handleMouseDown}
                disabled={!!disabled}
                $padding={padding}
                $unit={unit}
                $rightAlign={rightAlign}
                $isDragging={isDraggingInProgress}
                id={id}
            />
            {unit && <Unit ref={unitRef}>{unit}</Unit>}
        </Wrapper>
    );
};

const Wrapper = styled.div`
    ${flexCenter};
    position: relative;
`;

const StyledInput = styled.input<{
    $width?: string;
    $height?: string;
    $padding?: string;
    $unit?: string;
    $rightAlign?: boolean;
    $isDragging?: boolean;
    $paddingRight?: string;
}>`
    width: ${({$width}) => $width || "63px"};
    height: ${({$height}) => $height || "24px"};
    border: none;
    border-radius: 8px;
    background-color: var(--theme-input-background-color);
    ${regularFont("s")};
    color: var(--theme-font-input-color);
    cursor: auto;
    padding: ${({$padding, $unit}) => $padding || ($unit ? "6px 14px 6px 7px" : "6px 7px")};
    padding-right: ${({$paddingRight, $padding}) => $paddingRight ? $paddingRight : $padding ? $padding : "7px"};

    ${({$rightAlign}) => $rightAlign && `text-align: right;`};
    ${({$isDragging}) => $isDragging && `cursor: ew-resize;`};

    &:disabled {
        cursor: default !important;
    }
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    &[type="number"] {
        -moz-appearance: textfield;
    }
`;

const Unit = styled.span`
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    color: #0284c7 !important;
    font-weight: var(--theme-font-regular);
    font-size: var(--theme-font-size-s);
`;
