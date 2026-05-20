/**
 * Re-exports from the consolidated SystemProfiler for backward compatibility.
 * All profiling logic now lives in scheduler/SystemProfiler.ts.
 */
export { SystemProfiler as LambdaProfiler, lambdaProfiler } from "@stem/editor-oss/scheduler/SystemProfiler";
export type { SystemMetrics as LambdaMetrics } from "@stem/editor-oss/scheduler/SystemProfiler";
