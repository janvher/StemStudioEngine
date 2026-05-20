import initPhysXWasm from 'physx-js-webidl';

/**
 * PhysX WASM module type returned by `physx-js-webidl`.
 */
export type PhysXModule = Awaited<ReturnType<typeof initPhysXWasm>>;

const PHYSX_GLOBAL_KEY = '__ERTH_PHYSX_WASM_MODULE__';
let physxInitPromise: Promise<PhysXModule> | null = null;

/**
 * Initializes the PhysX WASM runtime (single-threaded only).
 *
 * Memory: The upstream WASM binary uses 128 MB initial memory.
 * Use the custom build in `client/vendor/physx-build/` for growable memory
 * (128 MB initial, 256 MB max).
 */
export const teardownPhysX = (): void => {
    physxInitPromise = null;
    delete (globalThis as Record<string, unknown>)[PHYSX_GLOBAL_KEY];
};

export const initPhysX = async (): Promise<PhysXModule> => {
    const globalObj = globalThis as Record<string, unknown>;
    if (globalObj[PHYSX_GLOBAL_KEY]) {
        return globalObj[PHYSX_GLOBAL_KEY] as PhysXModule;
    }

    if (!physxInitPromise) {
        physxInitPromise = (initPhysXWasm as () => Promise<PhysXModule>)().then((module) => {
            globalObj[PHYSX_GLOBAL_KEY] = module;
            return module;
        });
    }

    return physxInitPromise;
};
