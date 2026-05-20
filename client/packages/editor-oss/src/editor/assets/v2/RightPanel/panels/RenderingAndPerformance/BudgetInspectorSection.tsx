import {type ChangeEvent, useCallback, useEffect, useState} from "react";
import styled from "styled-components";
import type * as THREE from "three";

import {
    collectBudgetInspection,
    logBudgetInspection,
    type BudgetAdvisorWarning,
    type BudgetInspectionSnapshot,
    type BudgetInspectorManagers,
    type BudgetInspectorRow,
} from "../../../../../../core/budget/BudgetInspector";
import global from "@stem/editor-oss/global";
import {StyledButton} from "../../../common/StyledButton";
import {Tooltip} from "../../../common/Tooltip";
import {ContentItem} from "../../common/ContentItem";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {PanelSectionTitle} from "../../RightPanel.style";
import {TooltipRowWrapper} from "../ProjectSettings/ProjectSettings.style";

const POLL_INTERVAL_MS = 1500;
const MAX_ROWS = 8;

type BudgetInspectorApp = {
    game?: {
        scene?: THREE.Object3D;
        runtimeBudgetCoordinator?: BudgetInspectorManagers["runtimeBudgetCoordinator"];
        plotBudgetManager?: BudgetInspectorManagers["plotBudgetManager"];
        textureResidencyManager?: BudgetInspectorManagers["textureResidencyManager"];
    };
    editor?: {
        scene?: THREE.Object3D;
        select?: (object: THREE.Object3D | null) => void;
        isPublished?: boolean;
        isSandbox?: boolean;
    };
    options?: {
        isPlayModeOnly?: boolean;
    };
    scene?: THREE.Object3D;
};

type AdvisorAccess = {
    allowAdvisor: boolean;
    blockedReason?: string;
};

const SummaryGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    width: 100%;
`;

const SummaryCard = styled.div`
    min-width: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 7px 8px;
    background: rgba(255, 255, 255, 0.04);
`;

const SummaryLabel = styled.div`
    font-size: 10px;
    color: rgba(255, 255, 255, 0.55);
`;

const SummaryValue = styled.div`
    margin-top: 3px;
    font-size: 15px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
`;

const StateLine = styled.div`
    margin-top: 5px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`;

const StateChip = styled.span<{$tone?: "normal" | "warn" | "danger"}>`
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 10px;
    line-height: 1.1;
    color: ${({$tone}) => $tone === "danger" ? "#ffb4b4" : $tone === "warn" ? "#ffd38f" : "rgba(255,255,255,0.72)"};
    background: ${({$tone}) => $tone === "danger" ? "rgba(255, 80, 80, 0.12)" : $tone === "warn" ? "rgba(255, 190, 90, 0.12)" : "rgba(255,255,255,0.07)"};
`;

const MetricStrip = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    width: 100%;
`;

const Metric = styled.div`
    min-width: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.62);
    span {
        display: block;
        margin-top: 2px;
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
    }
`;

const ActionRow = styled.div`
    display: flex;
    gap: 6px;
    width: 100%;
`;

const AdvisorWarnings = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
`;

const AdvisorWarningItem = styled.div<{$tone: "warn" | "danger"}>`
    min-width: 0;
    border: 1px solid ${({$tone}) => $tone === "danger" ? "rgba(255, 80, 80, 0.2)" : "rgba(255, 190, 90, 0.2)"};
    border-radius: 6px;
    background: ${({$tone}) => $tone === "danger" ? "rgba(255, 80, 80, 0.08)" : "rgba(255, 190, 90, 0.08)"};
    padding: 6px 8px;
    font-size: 11px;
    line-height: 1.25;
    color: rgba(255, 255, 255, 0.82);
`;

const AdvisorWarningName = styled.span`
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
`;

const Rows = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
`;

