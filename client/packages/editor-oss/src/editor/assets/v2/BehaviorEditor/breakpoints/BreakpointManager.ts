/**
 * BreakpointManager - Manages visual-only breakpoints for behavior scripts
 * Breakpoints are stored separately from code and only injected at runtime
 */

export type BreakpointChangeListener = (fileId: string, breakpoints: Set<number>) => void;

export class BreakpointManager {
    private breakpoints: Map<string, Set<number>> = new Map();
    private listeners: Set<BreakpointChangeListener> = new Set();

    /**
     * Toggle a breakpoint at a specific line
     * @param fileId - The file identifier
     * @param line - The line number (1-indexed)
     * @returns true if breakpoint was added, false if removed
     */
    toggle(fileId: string, line: number): boolean {
        const fileBreakpoints = this.getOrCreate(fileId);

        if (fileBreakpoints.has(line)) {
            fileBreakpoints.delete(line);
            this.notifyListeners(fileId);
            return false;
        } else {
            fileBreakpoints.add(line);
            this.notifyListeners(fileId);
            return true;
        }
    }

    /**
     * Add a breakpoint at a specific line
     * @param fileId - The file identifier
     * @param line - The line number (1-indexed)
     */
    add(fileId: string, line: number): void {
        const fileBreakpoints = this.getOrCreate(fileId);
        fileBreakpoints.add(line);
        this.notifyListeners(fileId);
    }

    /**
     * Remove a breakpoint at a specific line
     * @param fileId - The file identifier
     * @param line - The line number (1-indexed)
     */
    remove(fileId: string, line: number): void {
        const fileBreakpoints = this.breakpoints.get(fileId);
        if (fileBreakpoints) {
            fileBreakpoints.delete(line);
            this.notifyListeners(fileId);
        }
    }

    /**
     * Get all breakpoints for a file
     * @param fileId - The file identifier
     * @returns Set of line numbers with breakpoints
     */
    get(fileId: string): Set<number> {
        return this.breakpoints.get(fileId) || new Set();
    }

    /**
     * Check if a file has any breakpoints
     * @param fileId - The file identifier
     */
    hasBreakpoints(fileId: string): boolean {
        const fileBreakpoints = this.breakpoints.get(fileId);
        return fileBreakpoints ? fileBreakpoints.size > 0 : false;
    }

    /**
     * Check if a specific line has a breakpoint
     * @param fileId - The file identifier
     * @param line - The line number (1-indexed)
     */
    hasBreakpointAt(fileId: string, line: number): boolean {
        const fileBreakpoints = this.breakpoints.get(fileId);
        return fileBreakpoints ? fileBreakpoints.has(line) : false;
    }

    /**
     * Get the count of breakpoints for a file
     * @param fileId - The file identifier
     */
    getCount(fileId: string): number {
        const fileBreakpoints = this.breakpoints.get(fileId);
        return fileBreakpoints ? fileBreakpoints.size : 0;
    }

    /**
     * Get total breakpoint count across all files
     */
    getTotalCount(): number {
        let total = 0;
        this.breakpoints.forEach(set => {
            total += set.size;
        });
        return total;
    }

    /**
     * Clear all breakpoints for a file
     * @param fileId - The file identifier
     */
    clear(fileId: string): void {
        this.breakpoints.delete(fileId);
        this.notifyListeners(fileId);
    }

    /**
     * Clear all breakpoints for all files
     */
    clearAll(): void {
        const fileIds = Array.from(this.breakpoints.keys());
        this.breakpoints.clear();
        fileIds.forEach(fileId => this.notifyListeners(fileId));
    }

    /**
     * Adjust breakpoints when lines are inserted or deleted
     * @param fileId - The file identifier
     * @param startLine - The line where change occurred (1-indexed)
     * @param delta - Number of lines added (positive) or removed (negative)
     */
    adjustLines(fileId: string, startLine: number, delta: number): void {
        const fileBreakpoints = this.breakpoints.get(fileId);
        if (!fileBreakpoints || fileBreakpoints.size === 0) return;

        const newBreakpoints = new Set<number>();

        fileBreakpoints.forEach(line => {
            if (line < startLine) {
                // Lines before the change stay the same
                newBreakpoints.add(line);
            } else if (delta > 0) {
                // Lines inserted: shift breakpoints down
                newBreakpoints.add(line + delta);
            } else if (delta < 0) {
                // Lines deleted
                if (line >= startLine - delta) {
                    // Breakpoint is after deleted region: shift up
                    newBreakpoints.add(line + delta);
                }
                // Breakpoints in deleted region are removed
            }
        });

        this.breakpoints.set(fileId, newBreakpoints);
        this.notifyListeners(fileId);
    }

    /**
     * Subscribe to breakpoint changes
     * @param listener - Callback function
     * @returns Unsubscribe function
     */
    subscribe(listener: BreakpointChangeListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Get all file IDs that have breakpoints
     */
    getFilesWithBreakpoints(): string[] {
        return Array.from(this.breakpoints.keys()).filter(
            fileId => this.hasBreakpoints(fileId),
        );
    }

    private getOrCreate(fileId: string): Set<number> {
        let fileBreakpoints = this.breakpoints.get(fileId);
        if (!fileBreakpoints) {
            fileBreakpoints = new Set();
            this.breakpoints.set(fileId, fileBreakpoints);
        }
        return fileBreakpoints;
    }

    private notifyListeners(fileId: string): void {
        const breakpoints = this.get(fileId);
        this.listeners.forEach(listener => {
            try {
                listener(fileId, breakpoints);
            } catch (e) {
                console.error("BreakpointManager listener error:", e);
            }
        });
    }
}

// Singleton instance for global access
export const breakpointManager = new BreakpointManager();

// Session-scoped flag for one-time debugger tooltip
let _hasShownDebuggerTooltip = false;

/**
 * Returns true the first time it's called per session, false thereafter.
 * Used to show a one-time toast informing the user to open Developer Tools.
 */
export function shouldShowDebuggerTooltip(): boolean {
    if (_hasShownDebuggerTooltip) return false;
    _hasShownDebuggerTooltip = true;
    return true;
}
