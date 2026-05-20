import { CSSProperties, ReactNode, useCallback, useRef, useState } from "react";
import styled from "styled-components";

interface ResizableWrapperProps {
    children: ReactNode;
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number | (() => number);
    className?: string;
    style?: CSSProperties;
    onResize?: (width: number) => void;
    storageKey?: string;
}

export const ResizableWrapper: React.FC<ResizableWrapperProps> = ({
    children,
    initialWidth = 300,
    minWidth = 240,
    maxWidth = 600,
    onResize,
    className,
    style,
    storageKey,
}) => {
    const storedWidth = storageKey
        ? Math.max(minWidth, Number(localStorage.getItem(storageKey) ?? initialWidth))
        : initialWidth;

    const [width, setWidth] = useState(storedWidth);
    const [isResizing, setIsResizing] = useState(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startX.current = e.clientX;
        startWidth.current = width;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = startX.current - e.clientX;

            const computedMaxWidth =
                typeof maxWidth === "function" ? maxWidth() : maxWidth ?? Infinity;

            const newWidth = Math.max(minWidth, Math.min(computedMaxWidth, startWidth.current + deltaX));
            setWidth(newWidth);

            if (onResize) onResize(newWidth);

            if (storageKey) {
                localStorage.setItem(storageKey, newWidth.toString());
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [width, minWidth, maxWidth, onResize, storageKey]);


    return (
        <div
            className={`resizable_wrapper ${className}`}
            style={{ width, position: "relative", cursor: isResizing ? "ew-resize" : "default", ...style }}
        >
            <ResizeHandle $isResizing={isResizing}
                onMouseDown={handleMouseDown}
            />
            {children}
        </div>
    );
};


export const ResizeHandle = styled.div<{ $isResizing: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  width: 10px;
  height: 100%;
  cursor: ew-resize;
  background: rgba(0,0,0,0.01);
  pointer-events: all;
  z-index: 10;
  transition: background 0.2s ease;
`;