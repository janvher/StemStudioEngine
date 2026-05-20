type AmmoFactory = typeof import("ammo").default;
export type AmmoModule = ReturnType<AmmoFactory>;

const AMMO_GLOBAL_KEY = "__erthAmmo__";

let ammoPromise: Promise<AmmoModule> | null = null;

export const getCachedAmmo = (): AmmoModule | undefined => {
    return (globalThis as Record<string, unknown>)[AMMO_GLOBAL_KEY] as AmmoModule | undefined;
};

/**
 * Initialize the Ammo.js physics engine.
 * 
 * @returns A promise that resolves to the Ammo.js physics engine.
 */
export const teardownAmmo = (): void => {
    ammoPromise = null;
    delete (globalThis as Record<string, unknown>)[AMMO_GLOBAL_KEY];
};

export const initAmmo = async (): Promise<AmmoModule> => {
    const cachedAmmo = getCachedAmmo();
    if (cachedAmmo) {
        return cachedAmmo;
    }

    if (!ammoPromise) {
        ammoPromise = (async () => {
            const module = (await import("ammo"));
            const ammo = await module.default({
                locateFile: (path: string) => `/assets/js/ammo/${path}`,
            });
            (globalThis as Record<string, unknown>)[AMMO_GLOBAL_KEY] = ammo;
            return ammo;
        })() as unknown as Promise<AmmoModule>;
    }

    return ammoPromise;
};
