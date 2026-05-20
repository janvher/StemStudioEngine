export interface ObjectPoolConfig<T> {
    create: () => T;
    reset: (item: T) => void;
    initialSize?: number;
    maxSize?: number;
}

export interface ObjectPool<T> {
    get(): T;
    release(item: T): void;
    preallocate(count: number): void;
    clear(): void;
    getStats(): { total: number; available: number; inUse: number };
}

/**
 *
 * @param config
 */
export function createObjectPool<T>(config: ObjectPoolConfig<T>): ObjectPool<T> {
    const { create, reset, initialSize = 0, maxSize = 1024 } = config;
    const pool: T[] = [];
    let totalCreated = 0;
    let inUseCount = 0;

    /**
     *
     */
    function allocateOne(): T {
        totalCreated++;
        return create();
    }

    // Pre-fill pool
    for (let i = 0; i < initialSize; i++) {
        pool.push(allocateOne());
    }

    return {
        get(): T {
            if (pool.length > 0) {
                inUseCount++;
                return pool.pop()!;
            }
            if (totalCreated < maxSize) {
                inUseCount++;
                return allocateOne();
            }
            // Over maxSize — still create but don't track for pool return
            return create();
        },

        release(item: T): void {
            reset(item);
            if (pool.length + inUseCount <= maxSize) {
                pool.push(item);
            }
            inUseCount = Math.max(0, inUseCount - 1);
        },

        preallocate(count: number): void {
            for (let i = 0; i < count; i++) {
                if (totalCreated >= maxSize) break;
                pool.push(allocateOne());
            }
        },

        clear(): void {
            pool.length = 0;
            totalCreated = 0;
            inUseCount = 0;
        },

        getStats() {
            return {
                total: totalCreated,
                available: pool.length,
                inUse: inUseCount,
            };
        },
    };
}
