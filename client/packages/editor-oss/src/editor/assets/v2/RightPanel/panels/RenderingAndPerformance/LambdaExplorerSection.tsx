import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import type EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import type { Lambda } from "../../../../../../lambdas/Lambda";
import { lambdaProfiler } from "../../../../../../scheduler/SystemProfiler";
import { PanelCheckbox } from "../../common/PanelCheckbox";
import { PanelSectionTitle } from "../../RightPanel.style";

const REFRESH_MS = 500;

interface Row {
    uuid: string;
    id: string;
    waveIndex: number;
    entityCount: number;
    avgMs: number;
    maxMs: number;
    lastMs: number;
    callCount: number;
}

interface Snapshot {
    rows: Row[];
    totalMs: number;
    waveCount: number;
    instanceCount: number;
    running: boolean;
}

const EMPTY_SNAPSHOT: Snapshot = {
    rows: [],
    totalMs: 0,
    waveCount: 0,
    instanceCount: 0,
    running: false,
};

const Table = styled.div`
    width: 100%;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.75);
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const Header = styled.div`
    display: grid;
    grid-template-columns: 1.5fr 0.4fr 0.6fr 0.6fr 0.6fr;
    gap: 4px;
    padding: 4px 6px;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 10px;
`;

const Cell = styled.div`
    display: grid;
    grid-template-columns: 1.5fr 0.4fr 0.6fr 0.6fr 0.6fr;
    gap: 4px;
    padding: 4px 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.03);
    & > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

const Hot = styled(Cell)<{ $severity: number }>`
    background: ${({ $severity }) => {
        if ($severity > 1) return "rgba(220, 80, 80, 0.18)";
        if ($severity > 0.5) return "rgba(220, 160, 60, 0.14)";
        return "rgba(255, 255, 255, 0.03)";
    }};
`;

const WaveTag = styled.span<{ $wave: number }>`
    display: inline-block;
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 9px;
    font-weight: 600;
    background: ${({ $wave }) => {
        const hues = [200, 140, 40, 320, 260];
        const hue = hues[$wave % hues.length];
        return `hsl(${hue}, 55%, 25%)`;
    }};
    color: white;
`;

const Summary = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 4px 6px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.55);
`;

const EmptyState = styled.div`
    padding: 12px 6px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    text-align: center;
`;

function takeSnapshot(): Snapshot {
    const app = global?.app as EngineRuntime | undefined;
    const manager = app?.game?.lambdaManager;
    if (!manager) return EMPTY_SNAPSHOT;

    const waves = manager.getWaves();
    const waveIndexByUuid = new Map<string, number>();
    waves.forEach((wave, i) => wave.forEach((inst: Lambda) => waveIndexByUuid.set(inst.uuid, i)));

    const metrics = lambdaProfiler.getMetrics();
    const metricsByUuid = new Map(metrics.map(m => [m.instanceUuid, m]));

    const instances = manager.getAllInstances();
    const rows: Row[] = instances.map(inst => {
        const m = metricsByUuid.get(inst.uuid);
        return {
            uuid: inst.uuid,
            id: inst.id,
            waveIndex: waveIndexByUuid.get(inst.uuid) ?? -1,
            entityCount: inst.entityCount,
            avgMs: m?.avgExecutionTimeMs ?? 0,
            maxMs: m?.maxExecutionTimeMs ?? 0,
            lastMs: m?.executionTimeMs ?? 0,
            callCount: m?.callCount ?? 0,
        };
    });

    rows.sort((a, b) => {
        if (a.waveIndex !== b.waveIndex) return a.waveIndex - b.waveIndex;
        return b.avgMs - a.avgMs;
    });

    const totalMs = rows.reduce((sum, r) => sum + r.avgMs, 0);
    return {
        rows,
        totalMs,
        waveCount: waves.length,
        instanceCount: instances.length,
        running: true,
    };
}

export default function LambdaExplorerSection() {
    const [enabled, setEnabled] = useState(false);
    const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            lambdaProfiler.disable();
            setSnapshot(EMPTY_SNAPSHOT);
            return;
        }

        lambdaProfiler.enable();
        setSnapshot(takeSnapshot());
        intervalRef.current = setInterval(() => {
            setSnapshot(takeSnapshot());
        }, REFRESH_MS);

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            lambdaProfiler.disable();
        };
    }, [enabled]);

    const avgCap = useMemo(() => {
        let max = 0;
        for (const r of snapshot.rows) if (r.avgMs > max) max = r.avgMs;
        return max;
    }, [snapshot]);

    return (
        <>
            <PanelSectionTitle>Lambda Explorer</PanelSectionTitle>
            <PanelCheckbox
                v2
                text="Enable Lambda Profiler"
                checked={enabled}
                isGray
                regular
                onChange={() => setEnabled(prev => !prev)}
                tooltipText="Live view of every running lambda: dependency wave, registered entities, and per-instance execution timings. Disabled by default — turn on only when profiling."
            />
            {enabled && !snapshot.running &&
                <EmptyState>
                    No active LambdaManager. Enter Play mode to inspect lambdas.
                </EmptyState>
            }
            {enabled && snapshot.running &&
                <>
                    <Summary>
                        <span>
                            {snapshot.instanceCount} instance{snapshot.instanceCount === 1 ? "" : "s"}
                            {" · "}
                            {snapshot.waveCount} wave{snapshot.waveCount === 1 ? "" : "s"}
                        </span>
                        <span>total avg {snapshot.totalMs.toFixed(2)} ms</span>
                    </Summary>
                    <Table>
                        <Header>
                            <span>Lambda</span>
                            <span>Wave</span>
                            <span>Entities</span>
                            <span>Avg ms</span>
                            <span>Max ms</span>
                        </Header>
                        {snapshot.rows.length === 0 &&
                            <EmptyState>No lambda instances.</EmptyState>
                        }
                        {snapshot.rows.map(row => {
                            const severity = avgCap > 0 ? row.avgMs / avgCap : 0;
                            return (
                                <Hot key={row.uuid}
                                    $severity={severity}
                                    title={`${row.id} (${row.uuid.slice(0, 8)}) — ${row.callCount} calls`}
                                >
                                    <span>{row.id}</span>
                                    <span>
                                        {row.waveIndex >= 0
                                            ? <WaveTag $wave={row.waveIndex}>W{row.waveIndex}</WaveTag>
                                            : <span>—</span>}
                                    </span>
                                    <span>{row.entityCount}</span>
                                    <span>{row.avgMs.toFixed(3)}</span>
                                    <span>{row.maxMs.toFixed(3)}</span>
                                </Hot>
                            );
                        })}
                    </Table>
                </>
            }
        </>
    );
}
