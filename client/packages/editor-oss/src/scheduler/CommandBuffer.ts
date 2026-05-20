/**
 * Unified deferred command buffer.
 * Replaces BehaviorManager.commandQueue and LambdaBase._pendingOps
 * with a single buffer flushed at stage boundaries.
 */

export type DeferredCommand =
    | { type: "add"; target: string; system: string; data?: unknown }
    | { type: "remove"; target: string; system: string }
    | { type: "custom"; callback: () => void };

export class CommandBuffer {
    private commands: DeferredCommand[] = [];
    private hasWarnedUnwiredCommands = false;

    push(cmd: DeferredCommand): void {
        this.commands.push(cmd);
    }

    /**
     * Execute and clear all queued commands.
     * Called by FrameOrchestrator at stage boundaries.
     */
    flush(): void {
        if (this.commands.length === 0) return;

        const batch = this.commands;
        this.commands = [];
        let droppedUnwiredCommands = 0;

        for (const cmd of batch) {
            if (cmd.type === "custom") {
                try {
                    cmd.callback();
                } catch (e) {
                    console.error("[CommandBuffer] Error executing command:", e);
                }
                continue;
            }

            // TODO: wire add/remove commands to concrete system adapters.
            // Warn once to avoid silent data loss if callers start relying on this path.
            droppedUnwiredCommands++;
        }

        if (droppedUnwiredCommands > 0 && !this.hasWarnedUnwiredCommands) {
            console.warn(
                `[CommandBuffer] Dropped ${droppedUnwiredCommands} add/remove command(s) because no handlers are registered.`,
            );
            this.hasWarnedUnwiredCommands = true;
        }
    }

    get pending(): number {
        return this.commands.length;
    }

    dispose(): void {
        this.commands = [];
        this.hasWarnedUnwiredCommands = false;
    }
}
