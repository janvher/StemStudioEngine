import {useCallback, useRef} from "react";
import {createPortal} from "react-dom";
import {HiOutlineXMark} from "react-icons/hi2";
import styled from "styled-components";

import i18n from "@stem/editor-oss/i18n/config";
import {
    FloatingPanelCloseButton,
    FloatingPanelContainer,
    FloatingPanelHeader,
    FloatingPanelOverlay,
    FloatingPanelTitle,
} from "../common/FloatingPanelShell";
import {useEscapeDismiss} from "../common/hooks/useEscapeDismiss";

export type CameraOrientation = "default" | "top" | "side" | "custom";

interface CameraOrientationPanelProps {
    anchorRef: React.RefObject<HTMLElement | null>;
    onClose: () => void;
    onSelect: (orientation: CameraOrientation) => void;
    activeOrientation: CameraOrientation;
}

const Popover = styled(FloatingPanelContainer)`
    width: 200px;
`;

const Row = styled.div<{$active?: boolean}>`
    display: flex;
    align-items: center;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
    color: #ccc;
    background: ${({$active}) => ($active ? "#2a2d2e" : "transparent")};
    &:hover {
        background: #2a2d2e;
    }
    &:last-child {
        border-radius: 0 0 6px 6px;
    }
`;

const PRESETS: {key: CameraOrientation; label: string}[] = [
    {key: "default", label: "Default (Perspective)"},
    {key: "top", label: "Top Down"},
    {key: "side", label: "Side View"},
];

export const CameraOrientationPanel = ({anchorRef, onClose, onSelect, activeOrientation}: CameraOrientationPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const ownerDoc = anchorRef.current?.ownerDocument ?? document;
    const ownerWin = ownerDoc.defaultView ?? window;

    const getPosition = useCallback(() => {
        const anchor = anchorRef.current;
        if (!anchor) return {top: 100, left: 100};
        const rect = anchor.getBoundingClientRect();
        let top = rect.top - 6; // position above
        let left = rect.left + rect.width / 2 - 100; // center horizontally
        if (left < 8) left = 8;
        if (left + 200 > ownerWin.innerWidth) left = ownerWin.innerWidth - 208;
        // Measure panel height (header ~33 + 3 rows ~30 each = ~123)
        const estimatedHeight = 130;
        top -= estimatedHeight;
        if (top < 8) top = rect.bottom + 6; // flip below if no room above
        return {top, left};
    }, [anchorRef, ownerWin]);

    const pos = getPosition();

    useEscapeDismiss({onEscape: onClose, ownerWindow: ownerWin});

    return createPortal(
        <>
            <FloatingPanelOverlay onClick={onClose} />
            <Popover ref={panelRef}
                style={{top: pos.top, left: pos.left}}
            >
                <FloatingPanelHeader>
                    <FloatingPanelTitle>{i18n.t("Camera View")}</FloatingPanelTitle>
                    <FloatingPanelCloseButton onClick={onClose}>
                        <HiOutlineXMark width={14}
                            height={14}
                        />
                    </FloatingPanelCloseButton>
                </FloatingPanelHeader>
                {PRESETS.map(p =>
                    <Row
                        key={p.key}
                        $active={activeOrientation === p.key}
                        onClick={() => {
                            onSelect(p.key);
                            onClose();
                        }}
                    >
                        {i18n.t(p.label)}
                    </Row>,
                )}
            </Popover>
        </>,
        ownerDoc.body,
    );
};
