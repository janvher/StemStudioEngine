import initJoltWasmST from 'jolt-physics/wasm';
import initJoltWasmMT from 'jolt-physics/wasm-multithread';

/**
 * Jolt WASM module type returned by `jolt-physics`.
 */
export type JoltModule = Awaited<ReturnType<typeof initJoltWasmST>>;

const JOLT_GLOBAL_KEY = '__ERTH_JOLT_WASM_MODULE__';
let joltInitPromise: Promise<JoltModule> | null = null;

/**
 * Returns true when the browser supports SharedArrayBuffer (required for
 * the multi-threaded Jolt WASM build).  COOP/COEP headers must be set for
 * `SharedArrayBuffer` to be available.
 */
function supportsMultiThread(): boolean {
    try {
        return typeof SharedArrayBuffer !== 'undefined';
    } catch {
        return false;
    }
}

/**
 * Initializes the Jolt WASM runtime.
 *
 * Prefers the multi-threaded build when SharedArrayBuffer is available,
 * falling back to the single-threaded build otherwise.
 *
 * Memory: The upstream WASM binary has a fixed 128 MB limit.  Use the
 * custom build in `client/vendor/jolt-physics-build/` to get growable memory
 * (128 MB initial, 256 MB max).
 */
export const teardownJolt = (): void => {
    joltInitPromise = null;
    delete (globalThis as Record<string, unknown>)[JOLT_GLOBAL_KEY];
};

export const initJolt = async (): Promise<JoltModule> => {
    const globalObj = globalThis as Record<string, unknown>;
    if (globalObj[JOLT_GLOBAL_KEY]) {
        return globalObj[JOLT_GLOBAL_KEY] as JoltModule;
    }

    if (!joltInitPromise) {
        const useMT = supportsMultiThread();
        const initFn = useMT ? initJoltWasmMT : initJoltWasmST;
        if (!useMT) {
            console.warn('Jolt: SharedArrayBuffer not available, using single-threaded WASM build.');
        }
        joltInitPromise = (initFn)().then((module) => {
            globalObj[JOLT_GLOBAL_KEY] = module;
            return module;
        });
    }

    return joltInitPromise;
};
