/**
 * Lightweight scene-load performance profiler.
 *
 * Usage:
 *   SceneLoadProfiler.begin('fetchScene');
 *   ...
 *   SceneLoadProfiler.end('fetchScene');
 *   SceneLoadProfiler.summary();   // logs a table to the console
 */

interface StageEntry {
    start: number;
    end?: number;
    duration?: number;
    /** Number of begin/end pairs or accumulate calls folded into this entry. */
    count?: number;
}

class SceneLoadProfilerImpl {
    private stages: Map<string, StageEntry> = new Map();
    private loadStart = 0;

    /** Call once at the very start of scene loading. */
    start(): void {
        this.stages.clear();
        this.loadStart = performance.now();
        performance.mark('scene-load-start');
    }

    /**
     * Mark the beginning of a named stage.
     * @param stage
     */
    begin(stage: string): void {
        const now = performance.now();
        this.stages.set(stage, { start: now });
        performance.mark(`scene-${stage}-start`);
    }

    /**
     * Mark the end of a named stage.
     * @param stage
     */
    end(stage: string): void {
        const entry = this.stages.get(stage);
        if (!entry) {
            console.warn(`[SceneLoadProfiler] end() called for unknown stage: ${stage}`);
            return;
        }
        const now = performance.now();
        entry.end = now;
        entry.duration = now - entry.start;
        performance.mark(`scene-${stage}-end`);
        try {
            performance.measure(`scene-${stage}`, `scene-${stage}-start`, `scene-${stage}-end`);
        } catch {
            // measure can throw if marks were cleared
        }
    }

    /**
     * Add `ms` to a named accumulator bucket. Use this for repeating async
     * work (e.g. each ModelSerializer.fromJSON call) where individual
     * begin/end spans would clutter the table — the bucket reports a total
     * and a count.
     * @param stage bucket name
     * @param ms duration to add
     * @param count how many underlying events `ms` represents. Defaults to
     *   1 — pass the real count when forwarding pre-summed data (e.g. worker
     *   stats covering N events) so the summary table shows event counts,
     *   not just the number of accumulate() calls.
     */
    accumulate(stage: string, ms: number, count: number = 1): void {
        const now = performance.now();
        const entry = this.stages.get(stage);
        if (entry) {
            entry.duration = (entry.duration ?? 0) + ms;
            entry.count = (entry.count ?? 0) + count;
            entry.end = now;
        } else {
            this.stages.set(stage, {
                start: now - ms,
                end: now,
                duration: ms,
                count,
            });
        }
        // Also drop a measure into the trace so this bucket is visible in
        // DevTools / trace analyzers, not just in the summary console table.
        // `detail.count` carries the underlying event count for tooling that
        // can read PerformanceEntry.detail / Chrome trace `args`.
        try {
            performance.measure(`scene-${stage}`, { start: now - ms, duration: ms, detail: { count } });
        } catch {
            // older browsers without the {start,duration} options form — ignore
        }
    }

    /**
     * Wrap a promise so its elapsed time is folded into a named accumulator
     * bucket. Returns the original promise's value, so callers can use it
     * transparently.
     * @param stage bucket name
     * @param p promise to time
     */
    async time<T>(stage: string, p: Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            return await p;
        } finally {
            this.accumulate(stage, performance.now() - start);
        }
    }

    /** Log a summary table of all recorded stages. */
    summary(): void {
        const total = performance.now() - this.loadStart;
        performance.mark('scene-load-end');
        try {
            performance.measure('scene-load-total', 'scene-load-start', 'scene-load-end');
        } catch {
            // ignore
        }

        const rows: Record<string, string>[] = [];
        for (const [name, entry] of this.stages) {
            rows.push({
                stage: name,
                'ms': entry.duration !== undefined ? entry.duration.toFixed(1) : 'running',
                '%': entry.duration !== undefined ? (entry.duration / total * 100).toFixed(1) : '-',
                'n': entry.count !== undefined ? String(entry.count) : '',
            });
        }
        rows.push({ stage: 'TOTAL', 'ms': total.toFixed(1), '%': '100.0', 'n': '' });

        console.groupCollapsed(`[SceneLoadProfiler] Load completed in ${total.toFixed(0)}ms`);
        console.table(rows);
        console.groupEnd();
    }
}

export const SceneLoadProfiler = new SceneLoadProfilerImpl();
