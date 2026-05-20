import {useEffect, useState} from "react";
import styled from "styled-components";

import {regularFont} from "../../../../assets/style";

interface Props {
    symbol: string;
    setValue: (value: number) => void;
    onMouseUp?: () => void;
    value: number;
    isLocked: boolean;
    dragStep?: number;
    decimalPlaces?: number;
}

export const InputSymbol = ({symbol, setValue, value, isLocked, dragStep = 0.1, decimalPlaces, onMouseUp}: Props) => {
    const [isDragging, setIsDragging] = useState(false);
    const [prevX, setPrevX] = useState<number | null>(null);

    useEffect(() => {
        if (isLocked) return;
        const handleMouseMove = (event: MouseEvent) => {
            if (isDragging) {
                document.body.style.cursor = "ew-resize";
                const currentX = event.clientX;
                if (prevX !== null) {
                    const diff = currentX - prevX;
                    const changeAmount = diff * dragStep;

                    let newValue = value + changeAmount;

                    const factor = Math.pow(10, decimalPlaces || 4);
                    newValue = Math.round((newValue + Number.EPSILON) * factor) / factor;

                    setValue(newValue);
                }
                setPrevX(currentX);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = "auto";
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            onMouseUp?.();
        };

        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.body.style.cursor = "auto";
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isLocked]);

    const handleMouseDown = (event: React.MouseEvent) => {
        if (isLocked) return;
        setIsDragging(true);
        setPrevX(event.clientX);
        document.body.style.cursor = "ew-resize";
    };

    return (
        <Symbol
            onMouseDown={handleMouseDown}
            $isDragging={isDragging}
            $isLocked={isLocked}
        >
            {symbol}
        </Symbol>
    );
};

const Symbol = styled.div<{$isDragging: boolean; $isLocked: boolean}>`
    position: absolute;
    z-index: 1;
    left: 0;
    top: 50%;
    transform: translateY(-45%);
    padding-left: 6px;
    ${regularFont("s")};
    color: var(--theme-container-main-blue);
    font-weight: var(--theme-font-bold);

    ${({$isLocked}) =>
        !$isLocked &&
        `
        &:hover {
            cursor: ew-resize;
        }
    `}

    ${({$isDragging}) =>
        $isDragging &&
        `
    cursor: ew-resize;
  `}
`;
