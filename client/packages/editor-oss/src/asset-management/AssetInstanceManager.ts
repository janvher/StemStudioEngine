import {Object3D} from 'three';

import {AssetLoader} from './AssetLoader';
import {AssetRef, assetRefKey} from './AssetRef';
import {loadModelWithLoader} from '../model/load-util';
import {loadPrefabWithLoader} from '../prefab/util';
import MeshUtils from '../utils/MeshUtils';
import {cloneObject} from '../utils/ObjectUtils';

type AssetKind = 'model' | 'prefab';

/**
 * Manages loading and optional template caching for models and prefabs (stems).
 *
 * By default, {@link createModelInstance} and {@link createPrefabInstance} load
 * the asset and return it directly without keeping a cached copy. This avoids
 * wasting memory on a template that is never reused.
 *
 * When multiple instances of the same asset are needed, call
 * {@link preloadModel} or {@link preloadPrefab} first. This caches a "template"
 * that subsequent {@link createModelInstance}/{@link createPrefabInstance} calls
 * will clone from, avoiding redundant network loads.
 *
 * Call {@link unloadModel}/{@link unloadPrefab} to dispose a cached template
 * when it is no longer needed.
 */
export class AssetInstanceManager {
    private templateCache = new Map<string, Object3D>();
    private pendingLoads = new Map<string, Promise<Object3D>>();

    constructor(private readonly assetLoader: AssetLoader) {}

    // -- Models --

    /**
     * Loads and caches a model template for efficient repeated cloning.
     * @param ref - The asset reference identifying the model to preload
     */
    async preloadModel(ref: AssetRef): Promise<void> {
        return this.preload('model', ref);
    }

    /**
     * Returns a model instance. Clones from a cached template if one exists
     * (via {@link preloadModel}), otherwise loads fresh without caching.
     * @param ref - The asset reference identifying the model
     * @returns A new Object3D instance of the model
     */
    async createModelInstance(ref: AssetRef): Promise<Object3D> {
        return this.createInstance('model', ref);
    }

    /**
     * Disposes a cached model template and frees its resources.
     * @param ref - The asset reference identifying the model to unload
     */
    unloadModel(ref: AssetRef): void {
        this.unload('model', ref);
    }

    // -- Prefabs (stems) --

    /**
     * Loads and caches a prefab template for efficient repeated cloning.
     * @param ref - The asset reference identifying the prefab to preload
     */
    async preloadPrefab(ref: AssetRef): Promise<void> {
        return this.preload('prefab', ref);
    }

    /**
     * Returns a prefab instance. Clones from a cached template if one exists
     * (via {@link preloadPrefab}), otherwise loads fresh without caching.
     * @param ref - The asset reference identifying the prefab
     * @returns A new Object3D instance of the prefab
     */
    async createPrefabInstance(ref: AssetRef): Promise<Object3D> {
        return this.createInstance('prefab', ref);
    }

    /**
     * Disposes a cached prefab template and frees its resources.
     * @param ref - The asset reference identifying the prefab to unload
     */
    unloadPrefab(ref: AssetRef): void {
        this.unload('prefab', ref);
    }

    // -- Lifecycle --

    /**
     * Disposes all cached templates and frees their resources.
     */
    dispose(): void {
        for (const template of this.templateCache.values()) {
            template.traverse((child) => MeshUtils.dispose(child));
        }
        this.templateCache.clear();
        this.pendingLoads.clear();
    }

    // -- Internal --

    /**
     * @param kind - The asset kind ('model' or 'prefab')
     * @param ref - The asset reference
     * @returns A unique cache key combining kind and asset ref
     */
    private cacheKey(kind: AssetKind, ref: AssetRef): string {
        return `${kind}:${assetRefKey(ref)}`;
    }

    /**
     * Loads the asset and caches it as a template for future cloning.
     * Deduplicates concurrent preload calls for the same asset.
     * @param kind - The asset kind ('model' or 'prefab')
     * @param ref - The asset reference identifying the asset to preload
     */
    private async preload(kind: AssetKind, ref: AssetRef): Promise<void> {
        const key = this.cacheKey(kind, ref);
        if (this.templateCache.has(key)) return;

        const pending = this.pendingLoads.get(key);
        if (pending) {
            await pending;
            return;
        }

        const promise = this.loadTemplate(kind, ref);
        this.pendingLoads.set(key, promise);
        try {
            const template = await promise;
            this.templateCache.set(key, template);
        } finally {
            this.pendingLoads.delete(key);
        }
    }

    /**
     * Returns an instance of the asset. If a template is cached (via preload),
     * clones from it. Otherwise, loads the asset fresh and returns it directly
     * without keeping a cached copy.
     * @param kind - The asset kind ('model' or 'prefab')
     * @param ref - The asset reference identifying the asset
     * @returns A new Object3D instance of the asset
     */
    private async createInstance(kind: AssetKind, ref: AssetRef): Promise<Object3D> {
        const key = this.cacheKey(kind, ref);

        // If a template is cached (from a prior preload), clone from it.
        const cached = this.templateCache.get(key);
        if (cached) {
            return cloneObject(cached);
        }

        // If a preload is in progress, wait for it to finish and clone.
        const pending = this.pendingLoads.get(key);
        if (pending) {
            await pending;
            return cloneObject(this.templateCache.get(key)!);
        }

        // No preload — load and return directly. No template is kept in memory.
        return this.loadTemplate(kind, ref);
    }

    /**
     * Disposes a cached template and removes it from the cache.
     * @param kind - The asset kind ('model' or 'prefab')
     * @param ref - The asset reference identifying the asset to unload
     */
    private unload(kind: AssetKind, ref: AssetRef): void {
        const key = this.cacheKey(kind, ref);
        const template = this.templateCache.get(key);
        if (template) {
            template.traverse((child) => MeshUtils.dispose(child));
            this.templateCache.delete(key);
        }
    }

    /**
     * Loads an asset from the network using the appropriate loader.
     * @param kind - The asset kind ('model' or 'prefab')
     * @param ref - The asset reference identifying the asset to load
     * @returns The loaded Object3D
     */
    private async loadTemplate(kind: AssetKind, ref: AssetRef): Promise<Object3D> {
        const context = {assetIdToRevisionId: {[ref.assetId]: ref.revisionId}};
        if (kind === 'model') {
            return loadModelWithLoader(ref.assetId, context, this.assetLoader);
        }
        return loadPrefabWithLoader(ref.assetId, context, this.assetLoader);
    }
}
