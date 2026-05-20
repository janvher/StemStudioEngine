/**
 * Store interface exposed to behaviors for global data sharing.
 * Maximum 128 keys allowed. Reset when game starts.
 */
export interface StemStore {
    /**
     * Get a value from the global store
     * @param key - The key to retrieve
     * @returns The value or undefined if not found
     */
    get<T = unknown>(key: string): T | undefined;

    /**
     * Set a value in the global store
     * @param key - The key to set
     * @param value - The value to store
     * @throws Error if max keys limit (128) would be exceeded
     */
    set<T = unknown>(key: string, value: T): void;

    /**
     * Check if a key exists in the global store
     * @param key - The key to check
     * @returns true if the key exists
     */
    has(key: string): boolean;

    /**
     * Delete a key from the global store
     * @param key - The key to delete
     * @returns true if the key was deleted
     */
    delete(key: string): boolean;

    /**
     * Get all keys in the global store
     * @returns Array of all keys
     */
    keys(): string[];

    /**
     * Get the number of keys in the global store
     * @returns The number of keys
     */
    readonly size: number;
}
