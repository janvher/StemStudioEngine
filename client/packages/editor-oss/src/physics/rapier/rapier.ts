let rapierInitPromise: Promise<void> | null = null;

export const teardownRapier = (): void => {
    rapierInitPromise = null;
};

export const initRapier = async () => {
    if (!rapierInitPromise) {
        rapierInitPromise = import("@dimforge/rapier3d-compat").then(async (mod) => {
            await mod.default.init();
        });
    }
    return rapierInitPromise;
};
