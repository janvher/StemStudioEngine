/**
 * Memory-safe visibility checker with bounded cache and efficient operations
 */
import { LRUCache } from 'lru-cache';
import * as THREE from 'three';

import { getVisibilityCacheConfig } from '../../../config/performance.config';
import { IdleWorkQueue } from '../../../lambdas/IdleWorkQueue';
import { IVisibilityChecker } from '../interfaces/IThrottleStrategy';

interface CacheEntry {
    isVisible: boolean;
    lastCheck: number;
    cameraMatrixVersion: number;
}

// Configuration constants
const DEFAULT_POOL_SIZE = 10;
const CLEANUP_INTERVAL_MS = 5000; // Clean every 5 seconds
const CACHE_CLEANUP_MULTIPLIER = 10; // Remove entries 10x older than expiry

export class VisibilityChecker implements IVisibilityChecker {
    private readonly cache: LRUCache<string, CacheEntry>;
    private readonly frustumPool: THREE.Frustum[] = [];
    private readonly matrixPool: THREE.Matrix4[] = [];
    private poolIndex = 0;

    // Cache management
    private readonly proactiveCleanupIntervalMs: number;
    private readonly enableProactiveCleanup: boolean;
    private readonly debugMode: boolean;
    private lastCleanupTime = 0;
    private proactiveCleanupInterval: number | null = null;



    // Idle work queue for deferred cleanup
    private idleQueue = new IdleWorkQueue();

    // Statistics
    private stats = {
        hits: 0,
        misses: 0,
        cleanups: 0,
        itemsRemoved: 0,
        lastCleanupTime: 0,
    };

    // Per-camera version tracking
    private cameraVersions: Map<string, { version: number, hash: number }> = new Map();

    // Cached frustum per camera version (avoids recomputing per cache miss)
    private _cachedFrustum: THREE.Frustum = new THREE.Frustum();
    private _cachedFrustumMatrix: THREE.Matrix4 = new THREE.Matrix4();
    private _cachedFrustumVersion: number = -1;

    constructor(poolSize: number = DEFAULT_POOL_SIZE) {
        const config = getVisibilityCacheConfig();

        this.proactiveCleanupIntervalMs = config.cleanupInterval;
        this.enableProactiveCleanup = config.enableProactiveCleanup;
        this.debugMode = config.debugMode;
        this.cache = new LRUCache<string, CacheEntry>({
            // Note: this pre-allocates memory for `max` entries
            max: config.maxSize,
            ttl: config.defaultTTL,
        });

        // Initialize object pools
        for (let i = 0; i < poolSize; i++) {
            this.frustumPool.push(new THREE.Frustum());
            this.matrixPool.push(new THREE.Matrix4());
        }

        // Start proactive cleanup if enabled
        if (this.enableProactiveCleanup) {
            this.startProactiveCleanup();
        }
    }

    isVisible(object: THREE.Object3D, camera: THREE.Camera): boolean {
        const objectId = object.uuid;

        // Update camera matrix version if camera actually moved
        const camVersion = this.updateCameraVersion(camera);

        // Check cache first — version-based invalidation (no performance.now() needed)
        const cached = this.cache.get(objectId);
        if (cached && cached.cameraMatrixVersion === camVersion) {
            this.stats.hits++;
            return cached.isVisible;
        }
        this.stats.misses++;

        // Ensure frustum is computed for this camera version
        this.ensureFrustum(camera, camVersion);

        // Perform visibility check using cached frustum
        const isVisible = this.performVisibilityCheckCached(object);

        this.cache.set(objectId, {
            isVisible,
            lastCheck: performance.now(),
            cameraMatrixVersion: camVersion,
        });

        // Periodic cleanup (deferred, only checked occasionally)
        if (this.stats.misses % 100 === 0) {
            this.performPeriodicCleanup(performance.now());
        }

        return isVisible;
    }

    clearCache(): void {
        this.cache.clear();
        this.cameraVersions.clear();
    }

    dispose(): void {
        this.stopProactiveCleanup();
        this.idleQueue.dispose();
        this.clearCache();
        // Object pools will be garbage collected
    }

    private updateCameraVersion(camera: THREE.Camera): number {
        // Check actual camera position — only increment version when camera moves
        const e = camera.matrixWorld.elements;
        const hash = Math.floor(e[12] * 100) + Math.floor(e[13] * 1000) * 97 + Math.floor(e[14] * 10000) * 31;

        let entry = this.cameraVersions.get(camera.uuid);
        if (!entry) {
            entry = { version: 0, hash };
            this.cameraVersions.set(camera.uuid, entry);
        } else if (entry.hash !== hash) {
            entry.version++;
            entry.hash = hash;
        }

        return entry.version;
    }

