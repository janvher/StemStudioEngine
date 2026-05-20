import React, {useState, useRef, useCallback, ReactNode, useEffect} from "react";

import {ResizeHandle} from "./ResizableSettingsPanel.style";
import global from "@stem/editor-oss/global";
import {RightPanel as SettingsPanel} from "../../CodeEditor/CodeEditor.style";

interface ResizableSettingsPanelProps {
    children: ReactNode;
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
}

export const ResizableSettingsPanel: React.FC<ResizableSettingsPanelProps> = ({
    children,
    initialWidth = 400,
    minWidth = 196,
    maxWidth = 600,
    className,
}) => {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    // Reset width when initialWidth prop changes (e.g. pin/unpin toggle).
    useEffect(() => {
        setWidth(initialWidth);
    }, [initialWidth]);

    useEffect(() => {
        const handleResize = () => {
            const tree = document.querySelector("#resizableFileTree");
            global.app?.call("resizeCodeEditor", null, {
                width: window.innerWidth - width - (tree?.clientWidth || 0),
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [width]);

    const handleDoubleClick = useCallback(() => {
        setWidth(initialWidth);
        const tree = document.querySelector("#resizableFileTree");
        global.app?.call("resizeCodeEditor", null, {
            width: window.innerWidth - initialWidth - (tree?.clientWidth || 0),
        });
    }, [initialWidth]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            startX.current = e.clientX;
            startWidth.current = width;
            const doc = (e.currentTarget as HTMLElement).ownerDocument;
            const ownerWin = doc.defaultView ?? window;
            const tree = doc.querySelector("#resizableFileTree");
            let newWidth = width;

            const handleMouseMove = (e: MouseEvent) => {
                const deltaX = startX.current - e.clientX; // Reverse the delta for left side resize
                newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + deltaX));
                setWidth(newWidth);
                global.app?.call("resizeCodeEditor", null, {
                    width: ownerWin.innerWidth - newWidth - (tree?.clientWidth || 0),
                });
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                doc.removeEventListener("mousemove", handleMouseMove);
                doc.removeEventListener("mouseup", handleMouseUp);
                global.app?.call("resizeCodeEditor", null, {
                    width: ownerWin.innerWidth - newWidth - (tree?.clientWidth || 0),
                });
            };

            doc.addEventListener("mousemove", handleMouseMove);
            doc.addEventListener("mouseup", handleMouseUp);
        },
        [width, minWidth, maxWidth],
    );

    return (
        <SettingsPanel
            id={"resizableSettingsPanel"}
            className={className}
            style={{width: `${width}px`, maxWidth: "100%", flexShrink: 0, position: "relative"}}
        >
            <ResizeHandle
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                $isResizing={isResizing}
            />
            {children}
        </SettingsPanel>
    );
};
