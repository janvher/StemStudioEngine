import { PHYSICS_EVENTS } from './common/events';
import { IDispatcher, IPhysics, PhysicsEngineType } from './common/types';
import { LegacyPhysicsAdapter } from './LegacyPhysicsAdapter';
import { DEFAULT_GRAVITY, PhysicsEngine } from './PhysicsEngine';

interface PhysicsEngineOptions {
    gravity?: number;
}

/**
 * A physics worker that has been spawned ahead of time and is already loading
 * its engine WASM. `PhysicsProxy` adopts the handle on first start so we don't
 * double-spawn or double-fetch.
 */
export interface PreloadedPhysicsWorker {
    worker: Worker;
    /** True once the worker has dispatched READY. */
    isReady: () => boolean;
    /** Invoke `cb` immediately if already ready, otherwise on the next READY. */
    onReady: (cb: () => void) => void;
}

interface WorkerCacheEntry {
    type: PhysicsEngineType;
    promise: Promise<PreloadedPhysicsWorker>;
}

export class PhysicsEngineFactory {
    private static activeEngineType: PhysicsEngineType | null = null;
    private static workerCache: WorkerCacheEntry | null = null;

    /**
     * Tears down the cached WASM module for a previously loaded engine,
     * allowing the garbage collector to reclaim its memory. Also terminates
     * any cached worker for the same engine so it doesn't leak.
     *
     * @param type which engine's caches to release
     */
    static async teardown(type: PhysicsEngineType): Promise<void> {
        if (PhysicsEngineFactory.workerCache?.type === type) {
            const cached = PhysicsEngineFactory.workerCache;
            PhysicsEngineFactory.workerCache = null;
            cached.promise
                .then((handle) => handle.worker.terminate())
                .catch(() => {});
        }
        switch (type) {
            case PhysicsEngineType.Ammo: {
                const { teardownAmmo } = await import('./ammo/ammo');
                teardownAmmo();
                break;
            }
            case PhysicsEngineType.Jolt: {
                const { teardownJolt } = await import('./jolt/jolt');
                teardownJolt();
                break;
            }
            case PhysicsEngineType.PhysX: {
                const { teardownPhysX } = await import('./physx/physx');
                teardownPhysX();
                break;
            }
            case PhysicsEngineType.Rapier: {
                const { teardownRapier } = await import('./rapier/rapier');
                teardownRapier();
                break;
            }
        }
    }

    /**
     * Spawn a physics worker, post `START`, and return a handle that resolves
     * once the worker emits `READY`. Internal helper used by both
     * `preloadWorker` (fire-and-forget) and `takeWorker` (awaitable).
     *
     * @param type which engine the worker should bring up
     * @param gravity gravity to feed the worker's `START` message
     * @returns a handle whose worker is wired up and is loading WASM
     */
    private static async spawnWorker(
        type: PhysicsEngineType,
        gravity: number,
    ): Promise<PreloadedPhysicsWorker> {
        const { default: PhysicsWorker } = await import('./worker/PhysicsWorker.ts?worker');
        const worker = new PhysicsWorker();

        let ready = false;
        const callbacks: Array<() => void> = [];
        const listener = (msg: MessageEvent<{ event?: string }>) => {
            if (msg.data?.event !== PHYSICS_EVENTS.READY) return;
            ready = true;
            worker.removeEventListener('message', listener);
            for (const cb of callbacks.splice(0)) cb();
        };
        worker.addEventListener('message', listener);

        worker.postMessage({
            event: PHYSICS_EVENTS.START,
            engineType: type,
            options: { gravity },
        });

        return {
            worker,
            isReady: () => ready,
            onReady: (cb) => {
                if (ready) cb();
                else callbacks.push(cb);
            },
        };
    }

    /**
     * Begin spawning a physics worker for the given engine in the background.
     * Idempotent: a second call for the same engine is a no-op; a call for a
     * different engine terminates the stale worker first.
     *
     * Fire-and-forget. Use `takeWorker` to actually consume the result.
     *
     * @param type which engine the worker should bring up
     * @param gravity gravity to feed the worker's `START` message
     */
    static preloadWorker(type: PhysicsEngineType, gravity: number): void {
        if (PhysicsEngineFactory.workerCache?.type === type) return;
        if (PhysicsEngineFactory.workerCache) {
            const stale = PhysicsEngineFactory.workerCache;
            PhysicsEngineFactory.workerCache = null;
            stale.promise.then((handle) => handle.worker.terminate()).catch(() => {});
        }
        const promise = PhysicsEngineFactory.spawnWorker(type, gravity).catch((err) => {
            console.warn('PhysicsEngineFactory.preloadWorker: spawn failed', err);
            throw err;
        });
        PhysicsEngineFactory.workerCache = { type, promise };
    }

