import React, {useMemo} from "react";
import {HiXMark} from "react-icons/hi2";

import {
    PanelContainer,
    PanelHeader,
    PanelTitle,
    CloseButton,
    ResultsBody,
    MatchLine,
    LineNumber,
    MatchText,
} from "../AssetsLibrary/CodeEditor/SearchResultsPanel/SearchResultsPanel.style";
import styled from "styled-components";
import {regularFont} from "../../../../assets/style";

// Re-use the marker shape from structureValidation / importerValidation
interface ValidationMarker {
    severity: "Error" | "Warning" | "Info";
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    message: string;
}

interface Props {
    markers: ValidationMarker[];
    onNavigate: (line: number, col: number) => void;
    onClose: () => void;
}

// --- Severity styling --------------------------------------------------------

const SEVERITY_COLORS: Record<string, string> = {
    Error: "#f87171",
    Warning: "#fbbf24",
    Info: "#60a5fa",
};

const SEVERITY_ORDER: Record<string, number> = {Error: 0, Warning: 1, Info: 2};

const SeverityDot = styled.span<{$color: string}>`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
    margin-right: 6px;
`;

const SummaryBadge = styled.span`
    ${regularFont("xs")};
    color: #a1a1aa;
    margin-left: auto;
    white-space: nowrap;
`;

const LocationText = styled.span`
    ${regularFont("xs")};
    color: #666;
    flex-shrink: 0;
    margin-right: 8px;
`;

// -----------------------------------------------------------------------------

const ValidationResultsPanel: React.FC<Props> = ({markers, onNavigate, onClose}) => {
    const sorted = useMemo(
        () =>
            [...markers].sort(
                (a, b) =>
                    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
                    a.startLineNumber - b.startLineNumber,
            ),
        [markers],
    );

    const summary = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const m of markers) {
            counts[m.severity] = (counts[m.severity] || 0) + 1;
        }
        const parts: string[] = [];
        if (counts.Error) parts.push(`${counts.Error} error${counts.Error > 1 ? "s" : ""}`);
        if (counts.Warning) parts.push(`${counts.Warning} warning${counts.Warning > 1 ? "s" : ""}`);
        if (counts.Info) parts.push(`${counts.Info} info`);
        return parts.join(", ");
    }, [markers]);

    return (
        <PanelContainer>
            <PanelHeader>
                <PanelTitle>Problems</PanelTitle>
                <SummaryBadge>{summary}</SummaryBadge>
                <CloseButton onClick={onClose}>
                    <HiXMark size={14} />
                </CloseButton>
            </PanelHeader>
            <ResultsBody>
                {sorted.map((m, i) => (
                    <MatchLine
                        key={i}
                        onClick={() => onNavigate(m.startLineNumber, m.startColumn)}
                    >
                        <SeverityDot $color={SEVERITY_COLORS[m.severity] || "#a1a1aa"} />
                        <LocationText>
                            [{m.startLineNumber}:{m.startColumn}]
                        </LocationText>
                        <MatchText style={{color: SEVERITY_COLORS[m.severity] || undefined}}>
                            {m.message}
                        </MatchText>
                    </MatchLine>
                ))}
            </ResultsBody>
        </PanelContainer>
    );
};

export default ValidationResultsPanel;
