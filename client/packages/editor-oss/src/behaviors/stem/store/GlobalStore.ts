/**
 * Global data store shared among all behaviors.
 * Maximum 128 keys allowed.
 * Reset when game starts.
 */
export class GlobalStore {
    private static readonly MAX_KEYS = 128;
    private data: Map<string, unknown> = new Map();

    /**
     * Get a value from the store
     * @param key - The key to retrieve
     * @returns The value or undefined if not found
     */
    get<T = unknown>(key: string): T | undefined {
        return this.data.get(key) as T | undefined;
    }

    /**
     * Set a value in the store
     * @param key - The key to set
     * @param value - The value to store
     * @throws Error if max keys limit would be exceeded
     */
    set<T = unknown>(key: string, value: T): void {
        if (!this.data.has(key) && this.data.size >= GlobalStore.MAX_KEYS) {
            throw new Error(
                `GlobalStore: Cannot add key "${key}". Maximum of ${GlobalStore.MAX_KEYS} keys allowed.`,
            );
        }
        this.data.set(key, value);
    }

    /**
     * Check if a key exists in the store
     * @param key - The key to check
     * @returns true if the key exists
     */
    has(key: string): boolean {
        return this.data.has(key);
    }

    /**
     * Delete a key from the store
     * @param key - The key to delete
     * @returns true if the key was deleted
     */
    delete(key: string): boolean {
        return this.data.delete(key);
    }

    /**
     * Get all keys in the store
     * @returns Array of all keys
     */
    keys(): string[] {
        return Array.from(this.data.keys());
    }

    /**
     * Get the number of keys in the store
     * @returns The number of keys
     */
    get size(): number {
        return this.data.size;
    }

    /**
     * Clear all data from the store.
     * Called when game starts/resets.
     */
    clear(): void {
        this.data.clear();
    }
}