    /**
     * Return the preloaded worker for the given engine, spawning one on demand
     * if no preload has happened. The cache slot is cleared so subsequent
     * callers get a fresh worker (e.g. play → stop → play).
     *
     * @param type which engine the worker should bring up
     * @param gravity gravity to feed the worker's `START` message (used only if
     *   a fresh spawn is required)
     * @returns a handle whose worker is wired up and is loading or has loaded WASM
     */
    static takeWorker(
        type: PhysicsEngineType,
        gravity: number,
    ): Promise<PreloadedPhysicsWorker> {
        PhysicsEngineFactory.preloadWorker(type, gravity);
        const promise = PhysicsEngineFactory.workerCache!.promise;
        PhysicsEngineFactory.workerCache = null;
        return promise;
    }

    /**
     * Start downloading/initializing the physics WASM binary without blocking.
     * The init functions cache their promises, so physics.create() will reuse them.
     * @param type - The physics engine type to preload
     */
    static async preload(type: PhysicsEngineType): Promise<void> {
        switch (type) {
            case PhysicsEngineType.Ammo: {
                const { initAmmo } = await import('./ammo/ammo');
                initAmmo().catch(() => {});
                break;
            }
            case PhysicsEngineType.Rapier: {
                const { initRapier } = await import('./rapier/rapier');
                initRapier().catch(() => {});
                break;
            }
            case PhysicsEngineType.Jolt: {
                const { initJolt } = await import('./jolt/jolt');
                initJolt().catch(() => {});
                break;
            }
            case PhysicsEngineType.PhysX: {
                const { initPhysX } = await import('./physx/physx');
                initPhysX().catch(() => {});
                break;
            }
        }
    }

    static async create(type: PhysicsEngineType, options?: PhysicsEngineOptions): Promise<PhysicsEngine> {
        // Teardown the previous engine's WASM cache when switching engines
        if (PhysicsEngineFactory.activeEngineType !== null && PhysicsEngineFactory.activeEngineType !== type) {
            await PhysicsEngineFactory.teardown(PhysicsEngineFactory.activeEngineType);
        }
        PhysicsEngineFactory.activeEngineType = type;

        switch (type) {
            case PhysicsEngineType.Ammo:
                return PhysicsEngineFactory.createAmmoPhysicsEngine(options);
            case PhysicsEngineType.Rapier:
                return PhysicsEngineFactory.createRapierPhysicsEngine(options);
            case PhysicsEngineType.Jolt:
                return PhysicsEngineFactory.createJoltPhysicsEngine(options);
            case PhysicsEngineType.PhysX:
                return PhysicsEngineFactory.createPhysXPhysicsEngine(options);
        }
    }

    static async createLegacyPhysicsAdapter(
        type: PhysicsEngineType,
        dispatcher: IDispatcher,
        options?: PhysicsEngineOptions,
    ): Promise<IPhysics> {
        const physicsEngine = await PhysicsEngineFactory.create(type, options);
        return new LegacyPhysicsAdapter(physicsEngine, dispatcher);
    }

    private static async createAmmoPhysicsEngine(options?: PhysicsEngineOptions): Promise<PhysicsEngine> {
        const { gravity = DEFAULT_GRAVITY } = options || {};
        const { initAmmo } = await import('./ammo/ammo');
        const { AmmoPhysicsEngine } = await import('./ammo/AmmoPhysicsEngine');
        const ammo = await initAmmo();
        return new AmmoPhysicsEngine(ammo, gravity);
    }

    private static async createRapierPhysicsEngine(options?: PhysicsEngineOptions): Promise<PhysicsEngine> {
        const { gravity = DEFAULT_GRAVITY } = options || {};
        const { initRapier } = await import('./rapier/rapier');
        const { RapierPhysicsEngine } = await import('./rapier/RapierPhysicsEngine');
        await initRapier();
        return new RapierPhysicsEngine(gravity);
    }

    private static async createJoltPhysicsEngine(options?: PhysicsEngineOptions): Promise<PhysicsEngine> {
        const { gravity = DEFAULT_GRAVITY } = options || {};
        const { initJolt } = await import('./jolt/jolt');
        const { JoltPhysicsEngine } = await import('./jolt/JoltPhysicsEngine');
        const jolt = await initJolt();
        return new JoltPhysicsEngine(jolt, gravity);
    }

    private static async createPhysXPhysicsEngine(options?: PhysicsEngineOptions): Promise<PhysicsEngine> {
        const { gravity = DEFAULT_GRAVITY } = options || {};
        const { initPhysX } = await import('./physx/physx');
        const { PhysXPhysicsEngine } = await import('./physx/PhysXPhysicsEngine');
        const physx = await initPhysX();
        return new PhysXPhysicsEngine(physx, gravity);
    }
}
