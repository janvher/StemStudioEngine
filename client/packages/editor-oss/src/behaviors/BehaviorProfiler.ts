/**
 * Re-exports from the consolidated SystemProfiler for backward compatibility.
 * All profiling logic now lives in scheduler/SystemProfiler.ts.
 */
export { SystemProfiler as BehaviorProfiler, behaviorProfiler } from "../scheduler/SystemProfiler";
export type { SystemMetrics as BehaviorMetrics } from "../scheduler/SystemProfiler";