const RowButton = styled.button`
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.035);
    padding: 7px 8px;
    text-align: left;
    cursor: pointer;
    &:hover {
        background: rgba(255, 255, 255, 0.065);
    }
`;

const RowMain = styled.div`
    min-width: 0;
`;

const RowName = styled.div`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
`;

const RowMeta = styled.div`
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`;

const RowCost = styled.div`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.68);
    white-space: nowrap;
    align-self: center;
`;

const EmptyState = styled.div`
    width: 100%;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 9px 10px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.58);
`;

export const BudgetInspectorSection = () => {
    const [advisorEnabled, setAdvisorEnabled] = useState(false);
    const [snapshot, setSnapshot] = useState<BudgetInspectionSnapshot>(() => readSnapshot(false));
    const advisorAccess = getAdvisorAccess(global.app as BudgetInspectorApp | undefined);

    const refresh = useCallback(() => {
        setSnapshot(readSnapshot(advisorEnabled));
    }, [advisorEnabled]);

    const toggleAdvisor = useCallback((event: ChangeEvent<HTMLInputElement | undefined>) => {
        const enabled = event.target?.checked === true;
        setAdvisorEnabled(enabled);
        setSnapshot(readSnapshot(enabled));
    }, []);

    useEffect(() => {
        refresh();
        const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [refresh]);

    const selectRow = useCallback((row: BudgetInspectorRow) => {
        const app = global.app as BudgetInspectorApp | undefined;
        app?.editor?.select?.(row.object);
    }, []);

    const logSnapshot = useCallback(() => {
        const next = readSnapshot(advisorEnabled);
        setSnapshot(next);
        logBudgetInspection(next);
    }, [advisorEnabled]);

    return (
        <ContentItem $rowGap="12px">
            <TooltipRowWrapper>
                <PanelSectionTitle>Budget Inspector</PanelSectionTitle>
                <Tooltip
                    text="Shows current avatar, plot, and texture budget states from runtime metadata."
                    width="260px"
                />
            </TooltipRowWrapper>

            <SummaryGrid>
                <SummaryCard>
                    <SummaryLabel>Avatars</SummaryLabel>
                    <SummaryValue>{snapshot.avatar.total}</SummaryValue>
                    <StateLine>
                        <StateChip>{snapshot.avatar.states.full} full</StateChip>
                        <StateChip $tone="warn">{snapshot.avatar.states.ghost} ghost</StateChip>
                        <StateChip $tone="danger">{snapshot.avatar.states.culled} culled</StateChip>
                    </StateLine>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>Plots</SummaryLabel>
                    <SummaryValue>{snapshot.plot.total}</SummaryValue>
                    <StateLine>
                        <StateChip>{snapshot.plot.states.near} near</StateChip>
                        <StateChip>{snapshot.plot.states.mid} mid</StateChip>
                        <StateChip $tone="warn">{snapshot.plot.states.far} far</StateChip>
                        <StateChip $tone="danger">{snapshot.plot.states.culled} culled</StateChip>
                    </StateLine>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>Textures</SummaryLabel>
                    <SummaryValue>{snapshot.texture.total}</SummaryValue>
                    <StateLine>
                        <StateChip>{snapshot.texture.states.resident} resident</StateChip>
                        <StateChip $tone="warn">{snapshot.texture.states.reduced} reduced</StateChip>
                        <StateChip $tone="danger">{snapshot.texture.states.evicted} evicted</StateChip>
                    </StateLine>
                </SummaryCard>
            </SummaryGrid>

            <MetricStrip>
                <Metric>
                    Budget Pressure
                    <span>{snapshot.runtimeBudget?.pressure ?? "normal"}</span>
                </Metric>
                <Metric>
                    Texture Target
                    <span>{snapshot.runtimeBudget ? formatBytes(snapshot.runtimeBudget.targetTextureBytes) : "n/a"}</span>
                </Metric>
                <Metric>
                    Resident Texture
                    <span>{formatBytes(snapshot.runtimeBudget?.managedTextureBytes ?? snapshot.managers.textureManagerStats?.residentTextureBytes ?? snapshot.texture.residentTextureBytes ?? snapshot.texture.textureBytes)}</span>
                </Metric>
            </MetricStrip>

            <MetricStrip>
                <Metric>
                    Managed Texture
                    <span>{formatBytes(snapshot.managers.textureManagerStats?.textureBytes ?? snapshot.texture.textureBytes)}</span>
                </Metric>
                <Metric>
                    Avatar Texture
                    <span>{formatBytes(snapshot.avatar.textureBytes)}</span>
                </Metric>
                <Metric>
                    Plot Texture
                    <span>{formatBytes(snapshot.plot.textureBytes)}</span>
                </Metric>
            </MetricStrip>

            <MetricStrip>
                <Metric>
                    Advisor
                    <span>{formatAdvisorStatus(snapshot, advisorEnabled)}</span>
                </Metric>
                <Metric>
                    Plot Roots
                    <span>{formatOptionalCount(snapshot.managers.plotRegisteredCount, snapshot.plot.total)}</span>
                </Metric>
                <Metric>
                    Texture Roots
                    <span>{formatOptionalCount(snapshot.managers.textureRegisteredCount, snapshot.texture.total)}</span>
                </Metric>
            </MetricStrip>

            <PanelCheckbox
                v2
                height="28px"
                text="Budget Advisor"
                checked={advisorEnabled}
                onChange={toggleAdvisor}
                disabled={!advisorAccess.allowAdvisor}
                lockedReason={advisorAccess.blockedReason}
                tooltipText="Opt-in mobile budget checks for unpublished editor sessions."
                tooltipWidth="260px"
            />

            <ActionRow>
                <StyledButton
                    isGreySecondary
                    height="28px"
                    width="100%"
                    style={{margin: 0}}
                    onClick={refresh}
                >
                    Refresh
                </StyledButton>
                <StyledButton
                    isGreySecondary
                    height="28px"
                    width="100%"
                    style={{margin: 0}}
                    onClick={logSnapshot}
                >
                    Log Snapshot
                </StyledButton>
            </ActionRow>

            {snapshot.advisor?.allowed && snapshot.advisor.warnings.length > 0 && (
                <AdvisorWarnings>
                    {snapshot.advisor.warnings.slice(0, 4).map(warning => (
                        <AdvisorWarningItem
                            key={warning.id}
                            $tone={warning.severity === "critical" ? "danger" : "warn"}
                            title={warning.objectPath}
                        >
                            <AdvisorWarningName>{warning.objectName}</AdvisorWarningName>
                            {`: ${warning.message} (${formatAdvisorWarningValue(warning.value, warning.unit)} / ${formatAdvisorWarningValue(warning.limit, warning.unit)})`}
                        </AdvisorWarningItem>
                    ))}
                </AdvisorWarnings>
            )}

            {snapshot.rows.length === 0 ? (
                <EmptyState>No budget metadata is active in the current scene.</EmptyState>
            ) : (
                <Rows>
                    {snapshot.rows.map(row =>
                        <RowButton key={row.uuid}
                            type="button"
                            onClick={() => selectRow(row)}
                            title={row.path}
                        >
                            <RowMain>
                                <RowName>{row.name}</RowName>
                                <RowMeta>
                                    {row.avatarState &&
                                        <StateChip $tone={row.avatarState === "culled" ? "danger" : row.avatarState === "ghost" ? "warn" : "normal"}>
                                            {row.avatarState}
                                        </StateChip>
                                    }
                                    {row.avatarRole && <StateChip>{row.avatarRole}</StateChip>}
                                    {row.plotState && <StateChip $tone={row.plotState === "culled" ? "danger" : row.plotState === "far" ? "warn" : "normal"}>{row.plotState}</StateChip>}
                                    {row.textureState && <StateChip $tone={row.textureState === "evicted" ? "danger" : row.textureState === "reduced" ? "warn" : "normal"}>{row.textureState}</StateChip>}
                                    {(row.textureReason || row.plotReason || row.avatarReason) &&
                                        <StateChip>{row.textureReason ?? row.plotReason ?? row.avatarReason}</StateChip>
                                    }
                                    {row.advisorWarnings?.length ? (
                                        <StateChip $tone={row.advisorSeverity === "critical" ? "danger" : "warn"}>
                                            {formatRowAdvisor(row)}
                                        </StateChip>
                                    ) : null}
                                </RowMeta>
                            </RowMain>
                            <RowCost>{formatBytes(row.textureBytes)}</RowCost>
                        </RowButton>,
                    )}
                </Rows>
            )}
        </ContentItem>
    );
};

function readSnapshot(enableAdvisor: boolean): BudgetInspectionSnapshot {
    const app = global.app as BudgetInspectorApp | undefined;
    const game = app?.game;
    const scene = (game?.scene ?? app?.editor?.scene ?? app?.scene) as THREE.Object3D | null | undefined;
    const advisorAccess = getAdvisorAccess(app);
    return collectBudgetInspection(
        scene,
        {
            runtimeBudgetCoordinator: game?.runtimeBudgetCoordinator,
            plotBudgetManager: game?.plotBudgetManager,
            textureResidencyManager: game?.textureResidencyManager,
        },
        {
            maxRows: MAX_ROWS,
            enableAdvisor,
            allowAdvisor: advisorAccess.allowAdvisor,
            advisorBlockedReason: advisorAccess.blockedReason,
        },
    );
}

function getAdvisorAccess(app: BudgetInspectorApp | undefined): AdvisorAccess {
    if (!app?.editor) {
        return {allowAdvisor: false, blockedReason: "No editor context"};
    }

    if (app.options?.isPlayModeOnly === true) {
        return {allowAdvisor: false, blockedReason: "Published player runtime"};
    }

    if (app.editor.isPublished === true) {
        return {allowAdvisor: false, blockedReason: "Published game"};
    }

    return {allowAdvisor: true};
}

function formatAdvisorStatus(snapshot: BudgetInspectionSnapshot, advisorEnabled: boolean): string {
    if (!advisorEnabled) return "off";
    if (!snapshot.advisor) return "off";
    if (!snapshot.advisor.allowed) return "blocked";
    if (snapshot.advisor.criticalCount > 0 && snapshot.advisor.warningCount > 0) {
        return `${snapshot.advisor.criticalCount} critical / ${snapshot.advisor.warningCount} warn`;
    }
    if (snapshot.advisor.criticalCount > 0) return `${snapshot.advisor.criticalCount} critical`;
    if (snapshot.advisor.warningCount > 0) return `${snapshot.advisor.warningCount} warn`;
    return "clear";
}

function formatRowAdvisor(row: BudgetInspectorRow): string {
    const critical = row.advisorWarnings?.filter(warning => warning.severity === "critical").length ?? 0;
    const warning = row.advisorWarnings?.filter(item => item.severity === "warning").length ?? 0;
    if (critical > 0) return `${critical} critical`;
    return `${warning} warn`;
}

function formatAdvisorWarningValue(value: number, unit: BudgetAdvisorWarning["unit"]): string {
    switch (unit) {
        case "bytes":
            return formatBytes(value);
        case "pixels":
            return `${Math.round(value)} px`;
        case "count":
            return Math.round(value).toLocaleString();
    }
}

function formatOptionalCount(managerCount: number | undefined, metadataCount: number): string {
    return managerCount === undefined ? String(metadataCount) : `${managerCount} / ${metadataCount}`;
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    const mb = bytes / 1024 / 1024;
    if (mb < 10) return `${Math.round(mb * 10) / 10} MB`;
    return `${Math.round(mb)} MB`;
}
