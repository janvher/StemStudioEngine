import { Object3D } from 'three';

import { AssetInstanceManager } from '@stem/editor-oss/asset-management/AssetInstanceManager';
import { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';

/**
 * A class for managing prefab instances in a scene at runtime.
 *
 * @remarks
 * Delegates to AssetInstanceManager for template caching and cloning.
 * Kept for backward compatibility with existing behaviors.
 */
export class PrefabManager {
    constructor(private readonly instanceManager: AssetInstanceManager) {}

    dispose() {
        // AssetInstanceManager lifecycle is owned by Application.
    }

    /**
     * Create an instance of the specified prefab.
     *
     * @param prefabRef - The prefab reference
     * @returns A promise that resolves to the prefab instance.
     */
    async createPrefabInstance(prefabRef: AssetRef): Promise<Object3D> {
        return this.instanceManager.createPrefabInstance(prefabRef);
    }

    /**
     * Preload the specified prefab.
     *
     * @param prefabRef - The prefab reference
     * @returns A promise that resolves when the prefab is loaded.
     */
    async preloadPrefab(prefabRef: AssetRef): Promise<void> {
        return this.instanceManager.preloadPrefab(prefabRef);
    }

    /**
     * Unload the specified prefab from the cache.
     *
     * @param prefabRef - The prefab reference
     */
    unloadPrefab(prefabRef: AssetRef): void {
        this.instanceManager.unloadPrefab(prefabRef);
    }
}
