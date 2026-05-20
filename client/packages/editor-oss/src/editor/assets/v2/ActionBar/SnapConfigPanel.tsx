import {useCallback, useRef} from "react";
import {createPortal} from "react-dom";
import {HiOutlineArrowTopRightOnSquare, HiOutlineXMark} from "react-icons/hi2";
import styled from "styled-components";

import {
    FloatingPanelCloseButton,
    FloatingPanelContainer,
    FloatingPanelHeader,
    FloatingPanelOverlay,
    FloatingPanelTitle,
} from "../common/FloatingPanelShell";
import {useEscapeDismiss} from "../common/hooks/useEscapeDismiss";

interface SnapConfigPanelProps {
    anchorRef: React.RefObject<HTMLElement | null>;
    onClose: () => void;
    onSelect: (value: number) => void;
    activeValue: number;
    showMetricLabels: boolean;
    onOpenSettings: () => void;
}

const Popover = styled(FloatingPanelContainer)`
    width: 220px;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 8px 12px 10px;
`;

const Footer = styled.div`
    padding: 0 12px 12px;
`;

const PresetBtn = styled.button<{$active?: boolean}>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 0;
    font-size: 11px;
    color: ${({$active}) => ($active ? "#fff" : "#ccc")};
    background: ${({$active}) => ($active ? "#2a5db0" : "#2a2d2e")};
    border: 1px solid ${({$active}) => ($active ? "#3a7de0" : "#444")};
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        background: ${({$active}) => ($active ? "#2a5db0" : "#333")};
    }
`;

const FooterButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px;
    font-size: 12px;
    color: #e0e0e0;
    background: #25282a;
    border: 1px solid #444;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background: #2d3133;
    }
`;

const PRESETS = [
    {value: 0.001, metricLabel: "1 mm", defaultLabel: "0.001"},
    {value: 0.01, metricLabel: "1 cm", defaultLabel: "0.01"},
    {value: 0.1, metricLabel: "0.1 m", defaultLabel: "0.1"},
    {value: 0.25, metricLabel: "0.25 m", defaultLabel: "0.25"},
    {value: 0.5, metricLabel: "0.5 m", defaultLabel: "0.5"},
    {value: 1, metricLabel: "1 m", defaultLabel: "1"},
    {value: 3, metricLabel: "3 m", defaultLabel: "3"},
    {value: 10, metricLabel: "10 m", defaultLabel: "10"},
];

export const SnapConfigPanel = ({
    anchorRef,
    onClose,
    onSelect,
    activeValue,
    showMetricLabels,
    onOpenSettings,
}: SnapConfigPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const ownerDoc = anchorRef.current?.ownerDocument ?? document;
    const ownerWin = ownerDoc.defaultView ?? window;

    const getPosition = useCallback(() => {
        const anchor = anchorRef.current;
        if (!anchor) return {top: 100, left: 100};
        const rect = anchor.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - 110;
        if (left < 8) left = 8;
        if (left + 220 > ownerWin.innerWidth) left = ownerWin.innerWidth - 228;
        const estimatedHeight = 150;
        let top = rect.top - 6 - estimatedHeight;
        if (top < 8) top = rect.bottom + 6;
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
                    <FloatingPanelTitle>Grid Snap</FloatingPanelTitle>
                    <FloatingPanelCloseButton onClick={onClose}>
                        <HiOutlineXMark width={14}
                            height={14}
                        />
                    </FloatingPanelCloseButton>
                </FloatingPanelHeader>
                <Grid>
                    {PRESETS.map(v =>
                        <PresetBtn
                            key={v.value}
                            $active={activeValue === v.value}
                            onClick={() => {
                                onSelect(v.value);
                                onClose();
                            }}
                        >
                            {showMetricLabels ? v.metricLabel : v.defaultLabel}
                        </PresetBtn>,
                    )}
                </Grid>
                <Footer>
                    <FooterButton
                        onClick={() => {
                            onOpenSettings();
                            onClose();
                        }}
                    >
                        Snap settings
                        <HiOutlineArrowTopRightOnSquare width={14}
                            height={14}
                        />
                    </FooterButton>
                </Footer>
            </Popover>
        </>,
        ownerDoc.body,
    );
};
