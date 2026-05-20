import type { ISystem } from "./types";
import { PipelineStage } from "./types";

/**
 * Topological sort of systems within each pipeline stage.
 * Dependencies are auto-detected: if system A writes a component type that
 * system B reads, then A must run before B within the same stage.
 *
 * Uses Kahn's algorithm with priority as a tiebreaker.
 */
export class DependencyGraph {
    private nodes: Map<string, ISystem> = new Map();
    private cachedOrders: Map<PipelineStage, ISystem[]> = new Map();

    addSystem(system: ISystem): void {
        this.nodes.set(system.id, system);
        this.cachedOrders.clear();
    }

    removeSystem(id: string): void {
        this.nodes.delete(id);
        this.cachedOrders.clear();
    }

    hasSystem(id: string): boolean {
        return this.nodes.has(id);
    }

    /**
     * Returns systems for the given stage in dependency-respecting order.
     * Result is cached until addSystem/removeSystem is called.
     * @param stage
     * @returns Sorted array of systems
     */
    getExecutionOrder(stage: PipelineStage): ISystem[] {
        const cached = this.cachedOrders.get(stage);
        if (cached) return cached;

        const stageSystems = [...this.nodes.values()].filter(s => s.stage === stage);
        if (stageSystems.length === 0) {
            this.cachedOrders.set(stage, []);
            return [];
        }

        // Build adjacency: edge A -> B means A must run before B
        const adj: Map<string, Set<string>> = new Map();
        const inDegree: Map<string, number> = new Map();

        for (const s of stageSystems) {
            adj.set(s.id, new Set());
            inDegree.set(s.id, 0);
        }

        for (const a of stageSystems) {
            for (const b of stageSystems) {
                if (a.id === b.id) continue;
                // If A writes something B reads → A runs before B,
                // BUT skip if B also writes that component (mutual read/write
                // = peers, resolved by priority to avoid cycles).
                const hasEdge = a.writes.some(
                    w => b.reads.includes(w) && !b.writes.includes(w),
                );
                if (hasEdge) {
                    adj.get(a.id)!.add(b.id);
                    inDegree.set(b.id, (inDegree.get(b.id) ?? 0) + 1);
                }
            }
        }

        // Kahn's algorithm with priority-ordered queue
        const queue: ISystem[] = stageSystems
            .filter(s => inDegree.get(s.id) === 0)
            .sort((a, b) => a.priority - b.priority);

        const result: ISystem[] = [];

        while (queue.length > 0) {
            const current = queue.shift()!;
            result.push(current);

            for (const neighborId of adj.get(current.id) ?? []) {
                const newDeg = inDegree.get(neighborId)! - 1;
                inDegree.set(neighborId, newDeg);
                if (newDeg === 0) {
                    const sys = this.nodes.get(neighborId)!;
                    // Insert in priority order
                    const idx = queue.findIndex(q => q.priority > sys.priority);
                    if (idx === -1) queue.push(sys);
                    else queue.splice(idx, 0, sys);
                }
            }
        }

        if (result.length !== stageSystems.length) {
            const missing = stageSystems.filter(s => !result.includes(s)).map(s => s.id);
            console.error(`[DependencyGraph] Circular dependency in stage ${PipelineStage[stage]}: ${missing.join(", ")}`);
            // Fallback: return in priority order without dependency resolution
            this.cachedOrders.set(stage, stageSystems.sort((a, b) => a.priority - b.priority));
            return this.cachedOrders.get(stage)!;
        }

        this.cachedOrders.set(stage, result);
        return result;
    }

    /**
     * Returns systems grouped into parallel waves. Systems within one wave
     * have no data dependencies on each other and can execute concurrently.
     * @param stage
     * @returns Array of waves, each wave is an array of independent systems
     */
    getParallelWaves(stage: PipelineStage): ISystem[][] {
        const stageSystems = [...this.nodes.values()].filter(s => s.stage === stage);
        if (stageSystems.length === 0) return [];

        // Build adjacency and in-degree (same as getExecutionOrder)
        const adj: Map<string, Set<string>> = new Map();
        const inDegree: Map<string, number> = new Map();

        for (const s of stageSystems) {
            adj.set(s.id, new Set());
            inDegree.set(s.id, 0);
        }

        for (const a of stageSystems) {
            for (const b of stageSystems) {
                if (a.id === b.id) continue;
                if (a.writes.some(w => b.reads.includes(w) && !b.writes.includes(w))) {
                    adj.get(a.id)!.add(b.id);
                    inDegree.set(b.id, (inDegree.get(b.id) ?? 0) + 1);
                }
            }
        }

        // BFS by layer: each layer is one parallel wave
        const waves: ISystem[][] = [];
        let frontier = stageSystems
            .filter(s => inDegree.get(s.id) === 0)
            .sort((a, b) => a.priority - b.priority);

        while (frontier.length > 0) {
            waves.push(frontier);
            const nextFrontier: ISystem[] = [];
            for (const sys of frontier) {
                for (const nid of adj.get(sys.id) ?? []) {
                    const newDeg = inDegree.get(nid)! - 1;
                    inDegree.set(nid, newDeg);
                    if (newDeg === 0) {
                        nextFrontier.push(this.nodes.get(nid)!);
                    }
                }
            }
            frontier = nextFrontier.sort((a, b) => a.priority - b.priority);
        }

        return waves;
    }

    dispose(): void {
        this.nodes.clear();
        this.cachedOrders.clear();
    }
}