    /**
     * Compute frustum once per camera version, reuse for all objects in that frame
     * @param camera
     * @param version
     */
    private ensureFrustum(camera: THREE.Camera, version: number): void {
        if (version !== this._cachedFrustumVersion) {
            this._cachedFrustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            this._cachedFrustum.setFromProjectionMatrix(this._cachedFrustumMatrix);
            this._cachedFrustumVersion = version;
        }
    }

    /**
     * Fast visibility check using the pre-computed cached frustum
     * @param object
     */
    private performVisibilityCheckCached(object: THREE.Object3D): boolean {
        const mesh = object as THREE.Mesh;
        if (!mesh.geometry) return true;

        if (!mesh.geometry.boundingSphere) {
            try {
                mesh.geometry.computeBoundingSphere();
            } catch {
                return true;
            }
        }
        if (!mesh.geometry.boundingSphere) return true;

        try {
            return this._cachedFrustum.intersectsObject(mesh);
        } catch {
            return true;
        }
    }

    private performVisibilityCheck(object: THREE.Object3D, camera: THREE.Camera): boolean {
        // Get pooled objects with bounds checking
        const frustumIndex = this.poolIndex % this.frustumPool.length;
        const matrixIndex = this.poolIndex % this.matrixPool.length;
        this.poolIndex = (this.poolIndex + 1) % this.frustumPool.length; // Prevent overflow

        const frustum = this.frustumPool[frustumIndex];
        const matrix = this.matrixPool[matrixIndex];

        if (!frustum || !matrix) {
            console.warn('[VisibilityChecker] Object pool exhausted or corrupted');
            return true;
        }

        // Check if object has geometry for intersection test
        const mesh = object as THREE.Mesh;
        if (!mesh.geometry) {
            return true; // Non-mesh objects assumed visible
        }

        // Ensure bounding sphere exists
        if (!mesh.geometry.boundingSphere) {
            try {
                mesh.geometry.computeBoundingSphere();
            } catch (error) {
                console.warn('[VisibilityChecker] Failed to compute bounding sphere:', error);
                return true; // Fallback to visible
            }
        }

        if (!mesh.geometry.boundingSphere) {
            return true; // Fallback to visible
        }

        try {
            // Compute frustum from camera
            matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(matrix);

            // Test intersection
            return frustum.intersectsObject(mesh);
        } catch (error) {
            console.warn('[VisibilityChecker] Frustum calculation failed:', error);
            return true; // Fallback to visible on error
        }
    }

    private performPeriodicCleanup(now: number): void {
        // Defer cleanup to idle time so it doesn't block the hot isVisible() path
        if (!this.enableProactiveCleanup && now - this.lastCleanupTime >= CLEANUP_INTERVAL_MS) {
            this.lastCleanupTime = now;
            this.idleQueue.schedule(() => this.performCleanup());
        }
    }

    // Debugging/monitoring methods
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.cache.max,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: this.stats.hits > 0 ? this.stats.hits / (this.stats.hits + this.stats.misses) : 0,
            cleanups: this.stats.cleanups,
            itemsRemoved: this.stats.itemsRemoved,
            trackedCameras: this.cameraVersions.size,
        };
    }

    private startProactiveCleanup(): void {
        if (typeof window !== 'undefined' && window.setInterval) {
            this.proactiveCleanupInterval = window.setInterval(() => {
                this.performProactiveCleanup();
            }, this.proactiveCleanupIntervalMs);
        }
    }

    private stopProactiveCleanup(): void {
        if (this.proactiveCleanupInterval !== null && typeof window !== 'undefined') {
            window.clearInterval(this.proactiveCleanupInterval);
            this.proactiveCleanupInterval = null;
        }
    }

    private performProactiveCleanup(): void {
        this.performCleanup();
    }

    private performCleanup(): void {
        const startTime = performance.now();
        const now = performance.now();
        let removed = 0;
        const expiredKeys: string[] = [];

        // Find expired entries (using the same 10x multiplier for consistency)
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.lastCheck > this.cache.ttl * CACHE_CLEANUP_MULTIPLIER) {
                expiredKeys.push(key);
            }
        }

        // Remove expired entries
        for (const key of expiredKeys) {
            this.cache.delete(key);
            removed++;
        }

        // Update stats
        this.stats.cleanups++;
        this.stats.itemsRemoved += removed;
        this.stats.lastCleanupTime = performance.now() - startTime;

        // Log if entries were removed (debug mode)
        if (removed > 0 && this.debugMode) {
            console.debug(`[VisibilityChecker] Cleanup: removed ${removed} expired entries in ${this.stats.lastCleanupTime.toFixed(2)}ms`);
        }
    }
} 