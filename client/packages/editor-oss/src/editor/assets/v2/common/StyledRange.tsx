import {useEffect, useRef, useState} from "react";
import styled from "styled-components";

const InputWraper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
`;

const RangeRight = styled.div<{ width: number }>`
    position: absolute;
    top: 50%;
    right: 0;
    background: var(--theme-grey-bg);
    z-index: 1;
    height: 6px;
    width: ${({ width }) => width}%;
    transform: translateY(-50%);
    width: ${({ width }) => Math.min(width, 100)}%;
    pointer-events: none;
    border-top-right-radius: 1px;
    border-bottom-right-radius: 1px;
`;

export const RangeInput = styled.input<{ $isFirefox: boolean }>`
    width: 100%;
    max-width: 100%;
    overflow-x: clip;
    display: block;
    margin: 0;
    position: relative;

    ${({ $isFirefox }) =>
        !$isFirefox &&
        `
        border-radius: 20px;
        appearance: none;
        background: transparent;
        height: 28px;
    `}

    ${({ $isFirefox }) =>
        $isFirefox &&
        `
        padding: 8px 0;
    `}

    &::-webkit-slider-runnable-track {
        background-color: #0284c7;
        height: 5px;
        border: none;
        border-radius: 2px;
    }

    &::-ms-track {
        background-color: #0284c7;
        height: 5px;
        border: none;
        border-radius: 2px;
        color: transparent;
    }

    &::-webkit-slider-thumb {
        appearance: none;
        height: 10px;
        width: 10px;
        border-radius: 50%;
        background-color: #0284c7;
        margin: auto 0;
        top: 50%;
        transform: translateY(-50%);
        position: relative;
        z-index: 5;
    }

    &::-ms-thumb {
        height: 10px;
        width: 10px;
        border-radius: 50%;
        background-color: #0284c7;
        border: none;
        cursor: pointer;
        margin: auto 0;
        top: 50%;
        transform: translateY(-50%);
        position: relative;
        z-index: 5;
    }
`;
type Props = {
    value: number;
    setValue: (value: number) => void;
    setValueComplete?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
};

export const StyledRange = ({value, setValue, setValueComplete, min = 0, max = 1, step = 0.01}: Props) => {
    const [localValue, setLocalValue] = useState(value);
    const isDraggingRef = useRef(false);

    // Update local value when external value changes
    useEffect(() => {
        if (!isDraggingRef.current) {
            setLocalValue(value);
        }
    }, [value]);

    const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
        const newValue = parseFloat((event.target as HTMLInputElement).value);
        // Update only local state for smooth UI during drag
        setLocalValue(newValue);
        setValue(newValue);
        isDraggingRef.current = true;
    };

    const handleMouseUp = () => {
        if (isDraggingRef.current && setValueComplete) {
            // Call setValueComplete only when mouse is released
            setValueComplete(localValue);
            isDraggingRef.current = false;
        }
    };

    const calculateRightRange = (value: number) => {
        const valuesDifference = max - min;
        const valueInPercent = (value - min) / valuesDifference * 100;
        const rightRangeWidth = 100 - valueInPercent;

        return Math.max(rightRangeWidth, 0);
    };

    const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");

    const handleMouseDown = () => {
        isDraggingRef.current = true;
    };

    useEffect(() => {
        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("touchend", handleMouseUp);

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("touchend", handleMouseUp);
        };
    }, [localValue, setValueComplete]);

    return (
        <InputWraper onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            className="rangeWrapper"
        >
            <RangeInput
                type="range"
                min={min}
                max={max}
                step={step}
                value={localValue}
                onInput={handleInput}
                $isFirefox={isFirefox}
            />
            {!isFirefox && <RangeRight width={calculateRightRange(localValue)} />}
        </InputWraper>
    );
};
