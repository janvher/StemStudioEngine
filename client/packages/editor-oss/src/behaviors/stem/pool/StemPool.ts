import type { ObjectPool, ObjectPoolConfig } from '@stem/editor-oss/utils/ObjectPool';

export type { ObjectPool, ObjectPoolConfig };

/**
 * Generic object pooling for reusable instances (e.g., projectiles, particles).
 */
export interface StemPool {
    /**
     * Create a new object pool with the given configuration.
     *
     * @param config - Pool configuration (create/reset/destroy callbacks, initial size, max size)
     * @returns A new ObjectPool instance for acquiring and releasing objects
     */
    create<T>(config: ObjectPoolConfig<T>): ObjectPool<T>;
}
