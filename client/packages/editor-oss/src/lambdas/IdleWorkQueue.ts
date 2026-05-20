/**
 * Schedules non-critical work during browser idle time via requestIdleCallback.
 * Use for: metrics collection, cache cleanup, prefetching, pool tuning.
 *
 * Falls back to setTimeout on Safari (no requestIdleCallback support).
 */

interface IdleTask {
    callback: () => void;
    priority: number;
}

export class IdleWorkQueue {
    private queue: IdleTask[] = [];
    private callbackId: number | null = null;

    schedule(callback: () => void, priority: number = 0): void {
        this.queue.push({ callback, priority });
        this.queue.sort((a, b) => b.priority - a.priority);
        if (this.callbackId === null) {
            this.scheduleProcessing();
        }
    }

    private scheduleProcessing(): void {
        if (typeof requestIdleCallback === "function") {
            this.callbackId = requestIdleCallback(
                (deadline) => this.process(deadline),
                { timeout: 1000 },
            );
        } else {
            // Safari fallback — simulate ~5ms of idle time
            this.callbackId = setTimeout(() => {
                this.process({ timeRemaining: () => 5, didTimeout: false });
            }, 16) as unknown as number;
        }
    }

    private process(deadline: IdleDeadline): void {
        this.callbackId = null;

        while (this.queue.length > 0 && deadline.timeRemaining() > 1) {
            const task = this.queue.shift()!;
            try {
                task.callback();
            } catch (e) {
                console.error("[IdleWorkQueue] Task error:", e);
            }
        }

        if (this.queue.length > 0) {
            this.scheduleProcessing();
        }
    }

    dispose(): void {
        if (this.callbackId !== null) {
            if (typeof cancelIdleCallback === "function") {
                cancelIdleCallback(this.callbackId);
            } else {
                clearTimeout(this.callbackId);
            }
            this.callbackId = null;
        }
        this.queue = [];
    }
}
