import React, {useState, useRef, useCallback} from "react";

import {FileTreeContainer, ResizeHandle} from "./ResizableFileTree.style";
import global from "@stem/editor-oss/global";

interface ResizableFileTreeProps {
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
    children?: React.ReactNode;
}

export const ResizableFileTree: React.FC<ResizableFileTreeProps> = ({
    initialWidth = 200,
    minWidth = 150,
    maxWidth = 600,
    className,
    children,
}) => {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            startX.current = e.clientX;
            startWidth.current = width;
            let newWidth = width;
            const doc = (e.currentTarget as HTMLElement).ownerDocument;
            const ownerWin = doc.defaultView ?? window;

            const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX.current; // Normal delta for right side resize
                newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + deltaX));
                setWidth(newWidth);

                // Notify CodeEditor about the resize
                const settingsPanel = doc.querySelector("#resizableSettingsPanel");
                const settingsPanelWidth = settingsPanel?.clientWidth || 0;
                global.app?.call("resizeCodeEditor", null, {
                    width: ownerWin.innerWidth - newWidth - settingsPanelWidth,
                });
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                doc.removeEventListener("mousemove", handleMouseMove);
                doc.removeEventListener("mouseup", handleMouseUp);

                // Final resize notification
                const settingsPanel = doc.querySelector("#resizableSettingsPanel");
                const settingsPanelWidth = settingsPanel?.clientWidth || 0;
                global.app?.call("resizeCodeEditor", null, {
                    width: ownerWin.innerWidth - newWidth - settingsPanelWidth,
                });
            };

            doc.addEventListener("mousemove", handleMouseMove);
            doc.addEventListener("mouseup", handleMouseUp);
        },
        [width, minWidth, maxWidth],
    );

    return (
        <FileTreeContainer id="resizableFileTree"
            className={className}
            style={{width: `${width}px`}}
        >
            {children}
            <ResizeHandle onMouseDown={handleMouseDown}
                $isResizing={isResizing}
            />
        </FileTreeContainer>
    );
};
