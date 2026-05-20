/*
 * Copyright: StemStudio Maintainers
 * Portions of this code are derived from the Shadow Editor (MIT License)
 */
/**
 * Generator-based time-slicing for explicitly deferred systems.
 * After the fresh-frame scheduling refactor, the main behavior and lambda
 * adapters no longer use this runner. It is kept for future opt-in deferred
 * systems (Phase 5-6) and for any remaining time-sliceable UPDATE systems.
 */
export class TimeSliceRunner {
    private suspended: Map<string, Generator> = new Map();

    /**
     * Run a generator until it completes or the absolute deadline is reached.
     * Returns true if the generator finished, false if suspended.
     * @param id
     * @param generator
     * @param deadline
     */
    run(id: string, generator: Generator, deadline: number): boolean {
        let result: IteratorResult<unknown, unknown>;
        try {
            result = generator.next();
        } catch (error) {
            console.warn(`[TimeSliceRunner] Handled generator error for system "${id}" at start; dropping this slice.`, error);
            this.suspended.delete(id);
            return true;
        }

        while (!result.done) {
            if (performance.now() >= deadline) {
                this.suspended.set(id, generator);
                return false;
            }
            try {
                result = generator.next();
            } catch (error) {
                console.warn(`[TimeSliceRunner] Handled generator error for system "${id}" during slice; dropping this slice.`, error);
                this.suspended.delete(id);
                return true;
            }
        }

        this.suspended.delete(id);
        return true;
    }

    /**
     * Advance a suspended generator by exactly one step.
     * Used as a minimum-progress guarantee when the frame budget is exhausted.
     * @param id
     * @param gen
     */
    private advanceOne(id: string, gen: Generator): void {
        try {
            const result = gen.next();
            if (result.done) {
                this.suspended.delete(id);
            }
        } catch (error) {
            console.warn(
                `[TimeSliceRunner] Error in minimum-progress step for "${id}"; dropping.`,
                error,
            );
            this.suspended.delete(id);
        }
    }

    hasSuspended(id: string): boolean {
        return this.suspended.has(id);
    }

    discardSuspended(id: string): void {
        const generator = this.suspended.get(id);
        if (!generator) {
            return;
        }
        try {
            generator.return?.(undefined);
        } catch {
            // Swallow errors from generator cleanup
        }
        this.suspended.delete(id);
    }

    /**
     * Resume all suspended generators from the previous frame.
     * Uses an absolute deadline instead of a stale budget snapshot.
     * @param deadline
     */
    resumeAll(deadline: number): void {
        if (this.suspended.size === 0) return;

        const toResume = Array.from(this.suspended.entries());
        for (const [id, gen] of toResume) {
            if (performance.now() >= deadline) {
                this.advanceOne(id, gen);
                continue;
            }
            if (this.run(id, gen, deadline)) {
                this.suspended.delete(id);
            }
        }
    }

    get pendingCount(): number {
        return this.suspended.size;
    }

    clearSuspended(): void {
        // Call .return() on each generator so their finally blocks run
        // (e.g. BehaviorManager.updateSliced resets isProcessing in finally).
        for (const gen of this.suspended.values()) {
            try {
                gen.return(undefined);
            } catch {
                // Swallow errors from generator cleanup
            }
        }
        this.suspended.clear();
    }

    dispose(): void {
        this.clearSuspended();
    }
}
